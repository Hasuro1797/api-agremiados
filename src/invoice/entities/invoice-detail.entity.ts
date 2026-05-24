import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { InvoiceItemType } from 'generated/prisma/enums';
import './invoice.enums';

@ObjectType()
export class InvoiceDetailEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  invoiceId!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => String)
  unitOfMeasure!: string;

  @Field(() => Float)
  discount!: number;

  @Field(() => Int)
  quantity!: number;

  @Field(() => InvoiceItemType)
  itemType!: InvoiceItemType;

  @Field(() => String, { nullable: true })
  itemId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Catálogo 07 SUNAT: 10=gravado, 20=exonerado, 30=inafecto',
  })
  taxAffectation?: string;

  @Field(() => Float, { nullable: true })
  igv?: number;

  @Field(() => Float, { nullable: true })
  unitPriceWithoutIgv?: number;
}
