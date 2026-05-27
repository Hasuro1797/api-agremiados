import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma/client';
import {
  ActivityAudience,
  AttendanceStatus,
  AttendeeType,
  Currency,
  DiscountTargetType,
  DiscountType,
  DocumentType,
  InvoiceItemType,
  InvoiceStatus,
  PaymentStatus,
  Role,
  Status,
} from 'generated/prisma/enums';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { RequestSource } from 'src/common/enums';
import { EnvConfig } from 'src/config';
import { PrismaService, PrismaTx } from 'src/db/prisma.service';
import { InvoiceService } from 'src/invoice/invoice.service';
import { CreateInvoiceLine } from 'src/invoice/invoice.types';
import { SunatEmissionService } from 'src/sunat/sunat-emission.service';
import { ConfirmPaymentInput } from './dto/confirm-payment.input';
import { GeneratePaymentTokenInput } from './dto/generate-payment-token.input';
import { PaymentTargetType } from './dto/payment-target.enum';
import { PreviewPaymentInput } from './dto/preview-payment.input';
import { PaymentPreviewEntity } from './entities/payment-preview.entity';
import { IzipayService } from './izipay.service';
import { checkSignature } from './utils/signature.util';

const TOKEN_TTL_MS = 15 * 60 * 1000; // Izipay: el token expira en 15 minutos
const IGV_RATE = 0.18;
// Afectación tributaria por concepto (Catálogo 07 SUNAT):
//  - Cuotas de agremiados: EXONERADO ('20') — no llevan IGV (boleta y factura).
//  - Actividades pagadas (académicas/sociales): GRAVADO ('10') — con IGV.
const QUOTA_TAX_AFFECTATION = '20';
const ACTIVITY_TAX_AFFECTATION = '10';
// Códigos que indican cancelación por el comercio / sin firma.
const CANCELLED_CODES = ['021', 'Cerrado por Comercio', 'COMMUNICATION_ERROR'];
const SUCCESS_CODES = ['00'];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface PreparedCharge {
  lines: CreateInvoiceLine[];
  chargeAmount: number;
  userId: string;
  documentType: DocumentType;
  documentNumber: string | null;
  clientName: string | null;
  billingAddress: string | null;
  metadata: Prisma.InputJsonValue;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly izipay: IzipayService,
    private readonly invoiceService: InvoiceService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService<EnvConfig>,
    private readonly sunatEmission: SunatEmissionService,
  ) {}

  // ============================================================
  // GENERACIÓN DE TOKEN + RESERVA
  // ============================================================

  async generatePaymentToken(
    input: GeneratePaymentTokenInput,
    currentUser: { sub: string; role: Role },
  ) {
    if (input.target === PaymentTargetType.QUOTA) {
      return this.generateForQuota(input, currentUser);
    }
    return this.generateForActivity(input, currentUser);
  }

  // ============================================================
  // PREVIEW DE PAGO (sin efectos secundarios)
  // ============================================================

  /**
   * Calcula el desglose del pago (subtotal, descuento, IGV, total) usando la
   * misma lógica de descuentos que generatePaymentToken, pero SIN crear
   * reservas, marcar cuotas, generar comprobantes ni llamar a Izipay.
   *
   * Idempotente y barata: solo lecturas. Pensada para mostrarle al usuario
   * cuánto se cobrará mientras edita la selección.
   */
  async previewPayment(
    input: PreviewPaymentInput,
    currentUser: { sub: string; role: Role },
  ): Promise<PaymentPreviewEntity> {
    if (input.target === PaymentTargetType.QUOTA) {
      return this.previewQuota(input, currentUser);
    }
    return this.previewActivity(input, currentUser);
  }

  private async previewQuota(
    input: PreviewPaymentInput,
    currentUser: { sub: string; role: Role },
  ): Promise<PaymentPreviewEntity> {
    if (!input.quotaPaymentIds?.length) {
      throw new BadRequestException(
        'quotaPaymentIds es requerido para previsualizar cuotas',
      );
    }
    const ids = [...new Set(input.quotaPaymentIds)];

    const quotas = await this.prisma.quotaPayment.findMany({
      where: { id: { in: ids } },
      include: { period: true },
    });
    if (quotas.length !== ids.length) {
      throw new BadRequestException('Alguna cuota no fue encontrada');
    }

    const ownerId = quotas[0].userId;
    if (!quotas.every((q) => q.userId === ownerId)) {
      throw new BadRequestException(
        'Todas las cuotas deben pertenecer al mismo usuario',
      );
    }
    const isOwner = ownerId === currentUser.sub;
    const isStaff = currentUser.role !== Role.MEMBER;
    if (!isOwner && !isStaff) {
      throw new BadRequestException(
        'No puedes previsualizar cuotas de otro usuario',
      );
    }

    const warnings: string[] = [];
    const valid = quotas.filter((q) => {
      if (q.status === PaymentStatus.PAGADO) {
        warnings.push(
          `La cuota ${q.period.month}/${q.period.year} ya está pagada y fue omitida del cálculo`,
        );
        return false;
      }
      return true;
    });

    if (valid.length === 0) {
      return {
        subtotal: 0,
        discount: null,
        igv: null,
        total: 0,
        currency: Currency.PEN,
        lines: [],
        warnings,
      };
    }

    const { percentage, name } = await this.resolveQuotaDiscount(
      ownerId,
      valid.length,
    );

    const lines = valid.map((q) => ({
      label: `Cuota ${q.period.month}/${q.period.year}`,
      quantity: 1,
      unitAmount: round2(q.period.amount),
      amount: round2(q.period.amount),
    }));
    const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
    const discountAmount = round2((subtotal * percentage) / 100);
    const total = round2(subtotal - discountAmount);

    return {
      subtotal,
      discount:
        percentage > 0
          ? { amount: discountAmount, percentage, name: name ?? 'Descuento' }
          : null,
      // Cuotas exoneradas (cat. 07 SUNAT '20') — no llevan IGV.
      igv: null,
      total,
      currency: Currency.PEN,
      lines,
      warnings,
    };
  }

  private async previewActivity(
    input: PreviewPaymentInput,
    currentUser: { sub: string; role: Role },
  ): Promise<PaymentPreviewEntity> {
    if (!input.targetId) {
      throw new BadRequestException(
        'targetId es requerido para previsualizar una actividad',
      );
    }
    const activity = await this.prisma.activity.findUnique({
      where: { id: input.targetId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (!activity.hasPrice || !activity.price || activity.price <= 0) {
      throw new BadRequestException('Esta actividad no tiene costo de pago');
    }

    const warnings: string[] = [];
    const requestedGuests = input.guests?.length ?? 0;
    let effectiveGuests = requestedGuests;

    if (effectiveGuests > 0) {
      if (activity.audience === ActivityAudience.MEMBERS_ONLY) {
        warnings.push(
          'Esta actividad no admite invitados; los invitados fueron omitidos del preview',
        );
        effectiveGuests = 0;
      } else if (!activity.priceInvitee || activity.priceInvitee <= 0) {
        warnings.push(
          'La actividad no tiene precio configurado para invitados; los invitados fueron omitidos del preview',
        );
        effectiveGuests = 0;
      }
    }

    const { percentage, name } = await this.resolveDiscount(
      currentUser.sub,
      DiscountType.EVENTO,
      activity.id,
    );

    const lines = [
      {
        label: `Inscripción: ${activity.title}`,
        quantity: 1,
        unitAmount: round2(activity.price),
        amount: round2(activity.price),
      },
    ];
    if (effectiveGuests > 0 && activity.priceInvitee) {
      const unit = round2(activity.priceInvitee);
      lines.push({
        label: 'Invitados',
        quantity: effectiveGuests,
        unitAmount: unit,
        amount: round2(unit * effectiveGuests),
      });
    }

    const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
    const discountAmount = round2((subtotal * percentage) / 100);
    const total = round2(subtotal - discountAmount);
    // Actividad = gravada ('10'): los precios incluyen IGV. Desglosamos la
    // base (valor de venta) y el IGV embebido en el total para mostrarlos.
    const base = round2(total / (1 + IGV_RATE));
    const igvAmount = round2(total - base);

    return {
      subtotal,
      discount:
        percentage > 0
          ? { amount: discountAmount, percentage, name: name ?? 'Descuento' }
          : null,
      igv: { amount: igvAmount, rate: IGV_RATE },
      total,
      currency: Currency.PEN,
      lines,
      warnings,
    };
  }

  // ---------- QUOTA ----------

  private async generateForQuota(
    input: GeneratePaymentTokenInput,
    currentUser: { sub: string; role: Role },
  ) {
    if (!input.quotaPaymentIds?.length) {
      throw new BadRequestException(
        'quotaPaymentIds es requerido para pagar cuotas',
      );
    }
    const ids = [...new Set(input.quotaPaymentIds)];

    const quotas = await this.prisma.quotaPayment.findMany({
      where: { id: { in: ids } },
      include: { period: true, user: true },
    });
    if (quotas.length !== ids.length) {
      throw new NotFoundException('Alguna cuota no fue encontrada');
    }

    // Todas deben ser del mismo agremiado
    const ownerId = quotas[0].userId;
    if (!quotas.every((q) => q.userId === ownerId)) {
      throw new BadRequestException(
        'Todas las cuotas deben pertenecer al mismo usuario',
      );
    }

    const isOwner = ownerId === currentUser.sub;
    const isStaff = currentUser.role !== Role.MEMBER;
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('No puedes pagar la cuota de otro usuario');
    }
    if (quotas.some((q) => q.status === PaymentStatus.PAGADO)) {
      throw new BadRequestException('Alguna de las cuotas ya está pagada');
    }

    // Idempotencia: reusar reserva PENDIENTE vigente que cubra exactamente este set
    const reusable = await this.findReusableQuotaInvoice(ids);
    if (reusable) return this.regenerateToken(reusable);

    const { percentage: discountPct } = await this.resolveQuotaDiscount(
      ownerId,
      quotas.length,
    );
    const billing = this.resolveBilling(input, quotas[0].user);

    const lines: CreateInvoiceLine[] = quotas.map((q) => {
      const priceFinal = round2(q.period.amount * (1 - discountPct / 100));
      return {
        description: `Cuota ${q.period.month}/${q.period.year}`,
        quantity: 1,
        valorUnitario: this.deriveValorUnitario(
          priceFinal,
          QUOTA_TAX_AFFECTATION,
        ),
        tipoAfectacionIgv: QUOTA_TAX_AFFECTATION,
        itemType: InvoiceItemType.QUOTA,
        itemId: String(q.id),
      };
    });
    console.log('Prepared invoice lines for quota payment:', lines);
    const prepared: PreparedCharge = {
      userId: ownerId,
      ...billing,
      chargeAmount: lines.reduce((s, l) => s + l.valorUnitario, 0),
      metadata: {
        target: PaymentTargetType.QUOTA,
        quotaPaymentIds: ids,
        quotaCount: quotas.length,
        discountPct,
      },
      lines,
    };
    console.log('Prepared charge for quota payment:', prepared);

    return this.reserveAndTokenize(prepared, null);
  }

  // ---------- ACTIVITY ----------

  private async generateForActivity(
    input: GeneratePaymentTokenInput,
    currentUser: { sub: string; role: Role },
  ) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: input.targetId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.status !== Status.ACTIVE) {
      throw new BadRequestException('La actividad no está activa');
    }
    if (!activity.hasPrice || !activity.price || activity.price <= 0) {
      throw new BadRequestException('Esta actividad no tiene costo de pago');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const guests = input.guests ?? [];
    if (guests.length > 0) {
      if (activity.audience === ActivityAudience.MEMBERS_ONLY) {
        throw new BadRequestException('Esta actividad no admite invitados');
      }
      if (!activity.priceInvitee || activity.priceInvitee <= 0) {
        throw new BadRequestException(
          'Esta actividad no tiene precio configurado para invitados',
        );
      }
    }

    // ¿Ya tiene una inscripción para esta actividad?
    const existingAttendee = await this.prisma.activityAttendee.findFirst({
      where: { userId: currentUser.sub, activityId: activity.id },
    });

    if (existingAttendee?.status === AttendanceStatus.ACEPTADO) {
      throw new BadRequestException(
        'Ya estás inscrito y pagado en esta actividad',
      );
    }

    // Reintento: hay inscripción PENDIENTE con invoice vigente → reusar (cupo ya reservado)
    if (existingAttendee?.status === AttendanceStatus.PENDIENTE) {
      const reusable = await this.findReusableInvoice(
        InvoiceItemType.ACTIVITY_ATTENDEE,
        existingAttendee.id,
      );
      if (reusable) return this.regenerateToken(reusable);
    }

    const { percentage: discountPct } = await this.resolveDiscount(
      currentUser.sub,
      DiscountType.EVENTO,
      activity.id,
    );
    const memberPriceFinal = round2(activity.price * (1 - discountPct / 100));
    const memberValorUnitario = this.deriveValorUnitario(
      memberPriceFinal,
      ACTIVITY_TAX_AFFECTATION,
    );
    const guestPriceFinal = guests.length
      ? round2(activity.priceInvitee! * (1 - discountPct / 100))
      : 0;
    const guestValorUnitario = this.deriveValorUnitario(
      guestPriceFinal,
      ACTIVITY_TAX_AFFECTATION,
    );

    const billing = this.resolveBilling(input, user);

    // Reserva atómica de cupos (miembro + invitados) y creación de inscripciones
    const reserved = await this.prisma.$transaction(async (tx) => {
      // Cupo del miembro: solo incrementa si aún hay stock libre.
      const reserve = await tx.activity.updateMany({
        where: { id: activity.id, stockUsed: { lt: activity.stock } },
        data: { stockUsed: { increment: 1 } },
      });
      if (reserve.count === 0) {
        throw new BadRequestException('No hay cupos disponibles');
      }

      // Crear o reactivar la inscripción del miembro
      let memberAttendeeId: string;
      if (existingAttendee) {
        await tx.activityAttendee.update({
          where: { id: existingAttendee.id },
          data: { status: AttendanceStatus.PENDIENTE },
        });
        memberAttendeeId = existingAttendee.id;
      } else {
        const created = await tx.activityAttendee.create({
          data: {
            userId: currentUser.sub,
            activityId: activity.id,
            attendeeType: AttendeeType.MEMBER,
            status: AttendanceStatus.PENDIENTE,
          },
        });
        memberAttendeeId = created.id;
      }

      // Invitados (INVITED), patrocinados por el miembro. Límite = guestStock por miembro.
      const guestAttendeeIds: string[] = [];
      if (guests.length > 0) {
        const existingGuests = await tx.activityAttendee.count({
          where: {
            sponsorAttendeeId: memberAttendeeId,
            attendeeType: AttendeeType.INVITED,
            status: {
              in: [AttendanceStatus.PENDIENTE, AttendanceStatus.ACEPTADO],
            },
          },
        });
        if (existingGuests + guests.length > activity.guestStock) {
          throw new BadRequestException(
            `Excede el cupo de invitados (máximo ${activity.guestStock})`,
          );
        }

        for (const g of guests) {
          const dup = await tx.activityAttendee.findFirst({
            where: {
              activityId: activity.id,
              documentNumber: g.documentNumber,
            },
          });
          if (dup) {
            throw new BadRequestException(
              `El documento ${g.documentNumber} ya está registrado en esta actividad`,
            );
          }
          const guest = await tx.activityAttendee.create({
            data: {
              activityId: activity.id,
              attendeeType: AttendeeType.INVITED,
              status: AttendanceStatus.PENDIENTE,
              sponsorAttendeeId: memberAttendeeId,
              documentType: g.documentType,
              documentNumber: g.documentNumber,
              name: g.name,
              lastname: g.lastname,
              email: g.email,
              phone: g.phone,
            },
          });
          guestAttendeeIds.push(guest.id);
        }
      }

      return { memberAttendeeId, guestAttendeeIds };
    });

    const lines: CreateInvoiceLine[] = [
      {
        description: `Inscripción: ${activity.title}`,
        quantity: 1,
        valorUnitario: memberValorUnitario,
        tipoAfectacionIgv: ACTIVITY_TAX_AFFECTATION,
        itemType: InvoiceItemType.ACTIVITY_ATTENDEE,
        itemId: reserved.memberAttendeeId,
      },
      ...reserved.guestAttendeeIds.map((gid, i) => ({
        description: `Invitado: ${guests[i].name} ${guests[i].lastname}`,
        quantity: 1,
        valorUnitario: guestValorUnitario,
        tipoAfectacionIgv: ACTIVITY_TAX_AFFECTATION,
        itemType: InvoiceItemType.ACTIVITY_ATTENDEE,
        itemId: gid,
      })),
    ];

    const prepared: PreparedCharge = {
      userId: currentUser.sub,
      ...billing,
      chargeAmount: memberPriceFinal + guestPriceFinal * guests.length,
      metadata: {
        target: PaymentTargetType.ACTIVITY,
        targetId: activity.id,
        attendeeId: reserved.memberAttendeeId,
        guestAttendeeIds: reserved.guestAttendeeIds,
        discountPct,
      },
      lines,
    };

    try {
      return await this.reserveAndTokenize(prepared, {
        activityId: activity.id,
        attendeeId: reserved.memberAttendeeId,
        guestAttendeeIds: reserved.guestAttendeeIds,
        wasExisting: !!existingAttendee,
      });
    } catch (err) {
      // Si falla la creación de invoice o el token, liberamos el cupo del miembro
      // y cancelamos al miembro + invitados (los invitados no consumen stock principal).
      await this.prisma.$transaction(async (tx) => {
        await tx.activity.update({
          where: { id: activity.id },
          data: { stockUsed: { decrement: 1 } },
        });
        await tx.activityAttendee.updateMany({
          where: {
            id: {
              in: [reserved.memberAttendeeId, ...reserved.guestAttendeeIds],
            },
          },
          data: { status: AttendanceStatus.CANCELADO },
        });
      });
      throw err;
    }
  }

  // ============================================================
  // INSCRIPCIÓN A EVENTO GRATUITO (sin Izipay)
  // ============================================================

  /**
   * Inscribe al usuario en una actividad SIN costo. No genera token Izipay ni
   * comprobante; solo reserva el cupo de forma atómica y confirma la inscripción.
   */
  async enrollFreeActivity(activityId: number, currentUser: { sub: string }) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.status !== Status.ACTIVE) {
      throw new BadRequestException('La actividad no está activa');
    }
    if (activity.hasPrice && activity.price && activity.price > 0) {
      throw new BadRequestException(
        'Esta actividad tiene costo; usa el flujo de pago',
      );
    }

    const existing = await this.prisma.activityAttendee.findFirst({
      where: { userId: currentUser.sub, activityId },
    });
    if (existing?.status === AttendanceStatus.ACEPTADO) {
      throw new BadRequestException('Ya estás inscrito en esta actividad');
    }

    const attendeeId = await this.prisma.$transaction(async (tx) => {
      // Si ya tenía una reserva PENDIENTE, el cupo ya está tomado: no re-reservar.
      const alreadyHoldsStock = existing?.status === AttendanceStatus.PENDIENTE;
      if (!alreadyHoldsStock) {
        const reserve = await tx.activity.updateMany({
          where: { id: activityId, stockUsed: { lt: activity.stock } },
          data: { stockUsed: { increment: 1 } },
        });
        if (reserve.count === 0) {
          throw new BadRequestException('No hay cupos disponibles');
        }
      }

      if (existing) {
        await tx.activityAttendee.update({
          where: { id: existing.id },
          data: { status: AttendanceStatus.ACEPTADO },
        });
        return existing.id;
      }
      const created = await tx.activityAttendee.create({
        data: {
          userId: currentUser.sub,
          activityId,
          attendeeType: 'MEMBER',
          status: AttendanceStatus.ACEPTADO,
        },
      });
      return created.id;
    });

    await this.auditLog.log({
      userId: currentUser.sub,
      action: 'CREATE',
      entity: 'activity_attendee',
      entityId: attendeeId,
      details: { activityId, free: true } as unknown as Prisma.InputJsonValue,
    });

    return {
      attendeeId,
      activityId,
      status: AttendanceStatus.ACEPTADO,
      message: 'Inscripción confirmada',
    };
  }

  // ============================================================
  // CREACIÓN DE INVOICE + TOKEN IZIPAY
  // ============================================================

  /** Crea el invoice (con su stock ya reservado) y solicita el token a Izipay. */
  private async reserveAndTokenize(
    prepared: PreparedCharge,
    stockCtx: Record<string, unknown> | null,
  ) {
    const invoice = await this.prisma.$transaction((tx) =>
      this.invoiceService.createInvoice(
        {
          userId: prepared.userId,
          clientName: prepared.clientName,
          documentType: prepared.documentType,
          documentNumber: prepared.documentNumber,
          billingAddress: prepared.billingAddress,
          currency: Currency.PEN,
          lines: prepared.lines,
          metadata: prepared.metadata,
        },
        tx,
      ),
    );

    const chargeAmount = this.invoiceTotal(invoice);
    // formaterarlo a 12.30 o 12.00 en string
    const amountStr = chargeAmount.toFixed(2);
    const transactionId = this.generateTransactionId();

    let izipayResponse: any;
    try {
      izipayResponse = await this.izipay.generateToken({
        requestSource: RequestSource.ECOMMERCE,
        transactionId,
        orderNumber: invoice.orderNumber,
        amount: amountStr,
      });
    } catch (err) {
      await this.prisma.invoiceHeader.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.FALLIDO },
      });
      throw err; // el caller (actividad) libera stock
    }

    const token = this.extractToken(izipayResponse);
    if (!token) {
      await this.prisma.invoiceHeader.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.FALLIDO },
      });
      throw new BadRequestException('Izipay no devolvió un token válido');
    }

    await this.prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.orderNumber,
        transactionId,
        amount: chargeAmount,
        currency: Currency.PEN,
        status: PaymentStatus.PENDIENTE,
        paymentToken: token,
        paymentTokenAt: new Date(),
      },
    });

    await this.auditLog.log({
      userId: prepared.userId,
      action: 'PAYMENT',
      entity: 'invoice',
      entityId: invoice.id,
      details: {
        step: 'TOKEN_GENERATED',
        orderNumber: invoice.orderNumber,
        amount: chargeAmount,
        ...(stockCtx ?? {}),
      } as unknown as Prisma.InputJsonValue,
    });

    return {
      token,
      transactionId,
      orderNumber: invoice.orderNumber,
      invoiceId: invoice.id,
      amount: chargeAmount,
      amountCents: amountStr,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      reused: false,
      raw: izipayResponse,
    };
  }

  /** Reintento: invoice ya existe; regeneramos token y refrescamos la ventana. */
  private async regenerateToken(invoice: {
    id: string;
    orderNumber: string;
    userId: string | null;
    transaction: {
      id: string;
      transactionId: string;
      paymentToken: string | null;
      paymentTokenAt: Date | null;
    } | null;
    totalTaxable: number | null;
    totalExempt: number | null;
    totalUnaffected: number | null;
    totalIgv: number | null;
    totalIsc: number | null;
    totalOtherCharges: number | null;
  }) {
    const chargeAmount = this.invoiceTotal(invoice);
    const amountCents = String(Math.round(chargeAmount * 100));

    // Atajo: si ya hay un token Izipay vigente para este orderNumber, lo
    // devolvemos en vez de pedir uno nuevo (Izipay rechaza con 400 si se pide
    // un segundo token para el mismo orderNumber dentro de los 15 min).
    const existing = invoice.transaction;
    if (
      existing?.paymentToken &&
      existing.paymentTokenAt &&
      existing.paymentTokenAt.getTime() + TOKEN_TTL_MS > Date.now()
    ) {
      return {
        token: existing.paymentToken,
        transactionId: existing.transactionId,
        orderNumber: invoice.orderNumber,
        invoiceId: invoice.id,
        amount: chargeAmount,
        amountCents,
        expiresAt: new Date(existing.paymentTokenAt.getTime() + TOKEN_TTL_MS),
        reused: true,
        raw: null,
      };
    }

    // Token vencido o inexistente: pedir uno nuevo a Izipay.
    const transactionId = this.generateTransactionId();
    const izipayResponse = await this.izipay.generateToken({
      requestSource: RequestSource.ECOMMERCE,
      transactionId,
      orderNumber: invoice.orderNumber,
      amount: amountCents,
    });
    const token = this.extractToken(izipayResponse);
    if (!token) {
      throw new BadRequestException('Izipay no devolvió un token válido');
    }

    // Refrescar la ventana de expiración (touch) y la transacción.
    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceHeader.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PENDIENTE },
      });
      if (invoice.transaction) {
        await tx.paymentTransaction.update({
          where: { id: invoice.transaction.id },
          data: {
            transactionId,
            status: PaymentStatus.PENDIENTE,
            paymentToken: token,
            paymentTokenAt: new Date(),
          },
        });
      } else {
        await tx.paymentTransaction.create({
          data: {
            invoiceId: invoice.orderNumber,
            transactionId,
            amount: chargeAmount,
            currency: Currency.PEN,
            status: PaymentStatus.PENDIENTE,
            paymentToken: token,
            paymentTokenAt: new Date(),
          },
        });
      }
    });

    return {
      token,
      transactionId,
      orderNumber: invoice.orderNumber,
      invoiceId: invoice.id,
      amount: chargeAmount,
      amountCents,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      reused: true,
      raw: izipayResponse,
    };
  }

  // ============================================================
  // CONFIRMACIÓN DE PAGO (callback frontend)
  // ============================================================

  async confirmPayment(input: ConfirmPaymentInput) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: input.transactionId },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException('Transacción no encontrada');
    }
    const invoice = payment.invoice;

    // Idempotencia
    const finalStates: InvoiceStatus[] = [
      InvoiceStatus.PAGADO,
      InvoiceStatus.FALLIDO,
      InvoiceStatus.CANCELADO,
      InvoiceStatus.EXPIRADO,
    ];
    if (finalStates.includes(invoice.status)) {
      return this.buildResult(invoice.status, invoice.orderNumber);
    }

    const code = this.extractCode(input.answer);
    const outcome = await this.decideOutcome(input, payment, code);

    // PENDING: no finalizamos; el IPN server-to-server confirmará el resultado.
    if (outcome === 'PENDING') {
      return this.buildResult(InvoiceStatus.PENDIENTE, invoice.orderNumber);
    }

    const finalStatus = await this.applyOutcome(
      payment.id,
      outcome,
      input.answer,
    );
    return this.buildResult(finalStatus, invoice.orderNumber);
  }

  /**
   * Procesa el resultado de pago desde el IPN (server-to-server). Idempotente.
   * Reutilizado por IzipayController.
   */
  async processIpn(body: {
    transactionId?: string;
    code?: string;
    signature?: string;
    payloadHttp?: string;
    [k: string]: unknown;
  }) {
    if (!body.transactionId) {
      throw new BadRequestException('transactionId requerido');
    }
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId: body.transactionId },
      include: { invoice: true },
    });
    if (!payment) {
      this.logger.warn(
        `IPN para transactionId desconocido: ${body.transactionId}`,
      );
      return { received: true };
    }

    const finalStates: InvoiceStatus[] = [
      InvoiceStatus.PAGADO,
      InvoiceStatus.FALLIDO,
      InvoiceStatus.CANCELADO,
      InvoiceStatus.EXPIRADO,
    ];
    if (finalStates.includes(payment.invoice.status)) {
      return { received: true };
    }

    // Validar firma salvo códigos excluidos
    const code = body.code ?? '';
    if (
      code &&
      !CANCELLED_CODES.includes(code) &&
      body.payloadHttp &&
      body.signature
    ) {
      const keyHash = this.config.get('IZIPAY_KEY_HASH', { infer: true })!;
      if (!checkSignature(body.payloadHttp, keyHash, body.signature)) {
        throw new BadRequestException('Firma IPN no válida');
      }
    }

    const outcome = this.codeToOutcome(code);
    try {
      await this.applyOutcome(payment.id, outcome, body);
    } catch (err) {
      this.logger.error(`Error procesando IPN ${body.transactionId}:`, err);
    }
    return { received: true };
  }

  /**
   * SOLO DESARROLLO: fuerza el resultado de un pago sin pasar por Izipay, para
   * poder probar el pipeline SUNAT/NC desde el playground. Bloqueado en producción.
   */
  async devForceResult(
    transactionId: string,
    outcome: 'PAID' | 'CANCELLED' | 'FAILED',
  ) {
    const env = this.config.get('NODE_ENV', { infer: true });
    if (env === 'production') {
      throw new ForbiddenException('Operación no disponible en producción');
    }
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Transacción no encontrada');

    const finalStates: InvoiceStatus[] = [
      InvoiceStatus.PAGADO,
      InvoiceStatus.FACTURADO,
      InvoiceStatus.FALLIDO,
      InvoiceStatus.CANCELADO,
      InvoiceStatus.EXPIRADO,
    ];
    if (finalStates.includes(payment.invoice.status)) {
      return this.buildResult(
        payment.invoice.status,
        payment.invoice.orderNumber,
      );
    }

    const status = await this.applyOutcome(payment.id, outcome, {
      dev: true,
      code: outcome === 'PAID' ? '00' : 'DEV',
    });
    return this.buildResult(status, payment.invoice.orderNumber);
  }

  /**
   * Decide el resultado SIN depender del IPN. Estrategia (en orden):
   *  1) Cancelación explícita → CANCELLED.
   *  2) Aprobado + firma válida → PAID (caso normal en local y producción).
   *  3) Aprobado sin firma válida → confirmar con Izipay (verifyTransaction,
   *     llamada saliente que funciona desde localhost) → PAID.
   *  4) Aprobado pero nada valida → PENDING (el IPN finaliza en prod).
   *  5) Resto → FAILED.
   */
  private async decideOutcome(
    input: ConfirmPaymentInput,
    payment: { transactionId: string; invoice: { orderNumber: string } },
    code: string,
  ): Promise<'PAID' | 'CANCELLED' | 'FAILED' | 'PENDING'> {
    const approved =
      SUCCESS_CODES.includes(code) || this.isApprovedAnswer(input.answer);
    const cancelled =
      CANCELLED_CODES.includes(code) || this.isCancelledAnswer(input.answer);

    if (cancelled) return 'CANCELLED';

    if (approved) {
      // Firma: aceptar campos explícitos o los de Web-Core (kr-hash / kr-answer).
      const answer = (input.answer ?? {}) as Record<string, any>;
      const signature = input.signature ?? answer['kr-hash'];
      const payloadHttp = input.payloadHttp ?? answer['kr-answer'];
      const keyHash = this.config.get('IZIPAY_KEY_HASH', { infer: true })!;

      if (
        signature &&
        payloadHttp &&
        checkSignature(payloadHttp, keyHash, signature)
      ) {
        return 'PAID';
      }

      // Sin firma válida: confirmar contra Izipay (no requiere IPN).
      const verified = await this.izipay.verifyTransaction(
        payment.transactionId,
        payment.invoice.orderNumber,
      );
      if (this.verifiedAsPaid(verified)) return 'PAID';

      this.logger.warn(
        `confirmPayment aprobado sin firma/verificación válida; se espera IPN (${payment.transactionId})`,
      );
      return 'PENDING';
    }

    // Sin señal de aprobación/cancelación y sin código → esperar al IPN.
    if (!code && !input.answer) return 'PENDING';

    return 'FAILED';
  }

  private isApprovedAnswer(answer: unknown): boolean {
    if (!answer || typeof answer !== 'object') return false;
    const a = answer as Record<string, any>;
    const code = (a.code ?? a.response?.code ?? '').toString();
    const orderStatus = (a.orderStatus ?? a.response?.orderStatus ?? '')
      .toString()
      .toUpperCase();
    return SUCCESS_CODES.includes(code) || orderStatus === 'PAID';
  }

  private isCancelledAnswer(answer: unknown): boolean {
    if (!answer || typeof answer !== 'object') return false;
    const a = answer as Record<string, any>;
    const code = (a.code ?? a.response?.code ?? '').toString();
    const orderStatus = (a.orderStatus ?? a.response?.orderStatus ?? '')
      .toString()
      .toUpperCase();
    return (
      CANCELLED_CODES.includes(code) ||
      ['ABANDONED', 'CANCELLED', 'EXPIRED'].includes(orderStatus)
    );
  }

  private codeToOutcome(code: string): 'PAID' | 'CANCELLED' | 'FAILED' {
    if (SUCCESS_CODES.includes(code)) return 'PAID';
    if (CANCELLED_CODES.includes(code)) return 'CANCELLED';
    return 'FAILED';
  }

  /** Aplica el resultado al invoice/transacción/target dentro de una transacción. */
  private async applyOutcome(
    paymentId: string,
    outcome: 'PAID' | 'CANCELLED' | 'FAILED',
    rawAnswer: unknown,
  ): Promise<InvoiceStatus> {
    const map = {
      PAID: { invoice: InvoiceStatus.PAGADO, payment: PaymentStatus.PAGADO },
      CANCELLED: {
        invoice: InvoiceStatus.CANCELADO,
        payment: PaymentStatus.CANCELADO,
      },
      FAILED: {
        invoice: InvoiceStatus.FALLIDO,
        payment: PaymentStatus.FALLIDO,
      },
    }[outcome];

    const finalStates: InvoiceStatus[] = [
      InvoiceStatus.PAGADO,
      InvoiceStatus.FACTURADO,
      InvoiceStatus.FALLIDO,
      InvoiceStatus.CANCELADO,
      InvoiceStatus.EXPIRADO,
    ];

    const paidInvoiceId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: { details: true } } },
      });
      if (!payment) throw new NotFoundException('Transacción no encontrada');
      const invoice = payment.invoice;

      // Guarda de concurrencia (callback + IPN): solo una vía finaliza el invoice.
      // El update condicional es atómico; si count=0, otra vía ya lo finalizó.
      const transitioned = await tx.invoiceHeader.updateMany({
        where: { id: invoice.id, status: { notIn: finalStates } },
        data: { status: map.invoice },
      });
      if (transitioned.count === 0) {
        return null; // ya finalizado por otra llamada → no reprocesar
      }
      await tx.paymentTransaction.update({
        where: { id: paymentId },
        data: {
          status: map.payment,
          processedAt: new Date(),
          rawData: (rawAnswer ?? undefined) as Prisma.InputJsonValue,
          ...this.extractPaymentMeta(rawAnswer),
        },
      });

      if (outcome === 'PAID') {
        await this.confirmTarget(tx, invoice.details, invoice.id);
        return invoice.id;
      }
      await this.releaseTarget(tx, invoice.details);
      return null;
    });

    if (outcome === 'PAID' && paidInvoiceId) {
      // Emisión SUNAT fuera de la transacción de pago (no bloquea la confirmación).
      // Si falla, el comprobante queda en ERROR y el cron de reintentos lo retoma.
      void this.sunatEmission.emitInvoice(paidInvoiceId).catch((err) => {
        this.logger.error(`Emisión SUNAT falló para ${paidInvoiceId}`, err);
      });
    }

    return map.invoice;
  }

  /** Pago exitoso: confirmar inscripción / marcar cuota pagada. */
  private async confirmTarget(
    tx: PrismaTx,
    details: { itemType: InvoiceItemType; itemId: string | null }[],
    invoiceId: string,
  ) {
    for (const d of details) {
      if (!d.itemId) continue;
      if (d.itemType === InvoiceItemType.ACTIVITY_ATTENDEE) {
        await tx.activityAttendee.update({
          where: { id: d.itemId },
          data: { status: AttendanceStatus.ACEPTADO },
        });
      } else if (d.itemType === InvoiceItemType.QUOTA) {
        await tx.quotaPayment.update({
          where: { id: Number(d.itemId) },
          data: {
            status: PaymentStatus.PAGADO,
            paidAt: new Date(),
            invoiceId,
          },
        });
      }
    }
  }

  /** Pago cancelado/fallido/expirado: liberar cupo reservado. */
  private async releaseTarget(
    tx: PrismaTx,
    details: { itemType: InvoiceItemType; itemId: string | null }[],
  ) {
    for (const d of details) {
      if (!d.itemId) continue;
      if (d.itemType === InvoiceItemType.ACTIVITY_ATTENDEE) {
        const attendee = await tx.activityAttendee.findUnique({
          where: { id: d.itemId },
        });
        // Solo liberar si seguía reservada (PENDIENTE)
        if (attendee && attendee.status === AttendanceStatus.PENDIENTE) {
          await tx.activityAttendee.update({
            where: { id: d.itemId },
            data: { status: AttendanceStatus.CANCELADO },
          });
          // Solo el miembro consume el stock principal; los invitados no.
          if (attendee.attendeeType === AttendeeType.MEMBER) {
            await tx.activity.update({
              where: { id: attendee.activityId },
              data: { stockUsed: { decrement: 1 } },
            });
          }
        }
      }
      // QUOTA: no se reservó nada, no hay nada que liberar.
    }
  }

  // ============================================================
  // CRON: expirar reservas vencidas (token Izipay = 15 min)
  // ============================================================

  async expirePendingPayments(): Promise<number> {
    const cutoff = new Date(Date.now() - TOKEN_TTL_MS);
    const expired = await this.prisma.invoiceHeader.findMany({
      where: { status: InvoiceStatus.PENDIENTE, updatedAt: { lt: cutoff } },
      select: { id: true },
    });

    for (const inv of expired) {
      await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoiceHeader.findUnique({
          where: { id: inv.id },
          include: { details: true, transaction: true },
        });
        if (!invoice || invoice.status !== InvoiceStatus.PENDIENTE) return;

        await tx.invoiceHeader.update({
          where: { id: inv.id },
          data: { status: InvoiceStatus.EXPIRADO },
        });
        if (invoice.transaction) {
          await tx.paymentTransaction.update({
            where: { id: invoice.transaction.id },
            data: { status: PaymentStatus.EXPIRADO },
          });
        }
        await this.releaseTarget(tx, invoice.details);
      });
    }

    if (expired.length > 0) {
      this.logger.log(`${expired.length} reservas expiradas y liberadas`);
    }
    return expired.length;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async findReusableInvoice(itemType: InvoiceItemType, itemId: string) {
    const cutoff = new Date(Date.now() - TOKEN_TTL_MS);
    return this.prisma.invoiceHeader.findFirst({
      where: {
        status: InvoiceStatus.PENDIENTE,
        updatedAt: { gt: cutoff },
        details: { some: { itemType, itemId } },
      },
      include: { transaction: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Reusa una reserva PENDIENTE cuyo set de cuotas coincida exactamente. */
  private async findReusableQuotaInvoice(quotaIds: number[]) {
    const cutoff = new Date(Date.now() - TOKEN_TTL_MS);
    const want = quotaIds.map(String).sort();
    const candidates = await this.prisma.invoiceHeader.findMany({
      where: {
        status: InvoiceStatus.PENDIENTE,
        updatedAt: { gt: cutoff },
        details: {
          some: { itemType: InvoiceItemType.QUOTA, itemId: { in: want } },
        },
      },
      include: { details: true, transaction: true },
      orderBy: { createdAt: 'desc' },
    });

    return (
      candidates.find((inv) => {
        const got = inv.details
          .filter((d) => d.itemType === InvoiceItemType.QUOTA)
          .map((d) => d.itemId)
          .sort();
        return got.length === want.length && got.every((v, i) => v === want[i]);
      }) ?? null
    );
  }

  /**
   * Descuento de cuotas: combina descuentos por categoría/usuarios con el
   * descuento por cantidad (quotesNumber). Un descuento con quotesNumber solo
   * aplica si la cantidad pagada alcanza ese mínimo. Devuelve el mayor % junto
   * con el nombre legible del descuento ganador (o null si no aplica ninguno).
   */
  private async resolveQuotaDiscount(
    userId: string,
    quotaCount: number,
  ): Promise<{ percentage: number; name: string | null }> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberCategory: true },
    });
    if (!user) return { percentage: 0, name: null };

    const discounts = await this.prisma.discount.findMany({
      where: {
        type: DiscountType.CUOTA,
        status: Status.ACTIVE,
        activityId: null,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { users: { where: { userId } } },
    });

    let best: { percentage: number; name: string | null } = {
      percentage: 0,
      name: null,
    };
    for (const d of discounts) {
      // Descuento por cantidad: solo aplica si se pagan suficientes cuotas.
      if (d.quotesNumber && quotaCount < d.quotesNumber) continue;

      let applies = false;
      if (d.targetType === DiscountTargetType.ALL) applies = true;
      else if (d.targetType === DiscountTargetType.BY_CATEGORY) {
        const cats = Array.isArray(d.targetCategories)
          ? (d.targetCategories as string[])
          : [];
        applies = cats.includes(user.memberCategory);
      } else if (d.targetType === DiscountTargetType.SPECIFIC_USERS) {
        applies = d.users.length > 0;
      }
      if (applies && d.percentage > best.percentage) {
        best = {
          percentage: d.percentage,
          name: this.formatDiscountName(d),
        };
      }
    }
    return best;
  }

  private resolveBilling(
    input: GeneratePaymentTokenInput,
    user: {
      dni: string | null;
      name: string;
      paternalSurname: string;
      maternalSurname: string;
      address: string | null;
    },
  ) {
    if (input.documentType && input.documentNumber) {
      return {
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        clientName:
          input.clientName ??
          `${user.name} ${user.paternalSurname} ${user.maternalSurname}`.trim(),
        billingAddress: input.billingAddress ?? user.address ?? null,
      };
    }
    return {
      documentType: DocumentType.DNI,
      documentNumber: user.dni,
      clientName:
        `${user.name} ${user.paternalSurname} ${user.maternalSurname}`.trim(),
      billingAddress: user.address ?? null,
    };
  }

  /**
   * Devuelve el mayor porcentaje de descuento aplicable al usuario junto con
   * el nombre legible del descuento ganador (o null si no aplica ninguno).
   */
  private async resolveDiscount(
    userId: string,
    type: DiscountType,
    activityId?: number,
  ): Promise<{ percentage: number; name: string | null }> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberCategory: true },
    });
    if (!user) return { percentage: 0, name: null };

    const discounts = await this.prisma.discount.findMany({
      where: {
        type,
        status: Status.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
        ...(type === DiscountType.EVENTO
          ? { activityId: activityId ?? undefined }
          : { activityId: null }),
      },
      include: { users: { where: { userId } } },
    });

    let best: { percentage: number; name: string | null } = {
      percentage: 0,
      name: null,
    };
    for (const d of discounts) {
      let applies = false;
      if (d.targetType === DiscountTargetType.ALL) applies = true;
      else if (d.targetType === DiscountTargetType.BY_CATEGORY) {
        const cats = Array.isArray(d.targetCategories)
          ? (d.targetCategories as string[])
          : [];
        applies = cats.includes(user.memberCategory);
      } else if (d.targetType === DiscountTargetType.SPECIFIC_USERS) {
        applies = d.users.length > 0;
      }
      if (applies && d.percentage > best.percentage) {
        best = {
          percentage: d.percentage,
          name: this.formatDiscountName(d),
        };
      }
    }
    return best;
  }

  /** Construye un nombre legible para un descuento. */
  private formatDiscountName(d: {
    description: string | null;
    quotesNumber: number | null;
    targetType: DiscountTargetType;
  }): string {
    if (d.description && d.description.trim()) return d.description.trim();
    if (d.quotesNumber) return `${d.quotesNumber} cuotas`;
    if (d.targetType === DiscountTargetType.BY_CATEGORY) {
      return 'Descuento por categoría';
    }
    if (d.targetType === DiscountTargetType.SPECIFIC_USERS) {
      return 'Descuento personalizado';
    }
    return 'Descuento';
  }

  private deriveValorUnitario(
    priceFinal: number,
    tipoAfectacion: string,
  ): number {
    if (tipoAfectacion === '10') return round2(priceFinal / (1 + IGV_RATE));
    return round2(priceFinal);
  }

  private invoiceTotal(invoice: {
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

  // transactionId: string en min 5 max 40 caracteres numericos
  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0');
    return timestamp + random;
  }

  private extractToken(response: any): string | null {
    return (
      response?.response?.token ??
      response?.token ??
      response?.data?.response?.token ??
      null
    );
  }

  private extractCode(answer: unknown): string {
    if (!answer || typeof answer !== 'object') return '';
    const a = answer as Record<string, any>;
    return (
      a.code ??
      a.response?.code ??
      a.answer?.code ??
      a.orderStatus ??
      ''
    ).toString();
  }

  private verifiedAsPaid(verified: any): boolean {
    if (!verified) return false;
    const code = (verified?.response?.code ?? verified?.code ?? '').toString();
    const status = (
      verified?.response?.transaction?.status ??
      verified?.response?.status ??
      ''
    ).toString();
    return (
      SUCCESS_CODES.includes(code) ||
      status === 'Authorized' ||
      status === 'PAID'
    );
  }

  private extractPaymentMeta(answer: unknown): {
    authorizationCode?: string;
    paymentMethod?: string;
    cardBrand?: string;
    cardLast4?: string;
    message?: string;
  } {
    if (!answer || typeof answer !== 'object') return {};
    const a = answer as Record<string, any>;
    const r = a.response ?? a;
    const order = r.order?.[0] ?? r;
    return {
      authorizationCode: order.codeAuth ?? undefined,
      paymentMethod: r?.payMethod ?? undefined,
      cardBrand: r?.card?.brand ?? undefined,
      cardLast4: r?.card?.pan ?? undefined,
      message: a.message ?? undefined,
    };
  }

  private buildResult(status: InvoiceStatus, orderNumber: string) {
    const approved = status === InvoiceStatus.PAGADO;
    const messages: Record<string, string> = {
      [InvoiceStatus.PAGADO]: 'Pago realizado con éxito',
      [InvoiceStatus.CANCELADO]: 'El pago fue cancelado',
      [InvoiceStatus.FALLIDO]: 'El pago no pudo procesarse',
      [InvoiceStatus.EXPIRADO]: 'La sesión de pago expiró',
      [InvoiceStatus.PENDIENTE]: 'Pago en proceso',
      [InvoiceStatus.FACTURADO]: 'Pago facturado',
    };
    return {
      status,
      orderNumber,
      approved,
      message: messages[status] ?? 'Estado desconocido',
    };
  }
}
