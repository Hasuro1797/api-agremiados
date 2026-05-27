import { Field, Float, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  CancellationStatus,
  CancellationType,
  Currency,
} from 'generated/prisma/enums';
import './invoice.enums';

@ObjectType()
export class PaymentCancellationEntity {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  paymentTransactionId!: string;

  @Field(() => CancellationType)
  type!: CancellationType;

  @Field(() => CancellationStatus)
  status!: CancellationStatus;

  @Field(() => Float)
  amount!: number;

  @Field(() => Currency)
  currency!: Currency;

  @Field(() => String, { nullable: true })
  izipayOperationId?: string;

  @Field(() => String, { nullable: true })
  responseCode?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawResponse?: unknown;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Id de la Nota de Crédito que originó la devolución, si aplica',
  })
  creditNoteId?: string;

  @Field(() => String, { nullable: true })
  performedBy?: string;

  @Field(() => Date)
  createdAt!: Date;
}
