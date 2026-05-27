import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  AttendanceStatus,
  AttendeeType,
  CancellationStatus,
  InvoiceItemType,
  InvoiceStatus,
  PaymentStatus,
  SunatDocType,
  SunatStatus,
} from 'generated/prisma/enums';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { PrismaService, PrismaTx } from 'src/db/prisma.service';
import { IzipayCancellationService } from 'src/izipay/izipay-cancellation.service';
import { SunatEmissionService } from 'src/sunat/sunat-emission.service';
import { InvoiceService } from './invoice.service';

const ACCEPTED_SUNAT: SunatStatus[] = [
  SunatStatus.ACCEPTED,
  SunatStatus.OBSERVED,
];

@Injectable()
export class CreditNoteService {
  private readonly logger = new Logger(CreditNoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly sunatEmission: SunatEmissionService,
    private readonly auditLog: AuditLogService,
    private readonly izipayCancellation: IzipayCancellationService,
  ) {}

  /**
   * Anulación INTERNA: para comprobantes que aún NO fueron aceptados por SUNAT.
   * Marca el comprobante como anulado y revierte stock/cuota. No emite NC.
   */
  async voidInvoice(invoiceId: string, reason: string, userId: string) {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id: invoiceId },
      include: { details: true },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');

    if (ACCEPTED_SUNAT.includes(invoice.sunatStatus)) {
      throw new BadRequestException(
        'El comprobante ya fue aceptado por SUNAT; emite una Nota de Crédito.',
      );
    }
    if (
      invoice.status === InvoiceStatus.CANCELADO ||
      invoice.voidedAt !== null
    ) {
      throw new BadRequestException('El comprobante ya está anulado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceHeader.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELADO,
          sunatStatus: SunatStatus.VOIDED,
          voidedAt: new Date(),
          voidedBy: userId,
          voidReason: reason,
        },
      });
      await this.reverseTargets(tx, invoice.details);
    });

    await this.auditLog.log({
      userId,
      action: 'UPDATE',
      entity: 'invoice',
      entityId: invoiceId,
      details: { action: 'VOID', reason } as unknown as Prisma.InputJsonValue,
    });

    // Reembolso Izipay (anulación si es mismo día; devolución si ya liquidó).
    // No bloquea la anulación interna: si falla, queda registrado como FAILED.
    await this.refundMoney(invoice.orderNumber, reason, userId);

    return this.invoiceService.findOne(invoiceId);
  }

  /**
   * Emite una NOTA DE CRÉDITO para un comprobante ya aceptado por SUNAT
   * (anulación/devolución). Crea el comprobante NC, revierte stock/cuota y
   * dispara la emisión a SUNAT.
   */
  async createCreditNote(
    invoiceId: string,
    reasonCode: string,
    reasonDescription: string,
    userId: string,
  ) {
    const original = await this.prisma.invoiceHeader.findUnique({
      where: { id: invoiceId },
      include: { details: true },
    });
    if (!original) throw new NotFoundException('Comprobante no encontrado');

    if (!ACCEPTED_SUNAT.includes(original.sunatStatus)) {
      throw new BadRequestException(
        'Solo se puede emitir una Nota de Crédito de un comprobante aceptado por SUNAT. Usa anulación interna.',
      );
    }
    if (
      original.sunatDocType !== SunatDocType.FACTURA &&
      original.sunatDocType !== SunatDocType.BOLETA
    ) {
      throw new BadRequestException(
        'Solo se emiten notas de crédito sobre facturas o boletas',
      );
    }

    // Evitar NC duplicada vigente para el mismo comprobante.
    const existingNC = await this.prisma.invoiceHeader.findFirst({
      where: {
        referenceInvoiceId: invoiceId,
        sunatDocType: SunatDocType.NOTA_CREDITO,
        sunatStatus: { not: SunatStatus.ERROR },
      },
    });
    if (existingNC) {
      throw new BadRequestException(
        'Ya existe una nota de crédito para este comprobante',
      );
    }

    const ncId = await this.prisma.$transaction(async (tx) => {
      const nc = await tx.invoiceHeader.create({
        data: {
          orderNumber: this.invoiceService.generateOrderNumber(),
          status: InvoiceStatus.PAGADO, // listo para emitir
          sunatStatus: SunatStatus.PENDING, // descubrible por el cron de reintentos
          clientName: original.clientName,
          documentType: original.documentType,
          documentNumber: original.documentNumber,
          billingAddress: original.billingAddress,
          saleCondition: original.saleCondition,
          currency: original.currency,
          exchangeRate: original.exchangeRate,
          sunatDocType: SunatDocType.NOTA_CREDITO,
          referenceInvoiceId: original.id,
          creditDebitReasonCode: reasonCode,
          creditDebitReasonDescription: reasonDescription,
          totalTaxable: original.totalTaxable,
          totalExempt: original.totalExempt,
          totalUnaffected: original.totalUnaffected,
          totalFree: original.totalFree,
          totalIgv: original.totalIgv,
          userId: original.userId,
          metadata: {
            creditNoteOf: original.orderNumber,
            reasonCode,
          } as Prisma.InputJsonValue,
          details: {
            create: original.details.map((d) => ({
              description: d.description,
              price: d.price,
              unitOfMeasure: d.unitOfMeasure,
              discount: d.discount,
              quantity: d.quantity,
              itemType: d.itemType,
              itemId: d.itemId,
              taxAffectation: d.taxAffectation,
              igv: d.igv,
              unitPriceWithoutIgv: d.unitPriceWithoutIgv,
            })),
          },
        },
      });

      // El comprobante original queda anulado en la vista de la app.
      await tx.invoiceHeader.update({
        where: { id: original.id },
        data: { status: InvoiceStatus.CANCELADO },
      });

      await this.reverseTargets(tx, original.details);
      return nc.id;
    });

    await this.auditLog.log({
      userId,
      action: 'CREATE',
      entity: 'invoice',
      entityId: ncId,
      details: {
        action: 'CREDIT_NOTE',
        referenceInvoiceId: invoiceId,
        reasonCode,
      } as unknown as Prisma.InputJsonValue,
    });

    // Reembolso Izipay del comprobante original (el que tiene la transacción).
    await this.refundMoney(
      original.orderNumber,
      reasonDescription,
      userId,
      ncId,
    );

    // Emisión SUNAT de la NC (no bloquea; el cron la retoma si falla).
    void this.sunatEmission.emitInvoice(ncId).catch((err) => {
      this.logger.error(`Emisión SUNAT de NC ${ncId} falló`, err);
    });

    return this.invoiceService.findOne(ncId);
  }

  /**
   * Lista las cancelaciones/devoluciones Izipay con estado FAILED — operaciones
   * que requieren gestión manual de finanzas.
   */
  async pendingRefunds() {
    return this.prisma.paymentCancellation.findMany({
      where: { status: CancellationStatus.FAILED },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Dispara la anulación/devolución del dinero en Izipay. Nunca lanza: la
   * operación contable (anulación interna / NC) ya está registrada; si el
   * reembolso falla, queda como FAILED en `PaymentCancellation` para gestión
   * manual.
   */
  private async refundMoney(
    orderNumber: string,
    reason: string,
    userId: string,
    creditNoteId?: string,
  ) {
    try {
      await this.izipayCancellation.cancelOrRefund({
        orderNumber,
        reason,
        performedBy: userId,
        creditNoteId,
      });
    } catch (err) {
      this.logger.error(
        `Reembolso Izipay de ${orderNumber} falló (la operación contable se mantiene)`,
        err as Error,
      );
    }
  }

  /** Revierte cupos de actividad y cuotas asociadas a las líneas del comprobante. */
  private async reverseTargets(
    tx: PrismaTx,
    details: { itemType: InvoiceItemType; itemId: string | null }[],
  ) {
    for (const d of details) {
      if (!d.itemId) continue;

      if (d.itemType === InvoiceItemType.ACTIVITY_ATTENDEE) {
        const attendee = await tx.activityAttendee.findUnique({
          where: { id: d.itemId },
        });
        if (attendee && attendee.status !== AttendanceStatus.CANCELADO) {
          await tx.activityAttendee.update({
            where: { id: d.itemId },
            data: { status: AttendanceStatus.CANCELADO },
          });
          // Solo el miembro consume el stock principal.
          if (attendee.attendeeType === AttendeeType.MEMBER) {
            await tx.activity.update({
              where: { id: attendee.activityId },
              data: { stockUsed: { decrement: 1 } },
            });
          }
        }
      } else if (d.itemType === InvoiceItemType.QUOTA) {
        // La cuota vuelve a quedar pendiente de pago.
        await tx.quotaPayment.update({
          where: { id: Number(d.itemId) },
          data: {
            status: PaymentStatus.PENDIENTE,
            paidAt: null,
            invoiceId: null,
          },
        });
      }
    }
  }
}
