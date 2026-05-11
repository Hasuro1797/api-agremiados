import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserInput } from './create-user.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => String)
  id!: string;
}
