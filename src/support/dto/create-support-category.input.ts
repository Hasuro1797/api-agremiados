import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Priority } from 'generated/prisma/enums';
import '../entities/support.enums';

@InputType()
export class CreateSupportCategoryInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  name!: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  icon?: string;

  @IsOptional()
  @IsEnum(Priority)
  @Field(() => Priority, { nullable: true })
  defaultPriority?: Priority;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  slaDays?: number;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  order?: number;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
