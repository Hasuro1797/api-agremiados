import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class OptionResult {
  @Field(() => Int)
  optionId!: number;

  @Field(() => String)
  text!: string;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  percentage!: number;
}

@ObjectType()
export class QuestionResult {
  @Field(() => Int)
  questionId!: number;

  @Field(() => String)
  text!: string;

  @Field(() => String)
  type!: string;

  @Field(() => Int)
  totalAnswers!: number;

  @Field(() => [OptionResult], { nullable: true })
  optionResults?: OptionResult[];

  @Field(() => [String], { nullable: true })
  textResponses?: string[];

  @Field(() => Float, { nullable: true })
  scaleAverage?: number;
}

@ObjectType()
export class SurveyResults {
  @Field(() => Int)
  surveyId!: number;

  @Field(() => String)
  title!: string;

  @Field(() => Int)
  totalResponses!: number;

  @Field(() => [QuestionResult])
  questionResults!: QuestionResult[];
}
