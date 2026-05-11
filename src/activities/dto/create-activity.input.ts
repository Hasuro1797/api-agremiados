import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ActivityAudience, ActivityType } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';
import { RangeDiscountDates } from 'src/common/dtos/discounts.args';

@InputType()
export class CreateActivityInput {
  @Field(() => String, {
    description: 'Título de la actividad',
  })
  @IsNotEmpty({ message: 'El titulo es requerido' })
  @IsString({ message: 'El titulo debe ser un string' })
  title!: string;

  @Field(() => String, {
    description: 'Descripción de la actividad',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  description?: string;

  @Field(() => String, {
    description: 'Tipo de actividad: SOCIAL o ACADEMIC',
    defaultValue: ActivityType.SOCIAL,
  })
  @IsEnum(ActivityType, { message: 'El tipo debe ser SOCIAL o ACADEMIC' })
  @IsNotEmpty({ message: 'El tipo es requerido' })
  type!: ActivityType;

  @Field(() => Date, {
    description: 'Fecha (y hora) de inicio de la actividad',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  @IsDate({ message: 'Debe ser una fecha válida' })
  date!: Date;

  @Field(() => Date, {
    description:
      'Fecha (y hora) de finalización. Puede ser el día siguiente para eventos nocturnos.',
    nullable: true,
  })
  @IsOptional()
  @IsDate({ message: 'Debe ser una fecha válida' })
  finishDate?: Date;

  @Field(() => Int, { description: 'Stock / aforo de la actividad' })
  @Transform(({ value }) => Number(value))
  @IsPositive({ message: 'El stock debe ser mayor a 0' })
  @IsNotEmpty({ message: 'El stock es requerido' })
  stock!: number;

  @Field(() => String, {
    description: 'Link externo de la actividad',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.href !== undefined && o.href !== null && o.href !== '')
  @IsUrl({}, { message: 'Debe ser una url válida' })
  href?: string;

  @Field(() => Boolean, { description: 'Si la actividad tiene precio' })
  @IsNotEmpty({ message: 'El campo hasPrice es requerido' })
  @IsBoolean({ message: 'El campo hasPrice debe ser un booleano' })
  hasPrice!: boolean;

  @Field(() => Float, {
    description: 'Precio para miembros',
    nullable: true,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  price?: number;

  @Field(() => String, {
    description: 'Público objetivo: MEMBERS_ONLY | MEMBERS_AND_GUESTS | OPEN',
  })
  @IsNotEmpty({ message: 'El campo audience es requerido' })
  @IsString({ message: 'El campo audience debe ser un string' })
  @IsEnum(ActivityAudience, {
    message:
      'El campo audience debe ser MEMBERS_ONLY, MEMBERS_AND_GUESTS o OPEN',
  })
  audience!: ActivityAudience;

  @Field(() => Int, {
    description: 'Cupos disponibles para no-miembros (invitados + externos)',
    nullable: true,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.audience === ActivityAudience.MEMBERS_AND_GUESTS ||
      o.audience === ActivityAudience.OPEN,
  )
  @IsPositive({ message: 'El stock de no-miembros debe ser mayor a 0' })
  guestStock?: number;

  @Field(() => Float, {
    description: 'Precio para invitados con sponsor (invitados + externos)',
    nullable: true,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  priceInvitee?: number;

  @Field(() => Float, {
    description: 'Precio para invitados sin sponsor (solo externos)',
    nullable: true,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  priceExternal?: number;

  @Field(() => String, {
    description: 'Lugar donde se realizará la actividad',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'El lugar debe ser un string' })
  venue?: string;

  @Field(() => String, {
    description: 'Dirección del lugar de la actividad',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser un string' })
  address?: string;

  // ─── Concurrencia / Programación ───────────────────────────────────────────
  // Solo se usan cuando el evento es recurrente (ej: curso semanal un mes).
  // Para eventos de un solo bloque (incluso si cruzan la medianoche) basta con
  // date + finishDate y estos campos quedan en null.

  @Field(() => String, {
    nullable: true,
    description:
      'Descripción del patrón de asistencia (ej: "Lunes y Miércoles de 6pm a 9pm")',
  })
  @IsOptional()
  @IsString({ message: 'La concurrencia debe ser un texto' })
  concurrence?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Días y horarios estructurados en JSON. ' +
      'Ej: [{"day":"monday","startTime":"18:00","endTime":"21:00"}]. ' +
      'null para eventos de un solo bloque.',
  })
  @IsOptional()
  days?: unknown;

  @Field(() => String, {
    nullable: true,
    description: 'Patrón de hora de fin de cada sesión recurrente',
  })
  @IsOptional()
  @IsString()
  finishConcurrence?: string;

  // ─── Descuento ─────────────────────────────────────────────────────────────

  @Field(() => Boolean, { description: 'Si la actividad tiene descuento' })
  @IsNotEmpty({ message: 'El campo hasDiscount es requerido' })
  @IsBoolean({ message: 'El campo hasDiscount debe ser un booleano' })
  hasDiscount!: boolean;

  @Field(() => Float, {
    description: 'Porcentaje de descuento',
    nullable: true,
  })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  percentDiscount?: number;

  @IsOptional()
  @Field(() => RangeDiscountDates, {
    description: 'Rango de fechas para el descuento',
    nullable: true,
  })
  rangeDiscountDates?: RangeDiscountDates;

  // ─── Imágenes ──────────────────────────────────────────────────────────────

  @Field(() => [Int], {
    description: 'IDs de Media a asociar como imágenes de la actividad',
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true, message: 'Las IDs de imágenes deben ser enteros' })
  imagesIds?: number[];
}
