import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateAutomationRuleInput } from './create-automation-rule.input';

@InputType()
export class UpdateAutomationRuleInput extends PartialType(
  CreateAutomationRuleInput,
) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  id!: number;
}
