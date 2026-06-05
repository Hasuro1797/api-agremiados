import { Field, Float, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class PaymentTokenEntity {
  @Field(() => String, {
    description: 'Token de sesión para el formulario Izipay',
  })
  token!: string;

  @Field(() => String, { description: 'transactionId a usar en el callback' })
  transactionId!: string;

  @Field(() => String, { description: 'orderNumber del comprobante generado' })
  orderNumber!: string;

  @Field(() => String, { description: 'ID del InvoiceHeader creado' })
  invoiceId!: string;

  @Field(() => Float, {
    description: 'Importe a cobrar (moneda mayor, ej. soles)',
  })
  amount!: number;

  @Field(() => String, {
    description: 'Importe en céntimos enviado a Izipay (string)',
  })
  amountCents!: string;

  @Field(() => Date, {
    description: 'Momento en que expira la reserva/token (15 minutos)',
  })
  expiresAt!: Date;

  @Field(() => Boolean, {
    description: 'true si se reutilizó una reserva PENDIENTE existente',
  })
  reused!: boolean;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Respuesta cruda de Izipay (por si el SDK frontend la necesita)',
  })
  raw?: unknown;
}
