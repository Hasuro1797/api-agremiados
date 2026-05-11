import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DiscountTargetType } from 'generated/prisma/enums';

registerEnumType(DiscountTargetType, {
  name: 'DiscountTargetType',
  description: 'Define a quién aplica el descuento',
});

@ObjectType()
export class Discount {
  @Field(() => Int)
  id!: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Number)
  percentage!: number;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Int, { nullable: true })
  quotesNumber?: number;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  status!: string;

  @Field(() => DiscountTargetType)
  targetType!: DiscountTargetType;

  @Field(() => [String], {
    nullable: true,
    description:
      'Categorías de miembros objetivo cuando targetType=BY_CATEGORY (ej: ["JUBILADO"])',
  })
  targetCategories?: string[];
}
