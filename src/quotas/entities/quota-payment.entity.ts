import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { PaymentStatus } from 'generated/prisma/enums';
import 'src/invoice/entities/invoice.enums';

@ObjectType()
export class QuotaPeriodEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  year!: number;

  @Field(() => Int)
  month!: number;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date)
  dueDate!: Date;
}

@ObjectType()
export class QuotaPaymentEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  userId!: string;

  @Field(() => Int)
  periodId!: number;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @Field(() => String, { nullable: true })
  invoiceId?: string;

  @Field(() => QuotaPeriodEntity)
  period!: QuotaPeriodEntity;

  @Field(() => Boolean, {
    description: 'true si el periodo ya venció (dueDate < hoy) y sigue impago',
  })
  isOverdue!: boolean;
}
