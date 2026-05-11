import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum PeriodType {
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

registerEnumType(PeriodType, {
  name: 'PeriodType',
  description: 'Tipo de periodo para filtros del dashboard de métricas',
});

@InputType()
export class MetricsDashboardFiltersInput {
  @Field(() => PeriodType, { description: 'Granularidad del periodo' })
  @IsEnum(PeriodType)
  period!: PeriodType;

  @Field(() => Int, { description: 'Año del periodo (ej. 2025)' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Mes 1-12, requerido cuando period = MONTH',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Trimestre 1-4, requerido cuando period = QUARTER',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;
}
