import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class CreateSupportMessageInput {
  @IsInt()
  @Field(() => Int)
  supportId!: number;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  body!: string;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isInternal?: boolean;
}
