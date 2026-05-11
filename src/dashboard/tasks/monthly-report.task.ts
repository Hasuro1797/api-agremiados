import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role, UserStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { DashboardService } from '../dashboard.service';
import { MetricsDashboard } from '../entities/metrics-dashboard.entity';
import { PeriodType } from '../dto/metrics-dashboard-filters.input';

@Injectable()
export class MonthlyReportTask {
  private readonly logger = new Logger(MonthlyReportTask.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Día 1 de cada mes a las 07:00 → genera y envía el reporte del mes anterior
   * a todos los usuarios con rol ADMIN o SUPERADMIN.
   */
  @Cron('0 7 1 * *', { name: 'MONTHLY_REPORT' })
  async handleMonthlyReport() {
    this.logger.log('Ejecutando reporte mensual MONTHLY_REPORT...');

    try {
      const now = new Date();
      // El job corre el 1ro del mes actual → reportar el mes anterior
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth() + 1; // 1-indexed

      const filters = {
        period: PeriodType.MONTH,
        year: prevYear,
        month: prevMonth,
      };

      const metrics = await this.dashboardService.getMetricsDashboard(filters);

      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: [Role.ADMIN, Role.SUPERADMIN] },
          status: UserStatus.ACTIVE,
          email: { not: null },
        },
        select: { email: true, name: true },
      });

      if (admins.length === 0) {
        this.logger.warn(
          'No se encontraron administradores activos para el reporte mensual',
        );
        return;
      }

      const monthName = this.getMonthName(prevMonth);
      const subject = `Reporte Mensual – ${monthName} ${prevYear}`;
      const emails = admins.map((a) => a.email as string);

      await this.mailService.sendMail({
        to: emails as unknown as [string],
        subject,
        template: 'monthly-report',
        context: {
          subject,
          monthName,
          year: prevYear,
          ...this.flattenMetrics(metrics),
        },
      });

      this.logger.log(
        `Reporte mensual (${monthName} ${prevYear}) enviado a ${emails.length} administrador(es)`,
      );
    } catch (error) {
      this.logger.error('Error ejecutando MONTHLY_REPORT', error);
    }
  }

  private getMonthName(month: number): string {
    const names = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return names[(month - 1) % 12];
  }

  /**
   * Aplana el objeto MetricsDashboard para usarlo directamente en la plantilla
   * Handlebars (sin niveles de anidamiento profundos en variables simples).
   */
  private flattenMetrics(metrics: MetricsDashboard): Record<string, unknown> {
    return {
      totalRevenue: metrics.totalRevenue.toFixed(2),
      revenuePrevPeriod: metrics.revenuePrevPeriod.toFixed(2),
      revenueChangePercent: metrics.revenueChangePercent.toFixed(1),
      defaultRate: metrics.defaultRate.toFixed(1),
      pendingQuotas: metrics.pendingQuotas,
      totalQuotas: metrics.totalQuotas,
      activeMembers: metrics.activeMembers,
      inactiveMembers: metrics.inactiveMembers,
      suspendedMembers: metrics.suspendedMembers,
      totalMembers: metrics.totalMembers,
      totalAttendees: metrics.totalAttendees,
      pendingClaims: metrics.pendingClaims,
      inProgressClaims: metrics.inProgressClaims,
      resolvedClaims: metrics.resolvedClaims,
      totalClaims: metrics.totalClaims,
      revenueByMonth: metrics.revenueByMonth,
      attendanceByMonth: metrics.attendanceByMonth,
    };
  }
}
