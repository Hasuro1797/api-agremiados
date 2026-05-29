import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma/client';
import {
  CancellationStatus,
  CancellationType,
  PaymentStatus,
} from 'generated/prisma/enums';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { EnvConfig } from 'src/config';
import { PrismaService } from 'src/db/prisma.service';
import { IzipayService } from './izipay.service';

const SUCCESS_CODE = '00';
const AMOUNT_EPSILON = 0.005;
const LIMA_TZ = 'America/Lima';

export interface CancelOrRefundOptions {
  /** orderNumber del comprobante que tiene la transacción de pago. */
  orderNumber: string;
  /** Monto a anular/devolver. Por defecto, el total de la transacción. */
  amountToReturn?: number;
  reason?: string;
  /** InvoiceHeader de la NC que originó la devolución (si aplica). */
  creditNoteId?: string;
  /** userId que ejecuta la operación. */
  performedBy?: string;
}

interface IzipayOperationResult {
  code: string;
  message: string;
  operationId?: string;
}

/**
 * Orquesta la cancelación de dinero en Izipay (Anulación o Devolución) y la
 * registra en `PaymentCancellation`.
 *
 * Regla: mientras el dinero no se haya liquidado (mismo día) y el monto sea
 * total → Anulación. Si es parcial o de días anteriores → Devolución. Si la
 * anulación falla, cae a devolución (cuando está habilitada).
 */
@Injectable()
export class IzipayCancellationService {
  private readonly logger = new Logger(IzipayCancellationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly izipay: IzipayService,
    private readonly config: ConfigService<EnvConfig>,
    private readonly auditLog: AuditLogService,
  ) {}

  private get refundEnabled(): boolean {
    return this.config.get('IZIPAY_REFUND_ENABLED', { infer: true }) === 'true';
  }

