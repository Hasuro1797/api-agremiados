import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class DiscountUserEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  discountId!: number;

  @Field(() => String)
  userId!: string;
}

@ObjectType()
export class QuotaDiscountEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Float)
  percentage!: number;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Int, { nullable: true })
  quotesNumber?: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String, {
    description:
      'Tipo de descuento: ALL (aplica a todos los usuarios) o SPECIFIC (aplica a usuarios específicos)',
  })
  targetType!: string;

  @Field(() => [DiscountUserEntity], { nullable: true })
  users?: DiscountUserEntity[];
}
