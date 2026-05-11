import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Discount } from 'src/common/entities/discount.entity';
import { Media } from 'src/media/entities/media.entity';

@ObjectType()
export class ActivityMedia {
  @Field(() => Int, { description: 'Id de la actividad académica' })
  activityId!: number;

  @Field(() => Int, { description: 'Id del media asociado' })
  mediaId!: number;

  @Field(() => Media, { description: 'Media asociado a la actividad' })
  media!: Media;

  @Field(() => Int, { description: 'Orden del media en la actividad' })
  order!: number;
}

@ObjectType()
export class Activity {
  @Field(() => Int, { description: 'Id de la actividad académica' })
  id!: number;

  @Field(() => String, { description: 'Título de la actividad académica' })
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { description: 'Tipo de actividad: SOCIAL o ACADEMIC' })
  type!: string;

  @Field(() => Date)
  date!: Date;

  @Field(() => Date, { nullable: true })
  finishDate?: Date;

  @Field(() => Int)
  stock!: number;

  @Field(() => Int, { description: 'Cupos usados' })
  stockUsed!: number;

  @Field(() => String, {
    description: 'Público objetivo: MEMBERS_ONLY | MEMBERS_AND_GUESTS | OPEN',
  })
  audience!: string;

  @Field(() => Int, {
    description: 'Stock disponible para participantes externos',
    nullable: true,
  })
  guestStock?: number;

  @Field(() => String, { nullable: true })
  href?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Precio para participantes externos',
  })
  priceInvitee?: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Precio para participantes externos sin sponsor',
  })
  priceExternal?: number;

  @Field(() => String, { nullable: true })
  venue?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => Boolean)
  hasPrice!: boolean;

  @Field(() => Boolean, {
    description: 'Si la actividad ya fue pagada / liquidada',
  })
  isPaid!: boolean;

  /**
   * Concurrencia: describe el patrón de asistencia recurrente.
   * Ej: "Lunes y Miércoles de 6pm a 9pm", null si es un evento de un solo bloque.
   */
  @Field(() => String, {
    nullable: true,
    description:
      'Descripción del patrón de asistencia (ej: "Lunes y Miércoles 6pm-9pm")',
  })
  concurrence?: string;

  /**
   * days: JSON con el detalle estructurado de días y horarios para eventos recurrentes.
   * Ej: [{ "day": "monday", "startTime": "18:00", "endTime": "21:00" }]
   * null si es evento de un solo bloque o nocturno (fecha/hora cubierta por date + finishDate).
   */
  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Días y horarios estructurados para eventos recurrentes (JSON)',
  })
  days?: unknown;

  @Field(() => String, {
    nullable: true,
    description: 'Patrón de finalización de la concurrencia',
  })
  finishConcurrence?: string;

  @Field(() => [ActivityMedia], { nullable: true })
  images?: ActivityMedia[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  status!: string;

  @Field(() => [Discount], { nullable: true })
  discounts?: Discount[];
}
