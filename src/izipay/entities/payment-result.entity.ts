import { Field, ObjectType } from '@nestjs/graphql';
import { InvoiceStatus } from 'generated/prisma/enums';
import '../../invoice/entities/invoice.enums';

@ObjectType()
export class PaymentResultEntity {
  @Field(() => InvoiceStatus, { description: 'Estado final del comprobante' })
  status!: InvoiceStatus;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => Boolean, { description: 'true si el pago fue aprobado' })
  approved!: boolean;

  @Field(() => String, {
    description: 'Mensaje legible para mostrar al usuario',
  })
  message!: string;
}
