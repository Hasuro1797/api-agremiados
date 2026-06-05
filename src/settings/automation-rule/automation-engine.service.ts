import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AutomationRule } from 'generated/prisma/client';
import {
  AttendanceStatus,
  AutomationTrigger,
  PaymentStatus,
  Role,
  Status,
  UserStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { NotificationService } from 'src/notification/notification.service';
import { TriggerKey, links } from 'src/notification/notification-catalog';

/** Forma del `config` JSON para los triggers de recordatorio programado. */
interface ReminderConfig {
  /** días de antelación con que se dispara el recordatorio */
  daysBefore?: number;
  /** code de template a usar; por defecto el canónico del trigger */
  templateCode?: string;
}

type RuleHandler = (
  rule: AutomationRule,
  config: ReminderConfig,
) => Promise<number>;

/**
 * MOTOR DE AUTOMATIZACIONES — ejecuta las reglas `AutomationRule` programadas.
 *
 * Solo cubre los triggers de tipo "recordatorio temporal" que no puede emitir
 * un evento de dominio (avisar X días ANTES de que algo ocurra). Los triggers
 * event-driven (ACTIVITY_CREATED, POST_PUBLISHED, SUPPORT_*, etc.) ya se emiten
 * inline desde sus services, y los crons dedicados (QUOTA_OVERDUE,
 * SUPPORT_OVERDUE, MONTHLY_REPORT) siguen siendo autoritativos: este motor los
 * IGNORA para no duplicar envíos.
 *
 * Diseñado como un registry de handlers por `trigger` para poder crecer.
 * Idempotente: cada regla corre como mucho una vez por día natural (guard por
 * `lastRunAt`), de modo que un reinicio o un catch-up de arranque no reenvía.
 */
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  private readonly handlers: Partial<Record<AutomationTrigger, RuleHandler>> = {
    [AutomationTrigger.QUOTA_DUE_REMINDER]: (rule, config) =>
      this.runQuotaDueReminder(config),
    [AutomationTrigger.EVENT_REMINDER]: (rule, config) =>
      this.runEventReminder(config),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Ejecuta todas las reglas activas con handler que aún no corrieron hoy.
   * Punto de entrada del cron diario y del catch-up de arranque.
   */
  async runDueRules(): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { isActive: true },
    });

    for (const rule of rules) {
      if (!this.handlers[rule.trigger]) continue;
      if (!this.shouldRunToday(rule.lastRunAt)) continue;
      try {
        await this.executeRule(rule);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Regla "${rule.name}" (#${rule.id}) falló: ${message}`,
        );
      }
    }
  }

  /**
   * Ejecuta una regla puntual bajo demanda (mutación del admin para probar).
   * Ignora el guard diario: siempre corre.
   */
  async runRuleNow(id: number): Promise<number> {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(
        `Regla de automatización con id "${id}" no encontrada`,
      );
    }
    if (!this.handlers[rule.trigger]) {
      this.logger.warn(
        `Trigger ${rule.trigger} no es programable por el motor (se omite)`,
      );
      return 0;
    }
    return this.executeRule(rule, true);
  }

  private async executeRule(
    rule: AutomationRule,
    manual = false,
  ): Promise<number> {
    const handler = this.handlers[rule.trigger]!;
    const config = (rule.config ?? {}) as ReminderConfig;

    const sent = await handler(rule, config);

    await this.prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRunAt: new Date() },
    });

    await this.auditLog.log({
      action: 'EXECUTE',
      entity: 'automation_rule',
      entityId: String(rule.id),
      details: { trigger: rule.trigger, sent, manual },
    });

    this.logger.log(
      `Regla "${rule.name}" (${rule.trigger}) → ${sent} notificación(es)` +
        (manual ? ' [manual]' : ''),
    );
    return sent;
  }

  /** True si `lastRunAt` es null o cae en un día anterior a hoy. */
  private shouldRunToday(lastRunAt: Date | null): boolean {
    if (!lastRunAt) return true;
    const last = new Date(lastRunAt);
    const now = new Date();
    return (
      last.getFullYear() !== now.getFullYear() ||
      last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate()
    );
  }

  /** Ventana [00:00, 24:00) del día situado a `daysFromToday` de hoy. */
  private dayWindow(daysFromToday: number): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + daysFromToday);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  // ===================== Handlers =====================

  /**
   * Recordatorio de cuota por vencer: busca el periodo cuyo `dueDate` cae dentro
   * de `daysBefore` días y avisa (in-app) a los agremiados activos con pago
   * PENDIENTE en ese periodo.
   */
  private async runQuotaDueReminder(config: ReminderConfig): Promise<number> {
    const daysBefore = config.daysBefore ?? 5;
    const templateCode = config.templateCode ?? TriggerKey.QUOTA_DUE_REMINDER;
    const { start, end } = this.dayWindow(daysBefore);

    const periods = await this.prisma.quotaPeriod.findMany({
      where: { status: Status.ACTIVE, dueDate: { gte: start, lt: end } },
    });
    if (periods.length === 0) return 0;

    let total = 0;
    for (const period of periods) {
      const pending = await this.prisma.quotaPayment.findMany({
        where: {
          periodId: period.id,
          status: PaymentStatus.PENDIENTE,
          user: { role: Role.MEMBER, status: UserStatus.ACTIVE },
        },
        select: { userId: true },
      });
      if (pending.length === 0) continue;

      const userIds = [...new Set(pending.map((p) => p.userId))];
      total += await this.notification.broadcastInApp({
        userIds,
        templateCode,
        triggerKey: TriggerKey.QUOTA_DUE_REMINDER,
        link: links.quotas(),
        context: {
          month: period.month,
          year: period.year,
          amount: period.amount.toFixed(2),
          dueDate: period.dueDate.toLocaleDateString('es-PE'),
        },
      });
    }
    return total;
  }

  /**
   * Recordatorio de evento próximo: busca actividades ACTIVE cuya fecha cae
   * dentro de `daysBefore` días y avisa (in-app) a los asistentes confirmados
   * (ACEPTADO) que son usuarios registrados.
   */
  private async runEventReminder(config: ReminderConfig): Promise<number> {
    const daysBefore = config.daysBefore ?? 1;
    const templateCode = config.templateCode ?? TriggerKey.EVENT_REMINDER;
    const { start, end } = this.dayWindow(daysBefore);

    const activities = await this.prisma.activity.findMany({
      where: { status: Status.ACTIVE, date: { gte: start, lt: end } },
      select: { id: true, title: true, date: true, venue: true },
    });
    if (activities.length === 0) return 0;

    let total = 0;
    for (const activity of activities) {
      const attendees = await this.prisma.activityAttendee.findMany({
        where: {
          activityId: activity.id,
          userId: { not: null },
          status: AttendanceStatus.ACEPTADO,
        },
        select: { userId: true },
      });
      const userIds = [
        ...new Set(
          attendees
            .map((a) => a.userId)
            .filter((id): id is string => id !== null),
        ),
      ];
      if (userIds.length === 0) continue;

      total += await this.notification.broadcastInApp({
        userIds,
        templateCode,
        triggerKey: TriggerKey.EVENT_REMINDER,
        link: links.activity(activity.id),
        context: {
          title: activity.title,
          date: activity.date.toLocaleDateString('es-PE'),
          place: activity.venue ?? 'Por confirmar',
        },
      });
    }
    return total;
  }
}
