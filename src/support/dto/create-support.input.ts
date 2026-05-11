import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

@InputType()
export class CreateSupportInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  topic!: string;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  details!: string;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  place!: string;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  subjectDescription?: string;

  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  subjectUserId?: string;
}
