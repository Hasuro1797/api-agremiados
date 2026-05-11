import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateQuoteAmountInput } from './create-quote-amount.input';

@InputType()
export class UpdateQuoteAmountInput extends PartialType(
  CreateQuoteAmountInput,
) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  id!: number;
}
