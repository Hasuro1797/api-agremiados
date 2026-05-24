import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { Prisma } from 'generated/prisma/client';
import {
  BillingDocType,
  DocumentType,
  InvoiceStatus,
  SunatDocType,
  SunatStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { DocumentSeriesService } from 'src/settings/billing/document-series/document-series.service';
import { XmlBuilderService } from './xml-builder/xml-builder.service';
import { SignatureService } from './signature/signature.service';
import { SunatSenderService } from './sunat-sender/sunat-sender.service';
import type { InvoiceDto, CompanyDto } from './xml-builder/xml-builder.service';

// Máximo de reintentos automáticos ante errores transitorios.
const MAX_SUNAT_ATTEMPTS = 5;

// Catálogo 01 SUNAT: código numérico del tipo de comprobante.
const DOC_TYPE_CODE: Record<SunatDocType, string> = {
  [SunatDocType.FACTURA]: '01',
  [SunatDocType.BOLETA]: '03',
  [SunatDocType.NOTA_CREDITO]: '07',
  [SunatDocType.NOTA_DEBITO]: '08',
};

// Catálogo 06 SUNAT: tipo de documento de identidad del cliente.
const CLIENT_DOC_CODE: Record<DocumentType, string> = {
  [DocumentType.DNI]: '1',
  [DocumentType.CE]: '4',
  [DocumentType.RUC]: '6',
  [DocumentType.PASAPORTE]: '7',
  [DocumentType.OTROS]: '0',
};

@Injectable()
export class SunatEmissionService {
  private readonly logger = new Logger(SunatEmissionService.name);
  private readonly cdrParser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlBuilder: XmlBuilderService,
    private readonly signature: SignatureService,
    private readonly sender: SunatSenderService,
    private readonly documentSeries: DocumentSeriesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Emite un comprobante PAGADO a SUNAT: reserva serie/correlativo, construye y
   * firma el XML, lo envía, procesa el CDR y archiva XML+CDR. Idempotente: si ya
   * fue aceptado no hace nada; reintenta los estados ERROR/PENDING.
   */
  async emitInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id: invoiceId },
      include: { details: true },
    });
    if (!invoice)
      throw new NotFoundException(`Comprobante ${invoiceId} no existe`);

    // Solo se emite lo pagado; estados SUNAT finales no se reprocesan.
    if (invoice.status !== InvoiceStatus.PAGADO) {
      this.logger.warn(`Invoice ${invoiceId} no está PAGADO; se omite emisión`);
      return;
    }
    const finalSunat: SunatStatus[] = [
      SunatStatus.ACCEPTED,
      SunatStatus.OBSERVED,
      SunatStatus.VOIDED,
    ];
    if (finalSunat.includes(invoice.sunatStatus)) return;

    if (!invoice.sunatDocType) {
      await this.markError(invoiceId, 'Comprobante sin tipo SUNAT asignado');
      return;
    }

    const config = await this.prisma.billingConfig.findFirst();
    if (!config || !config.isActive) {
      await this.markError(
        invoiceId,
        'Facturación electrónica no configurada/activa',
      );
      return;
    }
    if (!config.certPfxBase64 || !config.certPassword) {
      await this.markError(invoiceId, 'Falta el certificado digital (PFX)');
      return;
    }

    await this.prisma.invoiceHeader.update({
      where: { id: invoiceId },
      data: { sunatStatus: SunatStatus.PROCESSING },
    });

    try {
      // 1. Serie + correlativo (reusar si ya se asignó en un intento previo).
      const { serie, sequential, seriesConfigId } = await this.ensureSeries(
        invoice.id,
        config.id,
        invoice.sunatDocType,
        invoice.series,
        invoice.sequential,
        invoice.seriesConfigId,
      );

      // 2. Construir el DTO y el XML.
      const invoiceDto = this.buildInvoiceDto(invoice, serie, sequential);
      const company: CompanyDto = {
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        comercialName: config.comercialName ?? undefined,
        ubigeo: config.ubigeo ?? undefined,
        address: config.address ?? undefined,
      };
      const xml = this.xmlBuilder.buildInvoiceXml(invoiceDto, company);

      // 3. Firmar.
      const pfxBuffer = Buffer.from(config.certPfxBase64, 'base64');
      const { signedXml } = this.signature.signXml(
        xml,
        pfxBuffer,
        config.certPassword,
      );

      // 4. Empaquetar ZIP: <RUC>-<tipo>-<serie>-<correlativo>.xml
      const docCode = DOC_TYPE_CODE[invoice.sunatDocType];
      const baseName = `${config.ruc}-${docCode}-${serie}-${sequential}`;
      const zip = new AdmZip();
      zip.addFile(`${baseName}.xml`, Buffer.from(signedXml, 'utf8'));
      const zipBuffer = zip.toBuffer();

      // 5. Enviar a SUNAT (endpoint según entorno).
      const endpoint = this.sender.resolveEndpoint(config.production);
      const result = await this.sender.sendBill(
        { ruc: config.ruc, solUser: config.solUser, solPass: config.solPass },
        `${baseName}.zip`,
        zipBuffer,
        endpoint,
      );

      // 6. Archivar el XML firmado siempre (haya o no CDR).
      await this.storeDocument(
        invoice.id,
        BillingDocType.XML_SIGNED,
        Buffer.from(signedXml, 'utf8'),
        `${baseName}.xml`,
        'xml',
      );

      if (!result.success) {
        // Error de envío / SOAP Fault → reintentable por cron.
        await this.markError(
          invoice.id,
          result.error ?? 'Error desconocido enviando a SUNAT',
          result.sunatCode,
        );
        return;
      }

      // 7. Procesar CDR.
      const cdr = this.parseCdr(result.cdrZip!);
      await this.storeDocument(
        invoice.id,
        BillingDocType.CDR_ZIP,
        result.cdrZip!,
        `R-${baseName}.zip`,
        'zip',
      );

      const sunatStatus = this.mapCdrToStatus(cdr.responseCode);
      await this.prisma.invoiceHeader.update({
        where: { id: invoice.id },
        data: {
          sunatStatus,
          sunatResponseCode: cdr.responseCode,
          sunatDescription: cdr.description,
          sunatSentAt: new Date(),
          sunatEmissionDate: invoice.sunatEmissionDate ?? new Date(),
          sunatAttempts: { increment: 1 },
          ...(sunatStatus === SunatStatus.ACCEPTED ||
          sunatStatus === SunatStatus.OBSERVED
            ? { status: InvoiceStatus.FACTURADO }
            : {}),
        },
      });

      this.logger.log(
        `SUNAT ${sunatStatus} para ${baseName} (code ${cdr.responseCode})`,
      );
    } catch (err: any) {
      await this.markError(
        invoiceId,
        err?.message ?? 'Error interno de emisión',
      );
      throw err;
    }
  }

  /** Reserva serie/correlativo si aún no se asignó; reusa en reintentos. */
  private async ensureSeries(
    invoiceId: string,
    billingConfigId: number,
    tipoDoc: SunatDocType,
    existingSerie: string | null,
    existingSeq: string | null,
    existingConfigId: number | null,
  ): Promise<{ serie: string; sequential: string; seriesConfigId: number }> {
    if (existingSerie && existingSeq && existingConfigId) {
      return {
        serie: existingSerie,
        sequential: existingSeq,
        seriesConfigId: existingConfigId,
      };
    }

    const seriesRow = await this.prisma.documentSeries.findFirst({
      where: { billingConfigId, tipoDoc, isActive: true },
      orderBy: { serie: 'asc' },
    });
    if (!seriesRow) {
      throw new Error(`No hay serie activa para ${tipoDoc}`);
    }

    const reserved = await this.prisma.$transaction((tx) =>
      this.documentSeries.reserveCorrelativo(tx, seriesRow.id),
    );
    const sequential = String(reserved.correlativo).padStart(8, '0');

    // Persistir de inmediato para que los reintentos reusen el mismo número.
    await this.prisma.invoiceHeader.update({
      where: { id: invoiceId },
      data: {
        series: reserved.serie,
        sequential,
        seriesConfigId: seriesRow.id,
      },
    });

    return { serie: reserved.serie, sequential, seriesConfigId: seriesRow.id };
  }

  private buildInvoiceDto(
    invoice: Prisma.InvoiceHeaderGetPayload<{ include: { details: true } }>,
    serie: string,
    sequential: string,
  ): InvoiceDto {
    const fechaEmision = new Date().toISOString().slice(0, 10);
    const docType = invoice.sunatDocType!;
    return {
      tipoDoc: DOC_TYPE_CODE[docType],
      serie,
      correlativo: sequential,
      fechaEmision,
      moneda: invoice.currency,
      clienteTipoDoc: CLIENT_DOC_CODE[invoice.documentType] ?? '0',
      clienteNumDoc: invoice.documentNumber ?? '00000000',
      clienteRazon: invoice.clientName ?? 'CLIENTES VARIOS',
      items: invoice.details.map((d) => ({
        descripcion: d.description,
        cantidad: d.quantity,
        valorUnitario: d.unitPriceWithoutIgv ?? d.price,
        tipoAfectacionIgv: d.taxAffectation ?? '10',
        unitCode: d.unitOfMeasure,
      })),
    };
  }

  /** Sube un archivo de facturación a Cloudinary y registra el BillingDocument. */
  private async storeDocument(
    invoiceId: string,
    type: BillingDocType,
    buffer: Buffer,
    fileName: string,
    format: string,
  ) {
    const uploaded = await this.cloudinary.upload(Readable.from(buffer), {
      resource_type: 'raw',
      folder: 'billing',
      public_id: fileName.replace(/\.[^.]+$/, ''),
      overwrite: true,
    });

    await this.prisma.billingDocument.upsert({
      where: { invoiceId_type: { invoiceId, type } },
      create: {
        invoiceId,
        type,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        resourceType: 'raw',
        format,
        bytes: uploaded.bytes,
        originalName: fileName,
      },
      update: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        bytes: uploaded.bytes,
        originalName: fileName,
      },
    });
  }

  /** Extrae ResponseCode y Description del CDR (R-*.xml dentro del ZIP). */
  private parseCdr(cdrZip: Buffer): {
    responseCode: string;
    description: string;
  } {
    try {
      const zip = new AdmZip(cdrZip);
      const entry = zip.getEntries().find((e) => e.entryName.endsWith('.xml'));
      if (!entry) return { responseCode: '', description: 'CDR sin XML' };
      const xml = entry.getData().toString('utf8');
      const parsed: any = this.cdrParser.parse(xml);
      const response =
        parsed?.ApplicationResponse?.DocumentResponse?.Response ?? {};
      return {
        responseCode: (response.ResponseCode ?? '').toString(),
        description: (response.Description ?? '').toString(),
      };
    } catch (err: any) {
      this.logger.error('Error parseando CDR', err);
      return { responseCode: '', description: 'No se pudo leer el CDR' };
    }
  }

  private mapCdrToStatus(responseCode: string): SunatStatus {
    const code = parseInt(responseCode, 10);
    if (responseCode === '0' || code === 0) return SunatStatus.ACCEPTED;
    if (code >= 4000) return SunatStatus.OBSERVED; // aceptada con observaciones
    return SunatStatus.REJECTED; // 100-3999: rechazada
  }

  private async markError(invoiceId: string, message: string, code?: string) {
    this.logger.error(`Emisión SUNAT ${invoiceId}: ${message}`);
    await this.prisma.invoiceHeader.update({
      where: { id: invoiceId },
      data: {
        sunatStatus: SunatStatus.ERROR,
        sunatDescription: message,
        ...(code ? { sunatResponseCode: code } : {}),
        sunatAttempts: { increment: 1 },
      },
    });
  }

  /** Cron: reintenta comprobantes en ERROR/PENDING que no superaron el máximo. */
  async retryFailed(): Promise<number> {
    const pending = await this.prisma.invoiceHeader.findMany({
      where: {
        status: InvoiceStatus.PAGADO,
        sunatStatus: { in: [SunatStatus.ERROR, SunatStatus.PENDING] },
        sunatAttempts: { lt: MAX_SUNAT_ATTEMPTS },
      },
      select: { id: true },
      take: 50,
    });

    for (const inv of pending) {
      try {
        await this.emitInvoice(inv.id);
      } catch {
        // markError ya registró el detalle; continuar con el siguiente.
      }
    }
    return pending.length;
  }
}
