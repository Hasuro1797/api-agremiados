import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateMemberInput } from './create-member.input';

@InputType()
export class UpdateMemberInput extends PartialType(CreateMemberInput) {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
