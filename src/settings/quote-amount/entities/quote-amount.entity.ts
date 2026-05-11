import {
  ObjectType,
  Field,
  Int,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { Currency } from 'generated/prisma/enums';

registerEnumType(Currency, {
  name: 'Currency',
  description: 'Tipo de moneda',
});

@ObjectType()
export class QuoteAmountEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  organizationId!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Currency)
  currency!: Currency;

  @Field(() => Boolean)
  discountApply!: boolean;
}
