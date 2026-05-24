import { Field, Float, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { Currency, PaymentStatus } from 'generated/prisma/enums';
import './invoice.enums';

@ObjectType()
export class PaymentTransactionEntity {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  invoiceId!: string;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field(() => String)
  transactionId!: string;

  @Field(() => String, { nullable: true })
  authorizationCode?: string;

  @Field(() => String, { nullable: true })
  paymentMethod?: string;

  @Field(() => String, { nullable: true })
  cardBrand?: string;

  @Field(() => String, { nullable: true })
  cardLast4?: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Currency)
  currency!: Currency;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawData?: unknown;

  @Field(() => Date, { nullable: true })
  processedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;
}
