import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SurveyAnswer } from './survey-answer.entity';

@ObjectType()
export class SurveyResponse {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  surveyId!: number;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => Boolean)
  isPartial!: boolean;

  @Field(() => Date)
  completedAt!: Date;

  @Field(() => [SurveyAnswer], { nullable: true })
  answers?: SurveyAnswer[];
}
