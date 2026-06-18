import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  PaymentStatus,
  Role,
  Status,
  UserStatus,
} from 'generated/prisma/enums';
import { PrismaService, PrismaTx } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { NotificationService } from 'src/notification/notification.service';
import { TriggerKey, links } from 'src/notification/notification-catalog';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * Botón del admin: inicializa el sistema de cuotas.
   * Crea el QuotaPeriod del mes siguiente y QuotaPayment para todos los miembros activos.
   */
  async initializeQuotaSystem(adminUserId: string) {
    const org = await this.prisma.organization.findFirst();
    if (!org) {
      throw new BadRequestException('No se ha configurado la organización');
    }
    if (!org.quotaDueDay) {
      throw new BadRequestException(
        'Configure el día de vencimiento (quotaDueDay) en la organización antes de inicializar',
      );
    }

    const quoteAmounts = await this.prisma.quoteAmount.findMany({
      where: { organizationId: org.id },
    });
    if (quoteAmounts.length === 0) {
      throw new BadRequestException(
        'Defina al menos un monto de cuota (QuoteAmount) antes de inicializar',
      );
    }

    const totalAmount = quoteAmounts.reduce((sum, q) => sum + q.amount, 0);
    const { year, month } = this.getNextMonth();
    const dueDate = this.buildDueDate(year, month, org.quotaDueDay);

    // Verificar si ya existe el periodo
    const existingPeriod = await this.prisma.quotaPeriod.findUnique({
      where: { year_month: { year, month } },
    });
    if (existingPeriod) {
      throw new BadRequestException(
        `El periodo ${month}/${year} ya fue inicializado`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const period = await tx.quotaPeriod.create({
        data: { year, month, amount: totalAmount, dueDate },
      });

      const members = await tx.user.findMany({
        where: { role: Role.MEMBER, status: UserStatus.ACTIVE },
        select: { id: true },
      });

      if (members.length > 0) {
        await tx.quotaPayment.createMany({
          data: members.map((m) => ({
            userId: m.id,
            periodId: period.id,
          })),
          skipDuplicates: true,
        });
      }

      return { period, membersCount: members.length };
    });

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'quota_system',
      details: {
        action: 'INITIALIZE',
        periodId: result.period.id,
        month,
        year,
        amount: totalAmount,
        membersAssigned: result.membersCount,
      } as unknown as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Sistema de cuotas inicializado: periodo ${month}/${year}, ${result.membersCount} miembros asignados`,
    );

    return true;
  }

  /**
   * Reconciliación idempotente: garantiza que existan los QuotaPeriod del mes
   * actual y del mes siguiente (con sus QuotaPayment asignados a los miembros
   * activos). Diseñada para correr a diario y en el arranque del servidor, de
   * forma que si un disparo del cron se pierde (servidor caído el 1ro), la
   * siguiente ejecución la recupera automáticamente.
   *
   * Costo: en días donde el periodo ya existe, solo hace una lectura indexada
   * por periodo y termina. El insert masivo de pagos ocurre una sola vez al mes
   * (cuando el periodo aún no existía).
   *
   * Si no hay configuración o el sistema no fue inicializado, no hace nada.
   */
  async ensurePeriodsExist() {
    const org = await this.prisma.organization.findFirst();
    if (!org?.quotaDueDay || !org.moduleQuotes) {
      this.logger.log(
        'Sistema de cuotas no configurado, saltando aseguramiento de periodos',
      );
      return;
    }

    // Solo operar si el admin ya inicializó el sistema.
    const anyPeriod = await this.prisma.quotaPeriod.findFirst({
      select: { id: true },
    });
    if (!anyPeriod) {
      this.logger.log(
        'Sistema de cuotas no inicializado, saltando aseguramiento de periodos',
      );
      return;
    }

    const quoteAmounts = await this.prisma.quoteAmount.findMany({
      where: { organizationId: org.id },
    });
    if (quoteAmounts.length === 0) {
      this.logger.log(
        'No hay montos de cuota definidos, saltando aseguramiento de periodos',
      );
      return;
    }
    const totalAmount = quoteAmounts.reduce((sum, q) => sum + q.amount, 0);

    const now = new Date();
    const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
    const next = this.getNextMonth();

    for (const { year, month } of [current, next]) {
      await this.ensurePeriod(year, month, org.quotaDueDay, totalAmount);
    }
  }

  /**
   * Asegura un único periodo (year/month) de forma idempotente.
   *
   * Guard barato: si el periodo ya existe, retorna sin tocar la tabla de
   * miembros ni la de pagos (sus QuotaPayment se crearon en la misma
   * transacción atómica, así que existir implica estar completo). El upsert
   * dentro de la transacción protege contra carreras (cron + bootstrap o
   * múltiples instancias ejecutando a la vez).
   */
  private async ensurePeriod(
    year: number,
    month: number,
    quotaDueDay: number,
    totalAmount: number,
  ) {
    const existing = await this.prisma.quotaPeriod.findUnique({
      where: { year_month: { year, month } },
      select: { id: true },
    });
    if (existing) return;

    const dueDate = this.buildDueDate(year, month, quotaDueDay);

    const memberIds = await this.prisma.$transaction(async (tx) => {
      const period = await tx.quotaPeriod.upsert({
        where: { year_month: { year, month } },
        create: { year, month, amount: totalAmount, dueDate },
        update: {},
      });

      const members = await tx.user.findMany({
        where: { role: Role.MEMBER, status: UserStatus.ACTIVE },
        select: { id: true },
      });

      if (members.length > 0) {
        await tx.quotaPayment.createMany({
          data: members.map((m) => ({
            userId: m.id,
            periodId: period.id,
          })),
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `Periodo ${month}/${year} generado, ${members.length} miembros asignados`,
      );
      return members.map((m) => m.id);
    });

    // Aviso in-app masivo a todos los miembros (fuera de la transacción).
    if (memberIds.length > 0) {
      void this.notification
        .broadcastInApp({
          userIds: memberIds,
          templateCode: TriggerKey.QUOTA_NEW_PERIOD,
          triggerKey: TriggerKey.QUOTA_NEW_PERIOD,
          link: links.quotas(),
          context: {
            month,
            year,
            amount: totalAmount.toFixed(2),
            dueDate: dueDate.toLocaleDateString('es-PE'),
          },
        })
        .catch((err) =>
          this.logger.error(
            `Error difundiendo QUOTA_NEW_PERIOD: ${err.message}`,
          ),
        );
    }
  }

  /**
   * Cron diario: detecta mora y opcionalmente bloquea miembros.
   */
  async detectOverduePayments() {
    const org = await this.prisma.organization.findFirst();
    if (!org) return;

    const graceDays = org.moraGraceDays ?? 7;
    const now = new Date();

    // Encontrar pagos PENDIENTE cuyo periodo ya venció + graceDays
    const overduePayments = await this.prisma.quotaPayment.findMany({
      where: {
        status: PaymentStatus.PENDIENTE,
        period: {
          dueDate: { lt: new Date(now.getTime() - graceDays * 86400000) },
          status: Status.ACTIVE,
        },
      },
      select: {
        id: true,
        userId: true,
        period: {
          select: { month: true, year: true, amount: true, dueDate: true },
        },
      },
    });

    if (overduePayments.length === 0) return;

    await this.prisma.quotaPayment.updateMany({
      where: { id: { in: overduePayments.map((p) => p.id) } },
      data: { status: PaymentStatus.EXPIRADO },
    });

    this.logger.log(
      `${overduePayments.length} pagos marcados como EXPIRADO (mora)`,
    );

    // Agrupar la mora recién detectada por usuario (monto total y periodos).
    const byUser = new Map<
      string,
      { amount: number; count: number; firstDueDate: Date; period: string }
    >();
    for (const p of overduePayments) {
      const entry = byUser.get(p.userId);
      if (entry) {
        entry.amount += p.period.amount;
        entry.count += 1;
        if (p.period.dueDate < entry.firstDueDate)
          entry.firstDueDate = p.period.dueDate;
      } else {
        byUser.set(p.userId, {
          amount: p.period.amount,
          count: 1,
          firstDueDate: p.period.dueDate,
          period: `${p.period.month}/${p.period.year}`,
        });
      }
    }

    // Aviso de mora por usuario (in-app + email; crítico).
    for (const [userId, info] of byUser) {
      void this.notification
        .notify({
          userId,
          templateCode: TriggerKey.QUOTA_OVERDUE,
          triggerKey: TriggerKey.QUOTA_OVERDUE,
          link: links.quotas(),
          context: {
            amount: info.amount.toFixed(2),
            dueDate: info.firstDueDate.toLocaleDateString('es-PE'),
            period: info.count > 1 ? `${info.count} cuotas` : info.period,
          },
        })
        .catch((err) =>
          this.logger.error(
            `Error notificando mora a ${userId}: ${err.message}`,
          ),
        );
    }

    // Bloquear miembros si moraAutoBlock está activado
    if (org.moraAutoBlock) {
      const candidateIds = [...byUser.keys()];
      // Solo los que aún no están bloqueados (para notificar exactamente a esos).
      const toBlock = await this.prisma.user.findMany({
        where: {
          id: { in: candidateIds },
          status: { not: UserStatus.BLOCKED },
        },
        select: { id: true },
      });

      if (toBlock.length > 0) {
        await this.prisma.user.updateMany({
          where: { id: { in: toBlock.map((u) => u.id) } },
          data: { status: UserStatus.BLOCKED },
        });
        this.logger.log(`${toBlock.length} miembros bloqueados por mora`);

        for (const u of toBlock) {
          const info = byUser.get(u.id);
          void this.notification
            .notify({
              userId: u.id,
              templateCode: TriggerKey.MEMBER_BLOCKED,
              triggerKey: TriggerKey.MEMBER_BLOCKED,
              link: links.quotas(),
              context: { amount: (info?.amount ?? 0).toFixed(2) },
            })
            .catch((err) =>
              this.logger.error(
                `Error notificando bloqueo a ${u.id}: ${err.message}`,
              ),
            );
        }
      }
    }
  }

  /**
   * Asigna los periodos activos pendientes a un nuevo miembro.
   * Se llama desde member.create()
   */
  async assignActivePeriodsToMember(userId: string, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    const activePeriods = await client.quotaPeriod.findMany({
      where: { status: Status.ACTIVE },
      select: { id: true },
    });

    if (activePeriods.length > 0) {
      await client.quotaPayment.createMany({
        data: activePeriods.map((p: { id: number }) => ({
          userId,
          periodId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    return activePeriods.length;
  }

  /**
   * Obtiene el resumen de cuotas de un miembro
   */
  /**
   * Lista las cuotas (QuotaPayment) del usuario con su periodo. Útil para que
   * el miembro vea qué adeuda y seleccione qué pagar (cada una tiene su id).
   */
  async getMyQuotaPayments(userId: string, status?: PaymentStatus) {
    const now = new Date();
    const payments = await this.prisma.quotaPayment.findMany({
      where: { userId, ...(status && { status }) },
      include: { period: true },
      orderBy: [{ period: { year: 'asc' } }, { period: { month: 'asc' } }],
    });
    return payments.map((p) => ({
      ...p,
      isOverdue: p.status !== PaymentStatus.PAGADO && p.period.dueDate < now,
    }));
  }

  async getQuotaSummary(userId: string) {
    const payments = await this.prisma.quotaPayment.findMany({
      where: { userId },
      include: { period: true },
    });

    const pending = payments.filter(
      (p) => p.status === PaymentStatus.PENDIENTE,
    );
    const paid = payments.filter((p) => p.status === PaymentStatus.PAGADO);
    const overdue = payments.filter((p) => p.status === PaymentStatus.EXPIRADO);

    return {
      totalPeriods: payments.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      totalOwed: pending.reduce((sum, p) => sum + p.period.amount, 0),
      totalOverdue: overdue.reduce((sum, p) => sum + p.period.amount, 0),
    };
  }

  /**
   * Obtiene resúmenes de cuotas para múltiples miembros en una sola query
   */
  async getQuotaSummaryBatch(userIds: string[]) {
    if (userIds.length === 0) return new Map();

    const payments = await this.prisma.quotaPayment.findMany({
      where: { userId: { in: userIds } },
      include: { period: true },
    });

    const summaryMap = new Map<
      string,
      {
        totalPeriods: number;
        pendingCount: number;
        paidCount: number;
        overdueCount: number;
        totalOwed: number;
        totalOverdue: number;
      }
    >();

    // Inicializar todos los userIds con valores vacíos
    for (const uid of userIds) {
      summaryMap.set(uid, {
        totalPeriods: 0,
        pendingCount: 0,
        paidCount: 0,
        overdueCount: 0,
        totalOwed: 0,
        totalOverdue: 0,
      });
    }

    for (const payment of payments) {
      const summary = summaryMap.get(payment.userId)!;
      summary.totalPeriods++;
      if (payment.status === PaymentStatus.PENDIENTE) {
        summary.pendingCount++;
        summary.totalOwed += payment.period.amount;
      } else if (payment.status === PaymentStatus.PAGADO) {
        summary.paidCount++;
      } else if (payment.status === PaymentStatus.EXPIRADO) {
        summary.overdueCount++;
        summary.totalOverdue += payment.period.amount;
      }
    }

    return summaryMap;
  }

  private getNextMonth(): { year: number; month: number } {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    if (currentMonth === 12) {
      return { year: currentYear + 1, month: 1 };
    }
    return { year: currentYear, month: currentMonth + 1 };
  }

  private buildDueDate(year: number, month: number, day: number): Date {
    // Ajustar día para meses cortos (ej: feb 28)
    const maxDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(day, maxDay);
    return new Date(year, month - 1, safeDay);
  }
}
