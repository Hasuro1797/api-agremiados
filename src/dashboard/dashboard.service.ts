import { Injectable } from '@nestjs/common';
import {
  PaymentStatus,
  Role,
  SupportStatus,
  UserStatus,
} from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { DashboardStatsArgs } from './dto/dashboard-stats.args';
import {
  MetricsDashboardFiltersInput,
  PeriodType,
} from './dto/metrics-dashboard-filters.input';
import {
  AttendanceByMonthEntry,
  MetricsDashboard,
  RevenueByMonthEntry,
} from './entities/metrics-dashboard.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats({
    memberFilters,
    surveyFilters,
    reservationFilters,
  }: DashboardStatsArgs) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const memberWhere: Prisma.UserWhereInput = {
      role: Role.MEMBER,
      ...(memberFilters?.status && { status: memberFilters.status }),
      ...(memberFilters?.memberCategory && {
        memberCategory: memberFilters.memberCategory,
      }),
    };

    const surveyWhere: Prisma.SurveyWhereInput = {
      ...(surveyFilters?.status && { status: surveyFilters.status }),
    };

    const requestWhere: Prisma.ReservationRequestWhereInput = {
      ...(reservationFilters?.status && {
        status: reservationFilters.status,
      }),
    };

    const [
      activeMembers,
      prevMonthMembers,
      activeSurveys,
      todayReservations,
      yesterdayReservations,
    ] = await Promise.all([
      this.prisma.user.count({ where: memberWhere }),
      this.prisma.user.count({
        where: { ...memberWhere, createdAt: { lt: startOfCurrentMonth } },
      }),
      this.prisma.survey.count({ where: surveyWhere }),
      this.prisma.reservationRequest.count({
        where: {
          ...requestWhere,
          startDate: {
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + 86_400_000),
          },
        },
      }),
      this.prisma.reservationRequest.count({
        where: {
          ...requestWhere,
          startDate: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
    ]);

    const activeMembersPercentage =
      prevMonthMembers > 0
        ? Math.round(
            ((activeMembers - prevMonthMembers) / prevMonthMembers) * 1000,
          ) / 10
        : 0;

    const allReservationsPercentage =
      yesterdayReservations > 0
        ? Math.round(
            ((todayReservations - yesterdayReservations) /
              yesterdayReservations) *
              1000,
          ) / 10
        : 0;

    return {
      activeMembers,
      activeMembersPercentage,
      activeSurveys,
      allReservations: todayReservations,
      allReservationsPercentage,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dashboard de métricas administrativas
  // ─────────────────────────────────────────────────────────────────────────

  async getMetricsDashboard(
    filters: MetricsDashboardFiltersInput,
  ): Promise<MetricsDashboard> {
    const { startDate, endDate, startDatePrev, endDatePrev } =
      this.computePeriodDates(filters);

    const dateRange = { gte: startDate, lte: endDate };
    const prevDateRange = { gte: startDatePrev, lte: endDatePrev };

    const [
      revenueAgg,
      revenuePrevAgg,
      revenueTransactions,
      pendingQuotas,
      totalQuotas,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      totalAttendees,
      attendeeRecords,
      pendingClaims,
      inProgressClaims,
      resolvedClaims,
      totalClaims,
    ] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { status: PaymentStatus.PAGADO, createdAt: dateRange },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: PaymentStatus.PAGADO, createdAt: prevDateRange },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { status: PaymentStatus.PAGADO, createdAt: dateRange },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.quotaPayment.count({
        where: { status: PaymentStatus.PENDIENTE, createdAt: dateRange },
      }),
      this.prisma.quotaPayment.count({
        where: { createdAt: dateRange },
      }),
      this.prisma.user.count({
        where: { role: Role.MEMBER, status: UserStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { role: Role.MEMBER, status: UserStatus.INACTIVE },
      }),
      this.prisma.user.count({
        where: { role: Role.MEMBER, status: UserStatus.SUSPENDED },
      }),
      this.prisma.activityAttendee.count({
        where: { createdAt: dateRange },
      }),
      this.prisma.activityAttendee.findMany({
        where: { createdAt: dateRange },
        select: { createdAt: true },
      }),
      this.prisma.support.count({
        where: { status: SupportStatus.PENDING, createdAt: dateRange },
      }),
      this.prisma.support.count({
        where: { status: SupportStatus.IN_PROGRESS, createdAt: dateRange },
      }),
      this.prisma.support.count({
        where: { status: SupportStatus.RESOLVED, createdAt: dateRange },
      }),
      this.prisma.support.count({
        where: { createdAt: dateRange },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amount ?? 0;
    const revenuePrevPeriod = revenuePrevAgg._sum.amount ?? 0;
    const revenueChangePercent =
      revenuePrevPeriod > 0
        ? ((totalRevenue - revenuePrevPeriod) / revenuePrevPeriod) * 100
        : 0;

    const defaultRate =
      totalQuotas > 0 ? (pendingQuotas / totalQuotas) * 100 : 0;

    const totalMembers = activeMembers + inactiveMembers + suspendedMembers;

    const revenueByMonth = this.groupRevenue(
      revenueTransactions,
      filters,
      startDate,
    );
    const attendanceByMonth = this.groupAttendance(
      attendeeRecords,
      filters,
      startDate,
    );

    return {
      totalRevenue,
      revenuePrevPeriod,
      revenueChangePercent,
      revenueByMonth,
      defaultRate,
      pendingQuotas,
      totalQuotas,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      totalMembers,
      totalAttendees,
      attendanceByMonth,
      pendingClaims,
      inProgressClaims,
      resolvedClaims,
      totalClaims,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────────────────────────────────────

  private readonly MONTH_LABELS = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];

  computePeriodDates(filters: MetricsDashboardFiltersInput): {
    startDate: Date;
    endDate: Date;
    startDatePrev: Date;
    endDatePrev: Date;
  } {
    const { period, year, month, quarter } = filters;

    if (period === PeriodType.MONTH) {
      const m = (month ?? 1) - 1; // 0-indexed
      const startDate = new Date(year, m, 1);
      const endDate = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const prevM = m - 1;
      const prevYear = prevM < 0 ? year - 1 : year;
      const prevMonth = prevM < 0 ? 11 : prevM;
      const startDatePrev = new Date(prevYear, prevMonth, 1);
      const endDatePrev = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
      return { startDate, endDate, startDatePrev, endDatePrev };
    }

    if (period === PeriodType.QUARTER) {
      const q = (quarter ?? 1) - 1; // 0-indexed (0-3)
      const startMonth = q * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
      const prevStartMonth = startMonth - 3;
      const prevYear = prevStartMonth < 0 ? year - 1 : year;
      const prevMonth = prevStartMonth < 0 ? 9 : prevStartMonth; // Q4 of previous year
      const startDatePrev = new Date(prevYear, prevMonth, 1);
      const endDatePrev = new Date(prevYear, prevMonth + 3, 0, 23, 59, 59, 999);
      return { startDate, endDate, startDatePrev, endDatePrev };
    }

    // YEAR
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const startDatePrev = new Date(year - 1, 0, 1);
    const endDatePrev = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    return { startDate, endDate, startDatePrev, endDatePrev };
  }

  private weekIndex(day: number): number {
    if (day <= 7) return 0;
    if (day <= 14) return 1;
    if (day <= 21) return 2;
    return 3;
  }

  private groupRevenue(
    transactions: { amount: number; createdAt: Date }[],
    filters: MetricsDashboardFiltersInput,
    startDate: Date,
  ): RevenueByMonthEntry[] {
    const { period } = filters;

    if (period === PeriodType.YEAR) {
      const buckets = Array<number>(12).fill(0);
      for (const t of transactions) {
        buckets[t.createdAt.getMonth()] += t.amount;
      }
      return buckets.map((amount, i) => ({
        label: this.MONTH_LABELS[i],
        amount,
      }));
    }

    if (period === PeriodType.QUARTER) {
      const buckets = [0, 0, 0];
      const startMonth = startDate.getMonth();
      for (const t of transactions) {
        const offset = t.createdAt.getMonth() - startMonth;
        if (offset >= 0 && offset < 3) buckets[offset] += t.amount;
      }
      return buckets.map((amount, i) => ({
        label: this.MONTH_LABELS[startMonth + i],
        amount,
      }));
    }

    // MONTH → weekly
    const buckets = [0, 0, 0, 0];
    for (const t of transactions) {
      buckets[this.weekIndex(t.createdAt.getDate())] += t.amount;
    }
    return buckets.map((amount, i) => ({ label: `Sem ${i + 1}`, amount }));
  }

  private groupAttendance(
    attendees: { createdAt: Date }[],
    filters: MetricsDashboardFiltersInput,
    startDate: Date,
  ): AttendanceByMonthEntry[] {
    const { period } = filters;

    if (period === PeriodType.YEAR) {
      const buckets = Array<number>(12).fill(0);
      for (const a of attendees) {
        buckets[a.createdAt.getMonth()]++;
      }
      return buckets.map((count, i) => ({
        label: this.MONTH_LABELS[i],
        count,
      }));
    }

    if (period === PeriodType.QUARTER) {
      const buckets = [0, 0, 0];
      const startMonth = startDate.getMonth();
      for (const a of attendees) {
        const offset = a.createdAt.getMonth() - startMonth;
        if (offset >= 0 && offset < 3) buckets[offset]++;
      }
      return buckets.map((count, i) => ({
        label: this.MONTH_LABELS[startMonth + i],
        count,
      }));
    }

    // MONTH → weekly
    const buckets = [0, 0, 0, 0];
    for (const a of attendees) {
      buckets[this.weekIndex(a.createdAt.getDate())]++;
    }
    return buckets.map((count, i) => ({ label: `Sem ${i + 1}`, count }));
  }
}
