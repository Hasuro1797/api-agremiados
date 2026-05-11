import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RevenueByMonthEntry {
  @Field(() => String, {
    description: 'Etiqueta del tramo (ej. "Ene", "Sem 1")',
  })
  label: string;

  @Field(() => Float, { description: 'Monto recaudado en el tramo' })
  amount: number;
}

@ObjectType()
export class AttendanceByMonthEntry {
  @Field(() => String, {
    description: 'Etiqueta del tramo (ej. "Ene", "Sem 1")',
  })
  label: string;

  @Field(() => Int, { description: 'Número de asistentes en el tramo' })
  count: number;
}

@ObjectType()
export class MetricsDashboard {
  // ── Recaudación ──────────────────────────────────────────────────────────
  @Field(() => Float, { description: 'Total recaudado en el periodo actual' })
  totalRevenue: number;

  @Field(() => Float, { description: 'Total recaudado en el periodo anterior' })
  revenuePrevPeriod: number;

  @Field(() => Float, {
    description: 'Variación porcentual respecto al periodo anterior',
  })
  revenueChangePercent: number;

  @Field(() => [RevenueByMonthEntry], {
    description: 'Recaudación desglosada por tramo para gráfico de barras',
  })
  revenueByMonth: RevenueByMonthEntry[];

  // ── Cuotas ───────────────────────────────────────────────────────────────
  @Field(() => Float, {
    description: 'Tasa de mora: (pagos pendientes / total pagos) * 100',
  })
  defaultRate: number;

  @Field(() => Int, { description: 'Cantidad de cuotas con estado PENDIENTE' })
  pendingQuotas: number;

  @Field(() => Int, { description: 'Total de cuotas en el periodo' })
  totalQuotas: number;

  // ── Miembros (estado actual, sin filtro de fecha) ─────────────────────────
  @Field(() => Int, { description: 'Miembros con estado ACTIVE' })
  activeMembers: number;

  @Field(() => Int, { description: 'Miembros con estado INACTIVE' })
  inactiveMembers: number;

  @Field(() => Int, { description: 'Miembros con estado SUSPENDED' })
  suspendedMembers: number;

  @Field(() => Int, {
    description: 'Suma de activos + inactivos + suspendidos',
  })
  totalMembers: number;

  // ── Actividades ──────────────────────────────────────────────────────────
  @Field(() => Int, {
    description: 'Total de asistentes a actividades en el periodo',
  })
  totalAttendees: number;

  @Field(() => [AttendanceByMonthEntry], {
    description: 'Asistencia desglosada por tramo para gráfico de línea',
  })
  attendanceByMonth: AttendanceByMonthEntry[];

  // ── Soporte / Reclamos ───────────────────────────────────────────────────
  @Field(() => Int, { description: 'Reclamos con estado PENDING' })
  pendingClaims: number;

  @Field(() => Int, { description: 'Reclamos con estado IN_PROGRESS' })
  inProgressClaims: number;

  @Field(() => Int, { description: 'Reclamos con estado RESOLVED' })
  resolvedClaims: number;

  @Field(() => Int, { description: 'Total de reclamos en el periodo' })
  totalClaims: number;
}
