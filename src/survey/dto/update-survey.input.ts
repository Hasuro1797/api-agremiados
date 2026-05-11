import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { QuestionType } from 'generated/prisma/enums';
import { CreateSurveyInput } from './create-survey.input';

@InputType()
export class UpdateSurveyOptionInput {
  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  id?: number;

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
export class UpdateSurveyQuestionInput {
  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  id?: number;

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
  @Field(() => [UpdateSurveyOptionInput], { nullable: true })
  options?: UpdateSurveyOptionInput[];
}

@InputType()
export class UpdateSurveyInput extends PartialType(CreateSurveyInput) {
  @IsNotEmpty()
  @Field(() => Int)
  id!: number;

  @IsOptional()
  @Field(() => [UpdateSurveyQuestionInput], { nullable: true })
  declare questions?: UpdateSurveyQuestionInput[];
}
