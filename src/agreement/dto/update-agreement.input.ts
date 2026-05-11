import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateAgreementInput } from './create-agreement.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateAgreementInput extends PartialType(CreateAgreementInput) {
  @IsNumber()
  @IsNotEmpty()
  @Field(() => Int)
  id!: number;
}
