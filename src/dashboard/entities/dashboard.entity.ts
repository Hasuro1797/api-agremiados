import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class DashboardStats {
  @Field(() => Int, { description: 'Total de agremiados según los filtros' })
  activeMembers!: number;

  @Field(() => Float, { description: '% de cambio vs el mes anterior' })
  activeMembersPercentage!: number;

  @Field(() => Int, { description: 'Total de encuestas según los filtros' })
  activeSurveys!: number;

  @Field(() => Int, { description: 'Solicitudes de reserva con startDate hoy' })
  allReservations!: number;

  @Field(() => Float, { description: '% de cambio vs ayer' })
  allReservationsPercentage!: number;
}
