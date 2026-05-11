import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateQuotaDiscountInput } from './create-quota-discount.input';

@InputType()
export class UpdateQuotaDiscountInput extends PartialType(
  CreateQuotaDiscountInput,
) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  id!: number;
}
