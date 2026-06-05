import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateSupportCategoryInput } from './create-support-category.input';

@InputType()
export class UpdateSupportCategoryInput extends PartialType(
  CreateSupportCategoryInput,
) {
  @IsInt()
  @Field(() => Int)
  id!: number;
}
