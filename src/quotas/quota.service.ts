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

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
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
   * Cron mensual: genera el periodo del mes siguiente y asigna a todos los miembros activos.
   * Si no hay configuración, simplemente no hace nada.
   */
  async generateMonthlyPeriod() {
    const org = await this.prisma.organization.findFirst();
    if (!org?.quotaDueDay || !org.moduleQuotes) {
      this.logger.log(
        'Sistema de cuotas no configurado, saltando generación mensual',
      );
      return;
    }

    const quoteAmounts = await this.prisma.quoteAmount.findMany({
      where: { organizationId: org.id },
    });
    if (quoteAmounts.length === 0) {
      this.logger.log(
        'No hay montos de cuota definidos, saltando generación mensual',
      );
      return;
    }

    // Solo generar si ya hay al menos un periodo (sistema inicializado)
    const anyPeriod = await this.prisma.quotaPeriod.findFirst();
    if (!anyPeriod) {
      this.logger.log(
        'Sistema de cuotas no inicializado, saltando generación mensual',
      );
      return;
    }

    const totalAmount = quoteAmounts.reduce((sum, q) => sum + q.amount, 0);
    const { year, month } = this.getNextMonth();
    const dueDate = this.buildDueDate(year, month, org.quotaDueDay);

    await this.prisma.$transaction(async (tx) => {
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
    });
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
      select: { id: true, userId: true },
    });

    if (overduePayments.length > 0) {
      await this.prisma.quotaPayment.updateMany({
        where: { id: { in: overduePayments.map((p) => p.id) } },
        data: { status: PaymentStatus.EXPIRADO },
      });

      this.logger.log(
        `${overduePayments.length} pagos marcados como EXPIRADO (mora)`,
      );

      // Bloquear miembros si moraAutoBlock está activado
      if (org.moraAutoBlock) {
        const userIds = [...new Set(overduePayments.map((p) => p.userId))];
        await this.prisma.user.updateMany({
          where: {
            id: { in: userIds },
            status: { not: UserStatus.BLOCKED },
          },
          data: { status: UserStatus.BLOCKED },
        });

        this.logger.log(`${userIds.length} miembros bloqueados por mora`);
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
    console.log('Pagos encontrados:', payments);
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
