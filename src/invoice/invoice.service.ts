import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  Currency,
  DocumentType,
  InvoiceStatus,
  SaleCondition,
  SunatDocType,
} from 'generated/prisma/enums';
import { PrismaService, PrismaTx } from 'src/db/prisma.service';
import {
  calcDocTotals,
  calcLineAmounts,
  isExoneradoOneroso,
  isGratuito,
  isGravadoOneroso,
  isInafectoOneroso,
} from 'lib/tax-calculation';
import { InvoiceFilterArgs } from './dto/invoice-filter.args';
import { MyPaymentsArgs } from './dto/my-payments.args';
import { CreateInvoiceData } from './invoice.types';

const INVOICE_INCLUDE = {
  details: true,
  transaction: {
    include: { cancellations: { orderBy: { createdAt: 'desc' } } },
  },
  billingDocuments: true,
} satisfies Prisma.InvoiceHeaderInclude;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /** RUC → FACTURA; cualquier otro documento → BOLETA. */
  resolveDocType(documentType: DocumentType): SunatDocType {
    return documentType === DocumentType.RUC
      ? SunatDocType.FACTURA
      : SunatDocType.BOLETA;
  }

  /** Genera un orderNumber único y compacto (5-15 caracteres). ORD202300000001 */
  generateOrderNumber(): string {
    const ts = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 1_000_000)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0');
    return `ORD${ts}${rand}`;
  }

  /**
   * Crea un comprobante interno (InvoiceHeader + InvoiceDetail[]) con totales
   * tributarios calculados. Estado inicial PENDIENTE / sunat NOT_APPLICABLE.
   * La reserva de serie/correlativo y el envío a SUNAT ocurren en fases posteriores.
   *
   * Puede ejecutarse dentro de una transacción existente (flujo de pago).
   */
  async createInvoice(data: CreateInvoiceData, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    const documentType = data.documentType ?? DocumentType.DNI;

    const linesWithDefaults = data.lines.map((l) => ({
      ...l,
      tipoAfectacionIgv: l.tipoAfectacionIgv ?? '10',
      unitOfMeasure: l.unitOfMeasure ?? 'NIU',
      discount: l.discount ?? 0,
    }));

    const totals = this.computeTotals(linesWithDefaults);

    const detailsData: Prisma.InvoiceDetailCreateWithoutInvoiceInput[] =
      linesWithDefaults.map((l) => {
        const calc = calcLineAmounts({
          cantidad: l.quantity,
          valorUnitario: l.valorUnitario,
          tipoAfectacionIgv: l.tipoAfectacionIgv,
        });
        return {
          description: l.description,
          price: round2(parseFloat(calc.price)),
          unitOfMeasure: l.unitOfMeasure,
          discount: l.discount,
          quantity: l.quantity,
          itemType: l.itemType,
          itemId: l.itemId ?? null,
          taxAffectation: l.tipoAfectacionIgv,
          igv: round2(parseFloat(calc.taxAmount)),
          unitPriceWithoutIgv: l.valorUnitario,
        };
      });

    return client.invoiceHeader.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        clientName: data.clientName ?? null,
        documentType,
        documentNumber: data.documentNumber ?? null,
        billingAddress: data.billingAddress ?? null,
        saleCondition: data.saleCondition ?? SaleCondition.CONTADO,
        currency: data.currency ?? Currency.PEN,
        exchangeRate: data.exchangeRate ?? null,
        observations: data.observations ?? null,
        sunatDocType: this.resolveDocType(documentType),
        totalTaxable: totals.totalTaxable,
        totalExempt: totals.totalExempt,
        totalUnaffected: totals.totalUnaffected,
        totalFree: totals.totalFree,
        totalIgv: totals.totalIgv,
        userId: data.userId ?? null,
        metadata: data.metadata,
        details: { create: detailsData },
      },
      include: INVOICE_INCLUDE,
    });
  }

  /** Calcula los totales tributarios del documento a partir de las líneas. */
  private computeTotals(
    lines: Array<{
      quantity: number;
      valorUnitario: number;
      tipoAfectacionIgv: string;
    }>,
  ) {
    let totalTaxable = 0;
    let totalExempt = 0;
    let totalUnaffected = 0;
    let totalFree = 0;

    for (const l of lines) {
      const base = round2(l.quantity * l.valorUnitario);
      const code = l.tipoAfectacionIgv;
      if (isGravadoOneroso(code)) totalTaxable += base;
      else if (isExoneradoOneroso(code)) totalExempt += base;
      else if (isInafectoOneroso(code)) totalUnaffected += base;
      else if (isGratuito(code)) totalFree += base;
    }

    const docTotals = calcDocTotals(
      lines.map((l) => ({
        cantidad: l.quantity,
        valorUnitario: l.valorUnitario,
        tipoAfectacionIgv: l.tipoAfectacionIgv,
      })),
    );

    return {
      totalTaxable: round2(totalTaxable),
      totalExempt: round2(totalExempt),
      totalUnaffected: round2(totalUnaffected),
      totalFree: round2(totalFree),
      totalIgv: docTotals.totalIgv,
    };
  }

  /** Suma de bases + IGV + otros cargos = importe total a pagar. */
  private computeTotalField(invoice: {
    totalTaxable: number | null;
    totalExempt: number | null;
    totalUnaffected: number | null;
    totalIgv: number | null;
    totalIsc: number | null;
    totalOtherCharges: number | null;
  }): number {
    return round2(
      (invoice.totalTaxable ?? 0) +
        (invoice.totalExempt ?? 0) +
        (invoice.totalUnaffected ?? 0) +
        (invoice.totalIgv ?? 0) +
        (invoice.totalIsc ?? 0) +
        (invoice.totalOtherCharges ?? 0),
    );
  }

  private toEntity<
    T extends Parameters<InvoiceService['computeTotalField']>[0],
  >(invoice: T) {
    return { ...invoice, total: this.computeTotalField(invoice) };
  }

  async findInvoices(filters: InvoiceFilterArgs) {
    const { page, pageSize } = filters;

    const where: Prisma.InvoiceHeaderWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.sunatStatus && { sunatStatus: filters.sunatStatus }),
      ...(filters.sunatDocType && { sunatDocType: filters.sunatDocType }),
      ...(filters.userId && { userId: filters.userId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
      ...(filters.search && {
        OR: [
          { orderNumber: { contains: filters.search, mode: 'insensitive' } },
          { documentNumber: { contains: filters.search, mode: 'insensitive' } },
          { clientName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoiceHeader.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoiceHeader.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toEntity(r)),
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Historial de pagos del miembro autenticado. El userId se fuerza desde el
   * token (un miembro no puede consultar comprobantes de otro). Excluye las
   * reservas que nunca llegaron a pagarse (PENDIENTE/EXPIRADO) para no mostrar
   * "pagos" que en realidad no ocurrieron.
   */
  async findMyInvoices(userId: string, filters: MyPaymentsArgs) {
    const { page, pageSize } = filters;

    const where: Prisma.InvoiceHeaderWhereInput = {
      userId,
      ...(filters.status
        ? { status: filters.status }
        : {
            status: {
              notIn: [InvoiceStatus.PENDIENTE, InvoiceStatus.EXPIRADO],
            },
          }),
      ...(filters.itemType && {
        details: { some: { itemType: filters.itemType } },
      }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoiceHeader.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoiceHeader.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toEntity(r)),
      meta: { total, page, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) {
      throw new NotFoundException(`Comprobante ${id} no encontrado.`);
    }
    return this.toEntity(invoice);
  }

  async findByOrderNumber(orderNumber: string) {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { orderNumber },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) {
      throw new NotFoundException(
        `Comprobante con orden ${orderNumber} no encontrado.`,
      );
    }
    return this.toEntity(invoice);
  }
}
