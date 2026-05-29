import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BillingDocType, SunatDocType } from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { MailService } from './mail.service';

const DOC_TYPE_LABEL: Record<string, string> = {
  [SunatDocType.FACTURA]: 'Factura',
  [SunatDocType.BOLETA]: 'Boleta',
  [SunatDocType.NOTA_CREDITO]: 'Nota de Crédito',
  [SunatDocType.NOTA_DEBITO]: 'Nota de Débito',
};

/**
 * Servicio especializado en correos transaccionales del flujo de facturación
 * (pago aceptado, NC emitida, inscripción gratuita).
 *
 * Convención: nunca lanza. Si falla la entrega, queda en el log; la operación
 * de negocio (pago/NC/inscripción) ya está confirmada y no se revierte por un
 * correo fallido.
 */
@Injectable()
export class BillingMailService {
  private readonly logger = new Logger(BillingMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Pago aceptado: envía el comprobante (boleta/factura) en PDF al cliente.
   * Si se pasa `pdfOverride`, se usa ese buffer en vez de descargar de Cloudinary
   * (útil cuando recién se acaba de generar y aún no se propagó la URL).
   */
  async sendPaymentSuccess(invoiceId: string, pdfOverride?: Buffer) {
    try {
      const invoice = await this.prisma.invoiceHeader.findUnique({
        where: { id: invoiceId },
        include: {
          user: true,
          billingDocuments: true,
          details: true,
          transaction: true,
        },
      });
      if (!invoice) return;

      const email = invoice.user?.email;
      if (!email) {
        this.logger.warn(
          `Sin email para invoice ${invoiceId}; no se envió correo de pago.`,
        );
        return;
      }

      const org = await this.organization();
      const pdfBuffer =
        pdfOverride ?? (await this.fetchPdfBuffer(invoice.billingDocuments));
      const docLabel =
        DOC_TYPE_LABEL[invoice.sunatDocType ?? ''] ?? 'Comprobante';
      const concept = invoice.details?.[0]?.description ?? 'Pago';

      await this.mail.sendMail({
        to: [email],
        subject: `${docLabel} ${invoice.series ?? ''}-${invoice.sequential ?? ''} — ${org?.name ?? 'Pago confirmado'}`,
        template: 'payment-success',
        context: {
          clientName: invoice.clientName ?? invoice.user?.name ?? 'Estimado(a)',
          docTypeLabel: docLabel,
          series: invoice.series ?? '',
          sequential: invoice.sequential ?? '',
          concept,
          currency: invoice.currency,
          amount: this.computeTotal(invoice).toFixed(2),
          issueDate: this.formatDate(invoice.issueDate),
          orderNumber: invoice.orderNumber,
          ...this.brandingContext(org),
        },
        attachments: pdfBuffer
          ? [
              {
                filename: `${invoice.series ?? 'COMP'}-${invoice.sequential ?? ''}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      });
    } catch (err) {
      this.logger.error(`sendPaymentSuccess(${invoiceId}) falló`, err as Error);
    }
  }

  /** Nota de Crédito emitida: envía la NC en PDF al cliente. */
  async sendCreditNote(creditNoteId: string, pdfOverride?: Buffer) {
    try {
      const nc = await this.prisma.invoiceHeader.findUnique({
        where: { id: creditNoteId },
        include: {
          user: true,
          billingDocuments: true,
          details: true,
          referenceInvoice: true,
        },
      });
      if (!nc) return;

      const email = nc.user?.email;
      if (!email) {
        this.logger.warn(
          `Sin email para NC ${creditNoteId}; no se envió correo.`,
        );
        return;
      }

      const [org, downloadedPdf, refundMessage] = await Promise.all([
        this.organization(),
        pdfOverride
          ? Promise.resolve(pdfOverride)
          : this.fetchPdfBuffer(nc.billingDocuments),
        this.refundMessageFromCancellations(creditNoteId),
      ]);
      const pdfBuffer = downloadedPdf;
      const referenceLabel = nc.referenceInvoice
        ? `${nc.referenceInvoice.series ?? ''}-${nc.referenceInvoice.sequential ?? ''}`
        : '';

      await this.mail.sendMail({
        to: [email],
        subject: `Nota de Crédito ${nc.series ?? ''}-${nc.sequential ?? ''} — ${org?.name ?? ''}`,
        template: 'credit-note',
        context: {
          clientName: nc.clientName ?? nc.user?.name ?? 'Estimado(a)',
          series: nc.series ?? '',
          sequential: nc.sequential ?? '',
          referenceLabel,
          reasonDescription: nc.creditDebitReasonDescription ?? 'Anulación',
          currency: nc.currency,
          amount: this.computeTotal(nc).toFixed(2),
          issueDate: this.formatDate(nc.issueDate),
          refundMessage,
          ...this.brandingContext(org),
        },
        attachments: pdfBuffer
          ? [
              {
                filename: `${nc.series ?? 'NC'}-${nc.sequential ?? ''}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      });
    } catch (err) {
      this.logger.error(`sendCreditNote(${creditNoteId}) falló`, err as Error);
    }
  }

  /** Inscripción gratuita confirmada: correo simple sin PDF. */
  async sendFreeEnrollment(userId: string, activityId: number) {
    try {
      const [user, activity, org] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.activity.findUnique({ where: { id: activityId } }),
        this.organization(),
      ]);
      if (!user?.email || !activity) return;

      await this.mail.sendMail({
        to: [user.email],
        subject: `Inscripción confirmada: ${activity.title}`,
        template: 'free-enrollment',
        context: {
          clientName: user.name ?? 'Estimado(a)',
          activityName: activity.title,
          activityDate: activity.date
            ? this.formatDateTime(activity.date)
            : null,
          activityLocation: activity.venue ?? activity.address ?? null,
          ...this.brandingContext(org),
        },
      });
    } catch (err) {
      this.logger.error(
        `sendFreeEnrollment(user=${userId}, activity=${activityId}) falló`,
        err as Error,
      );
    }
  }

  // ===== helpers =====

  private async organization() {
    return this.prisma.organization.findFirst();
  }

  private brandingContext(
    org: Awaited<ReturnType<BillingMailService['organization']>>,
  ) {
    return {
      organizationName: org?.name ?? '',
      organizationEmail: org?.email ?? '',
      organizationPhone: org?.phone ?? '',
      logoUrl: org?.logo ?? '',
      primaryColor: org?.primaryColor ?? '#232c57',
    };
  }

  private async fetchPdfBuffer(
    docs: { type: BillingDocType; url: string }[],
  ): Promise<Buffer | null> {
    const pdfDoc = docs.find((d) => d.type === BillingDocType.PDF);
    if (!pdfDoc) return null;
    try {
      const res = await axios.get<ArrayBuffer>(pdfDoc.url, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      return Buffer.from(res.data);
    } catch (err) {
      this.logger.warn(
        `No se pudo descargar el PDF ${pdfDoc.url}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private computeTotal(invoice: {
    totalTaxable: number | null;
    totalExempt: number | null;
    totalUnaffected: number | null;
    totalIgv: number | null;
    totalIsc: number | null;
    totalOtherCharges: number | null;
  }): number {
    return (
      (invoice.totalTaxable ?? 0) +
      (invoice.totalExempt ?? 0) +
      (invoice.totalUnaffected ?? 0) +
      (invoice.totalIgv ?? 0) +
      (invoice.totalIsc ?? 0) +
      (invoice.totalOtherCharges ?? 0)
    );
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'long',
    }).format(date);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
  }

  /** Mensaje sobre el reembolso (APPLIED → confirmado; FAILED → pendiente manual). */
  private async refundMessageFromCancellations(
    creditNoteId: string,
  ): Promise<string | undefined> {
    const cancellation = await this.prisma.paymentCancellation.findFirst({
      where: { creditNoteId },
      orderBy: { createdAt: 'desc' },
    });
    if (!cancellation) return undefined;
    if (cancellation.status === 'APPLIED') {
      return 'El reembolso a tu medio de pago ya fue procesado por Izipay.';
    }
    return 'El reembolso será procesado manualmente por nuestro equipo de finanzas en los próximos días hábiles.';
  }
}
