import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class SubmitSurveyAnswerInput {
  @IsNotEmpty()
  @IsInt()
  @Field(() => Int)
  questionId!: number;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  optionId?: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  textValue?: string;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  scaleValue?: number;
}

@InputType()
export class SubmitSurveyResponseInput {
  @IsNotEmpty()
  @IsInt()
  @Field(() => Int)
  surveyId!: number;

  @IsNotEmpty()
  @Field(() => [SubmitSurveyAnswerInput])
  answers!: SubmitSurveyAnswerInput[];
}
