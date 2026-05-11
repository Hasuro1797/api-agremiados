import { ObjectType, Field } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { QuotaDiscountEntity } from './quota-discount.entity';

@ObjectType()
export class QuotaDiscountsEntity {
  @Field(() => [QuotaDiscountEntity])
  discounts!: QuotaDiscountEntity[];

  @Field(() => Meta)
  meta!: Meta;
}