  /**
   * Anula o devuelve el dinero de la transacción asociada a `orderNumber`.
   * Devuelve el registro de la operación (APPLIED o FAILED), o null si no hay
   * transacción de pago (p. ej. inscripción gratuita).
   */
  async cancelOrRefund(opts: CancelOrRefundOptions) {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { invoiceId: opts.orderNumber },
      include: { cancellations: true },
    });

    if (!tx) {
      this.logger.log(
        `Sin transacción Izipay para ${opts.orderNumber}; nada que anular/devolver.`,
      );
      return null;
    }

    const amountToReturn = opts.amountToReturn ?? tx.amount;

    // Idempotencia: no exceder el total ya devuelto/anulado.
    const alreadyReturned = tx.cancellations
      .filter((c) => c.status === CancellationStatus.APPLIED)
      .reduce((sum, c) => sum + c.amount, 0);

    if (alreadyReturned >= tx.amount - AMOUNT_EPSILON) {
      this.logger.warn(
        `Transacción ${tx.transactionId} ya fue anulada/devuelta por completo; se omite.`,
      );
      return tx.cancellations.find(
        (c) => c.status === CancellationStatus.APPLIED,
      );
    }

    if (alreadyReturned + amountToReturn > tx.amount + AMOUNT_EPSILON) {
      this.logger.warn(
        `El monto a devolver (${amountToReturn}) excede el saldo de la transacción ${tx.transactionId}.`,
      );
    }

    // Datos autoritativos de Izipay (uniqueId, referenceNumber, codeAuth, ...).
    const order = await this.izipay.searchOrder(tx.invoiceId, tx.transactionId);
    if (!order) {
      return this.record(tx.id, {
        type: CancellationType.ANULACION,
        status: CancellationStatus.FAILED,
        amount: amountToReturn,
        currency: tx.currency,
        message: 'No se pudo consultar la orden en Izipay (Search).',
        reason: opts.reason,
        creditNoteId: opts.creditNoteId,
        performedBy: opts.performedBy,
      });
    }

    const isFull = amountToReturn >= tx.amount - AMOUNT_EPSILON;
    const isSameDay = this.isSameDayLima(tx.processedAt ?? tx.createdAt);

    // --- Decisión: Anulación vs Devolución ---
    if (isFull && isSameDay) {
      try {
        const raw = await this.izipay.cancelTransaction({
          transactionId: tx.transactionId,
          orderNumber: order.orderNumber,
          currency: order.currency || (tx.currency as string),
          amount: tx.amount,
          payMethod: order.payMethod,
          uniqueId: order.uniqueId,
          authorizationCode: order.authorizationCode,
          transactionDatetime: order.transactionDatetime,
        });
        const result = this.extractResult(raw, 'cancel');
        if (result.code === SUCCESS_CODE) {
          return this.finalize(tx.id, tx.transactionId, {
            type: CancellationType.ANULACION,
            amount: tx.amount,
            currency: tx.currency,
            result,
            raw,
            opts,
            full: true,
          });
        }
        this.logger.warn(
          `Anulación de ${tx.transactionId} rechazada (code ${result.code}: ${result.message}); intento devolución.`,
        );
      } catch (err: any) {
        this.logger.warn(
          `Anulación de ${tx.transactionId} falló (${err?.message}); intento devolución.`,
        );
      }
      // Fallback a devolución (típicamente cuando ya está liquidada).
      return this.doRefund(tx, order, amountToReturn, isFull, opts);
    }

    // Parcial o de días anteriores → devolución directa.
    return this.doRefund(tx, order, amountToReturn, isFull, opts);
  }

  /** Ejecuta la devolución (refund) si está habilitada; si no, registra FAILED. */
  private async doRefund(
    tx: { id: string; transactionId: string; amount: number; currency: any },
    order: Awaited<ReturnType<IzipayService['searchOrder']>>,
    amount: number,
    full: boolean,
    opts: CancelOrRefundOptions,
  ) {
    if (!order) return null;

    if (!this.refundEnabled) {
      this.logger.warn(
        `Devolución deshabilitada (IZIPAY_REFUND_ENABLED != true). Registrar devolución manual de S/ ${amount} para ${tx.transactionId}.`,
      );
      return this.record(tx.id, {
        type: CancellationType.DEVOLUCION,
        status: CancellationStatus.FAILED,
        amount,
        currency: tx.currency,
        message:
          'Devolución no habilitada en esta configuración. Requiere gestión manual.',
        reason: opts.reason,
        creditNoteId: opts.creditNoteId,
        performedBy: opts.performedBy,
      });
    }

    const billing = await this.prisma.billingConfig.findFirst();
    if (!billing?.ruc) {
      return this.record(tx.id, {
        type: CancellationType.DEVOLUCION,
        status: CancellationStatus.FAILED,
        amount,
        currency: tx.currency,
        message: 'Falta el RUC en BillingConfig para procesar la devolución.',
        reason: opts.reason,
        creditNoteId: opts.creditNoteId,
        performedBy: opts.performedBy,
      });
    }

    try {
      const raw = await this.izipay.refundTransaction({
        transactionId: tx.transactionId,
        ruc: billing.ruc,
        idUnique: order.uniqueId,
        authorizationCode: order.authorizationCode,
        referenceNumber: order.referenceNumber,
        currency: order.currency || (tx.currency as string),
        refundAmount: amount,
      });
      const result = this.extractResult(raw, 'refund');
      const ok = result.code === SUCCESS_CODE;
      return this.finalize(tx.id, tx.transactionId, {
        type: CancellationType.DEVOLUCION,
        amount,
        currency: tx.currency,
        result,
        raw,
        opts,
        full,
        forceStatus: ok ? undefined : CancellationStatus.FAILED,
      });
    } catch (err: any) {
      this.logger.error(
        `Devolución de ${tx.transactionId} falló: ${err?.message}`,
      );
      return this.record(tx.id, {
        type: CancellationType.DEVOLUCION,
        status: CancellationStatus.FAILED,
        amount,
        currency: tx.currency,
        message: `Error Izipay: ${err?.message ?? 'desconocido'}`,
        rawResponse: this.toJson(err?.response?.data),
        reason: opts.reason,
        creditNoteId: opts.creditNoteId,
        performedBy: opts.performedBy,
      });
    }
  }

  /** Persiste el resultado de una operación exitosa (o fallida con respuesta). */
  private async finalize(
    paymentTransactionId: string,
    transactionId: string,
    data: {
      type: CancellationType;
      amount: number;
      currency: any;
      result: IzipayOperationResult;
      raw: unknown;
      opts: CancelOrRefundOptions;
      full: boolean;
      forceStatus?: CancellationStatus;
    },
  ) {
    const status =
      data.forceStatus ??
      (data.result.code === SUCCESS_CODE
        ? CancellationStatus.APPLIED
        : CancellationStatus.FAILED);

    const record = await this.record(paymentTransactionId, {
      type: data.type,
      status,
      amount: data.amount,
      currency: data.currency,
      izipayOperationId: data.result.operationId,
      responseCode: data.result.code,
      message: data.result.message,
      rawResponse: this.toJson(data.raw),
      reason: data.opts.reason,
      creditNoteId: data.opts.creditNoteId,
      performedBy: data.opts.performedBy,
    });

    // Si fue total y exitosa, marca la transacción como cancelada.
    if (status === CancellationStatus.APPLIED && data.full) {
      await this.prisma.paymentTransaction.update({
        where: { id: paymentTransactionId },
        data: { status: PaymentStatus.CANCELADO },
      });
    }

    this.logger.log(
      `${data.type} de ${transactionId}: ${status} (code ${data.result.code}).`,
    );
    return record;
  }

  private async record(
    paymentTransactionId: string,
    data: {
      type: CancellationType;
      status: CancellationStatus;
      amount: number;
      currency: any;
      izipayOperationId?: string;
      responseCode?: string;
      message?: string;
      rawResponse?: Prisma.InputJsonValue;
      reason?: string;
      creditNoteId?: string;
      performedBy?: string;
    },
  ) {
    const created = await this.prisma.paymentCancellation.create({
      data: {
        paymentTransactionId,
        type: data.type,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        izipayOperationId: data.izipayOperationId,
        responseCode: data.responseCode,
        message: data.message,
        rawResponse: data.rawResponse,
        reason: data.reason,
        creditNoteId: data.creditNoteId,
        performedBy: data.performedBy,
      },
    });

    // Auditoría: cada anulación/devolución (APPLIED o FAILED) deja huella.
    // Acción descriptiva para que finanzas pueda filtrar.
    try {
      await this.auditLog.log({
        userId: data.performedBy,
        action: `${data.type}_${data.status}`,
        entity: 'payment_cancellation',
        entityId: created.id,
        details: {
          paymentTransactionId,
          amount: data.amount,
          currency: data.currency,
          izipayOperationId: data.izipayOperationId,
          responseCode: data.responseCode,
          message: data.message,
          reason: data.reason,
          creditNoteId: data.creditNoteId,
        } as unknown as Prisma.InputJsonValue,
      });
    } catch (err) {
      this.logger.warn(
        `AuditLog falló para PaymentCancellation ${created.id}: ${(err as Error).message}`,
      );
    }

    return created;
  }

  /** Extrae code/message/operationId de la respuesta de cancel o refund. */
  private extractResult(
    raw: any,
    kind: 'cancel' | 'refund',
  ): IzipayOperationResult {
    const code = (raw?.code ?? '').toString();
    const response = raw?.response ?? {};
    const result = response?.result ?? {};
    const operationId =
      kind === 'cancel'
        ? (result.uniqueIdCancel ?? '').toString() || undefined
        : (result.refundTransactionId ?? '').toString() || undefined;
    const message = (result.messageFriendly ?? raw?.message ?? '').toString();
    return { code, message, operationId };
  }

  /** ¿La fecha cae en el mismo día calendario que hoy, en hora de Lima? */
  private isSameDayLima(date: Date): boolean {
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-CA', { timeZone: LIMA_TZ });
    return fmt(date) === fmt(new Date());
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }
}
