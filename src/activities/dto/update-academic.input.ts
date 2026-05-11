import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { CreateActivityInput } from './create-activity.input';

@InputType()
export class UpdateActivityInput extends PartialType(CreateActivityInput) {
  @Field(() => Int)
  @IsNotEmpty()
  id!: number;
}
