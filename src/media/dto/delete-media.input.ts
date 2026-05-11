import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsPositive, IsString } from 'class-validator';

@InputType()
export class DeleteMediaInput {
  @Field(() => Int, { description: 'Id of media' })
  @IsNotEmpty()
  @IsPositive()
  id!: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsNotEmpty()
  public_id!: string;
}
