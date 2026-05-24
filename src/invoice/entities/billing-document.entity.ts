import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BillingDocType } from 'generated/prisma/enums';
import './invoice.enums';

@ObjectType()
export class BillingDocumentEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  invoiceId!: string;

  @Field(() => BillingDocType)
  type!: BillingDocType;

  @Field(() => String)
  url!: string;

  @Field(() => String, { nullable: true })
  format?: string;

  @Field(() => Int, { nullable: true })
  bytes?: number;

  @Field(() => String, { nullable: true })
  originalName?: string;

  @Field(() => Date)
  createdAt!: Date;
}
