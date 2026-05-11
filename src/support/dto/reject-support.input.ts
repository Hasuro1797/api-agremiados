import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class RejectSupportInput {
  @IsInt()
  @Field(() => Int)
  supportId!: number;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  rejectReason!: string;
}
