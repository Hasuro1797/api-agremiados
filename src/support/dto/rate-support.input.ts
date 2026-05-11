import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType()
export class RateSupportInput {
  @IsInt()
  @Field(() => Int)
  supportId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @Field(() => Int)
  rating!: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  comment?: string;
}
