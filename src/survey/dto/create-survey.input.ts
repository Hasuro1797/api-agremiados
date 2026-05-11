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
import { QuestionType } from 'generated/prisma/enums';

@InputType()
export class CreateSurveyOptionInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true })
  order?: number;
}

@InputType()
export class CreateSurveyQuestionInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  text!: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @Field(() => String)
  type!: QuestionType;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true })
  order?: number;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  scaleMin?: number;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  scaleMax?: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  scaleMinLabel?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  scaleMaxLabel?: string;

  @IsOptional()
  @Field(() => [CreateSurveyOptionInput], { nullable: true })
  options?: CreateSurveyOptionInput[];
}

@InputType()
export class CreateSurveyInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  title!: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isAnonymous?: boolean;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  allowMultiple?: boolean;

  @IsOptional()
  @Field(() => [CreateSurveyQuestionInput], { nullable: true })
  questions?: CreateSurveyQuestionInput[];
}
