import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@ObjectType()
export class Survey {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  status!: string;

  @Field(() => Boolean)
  isAnonymous!: boolean;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Boolean)
  allowMultiple!: boolean;

  @Field(() => [SurveyQuestion], { nullable: true })
  questions?: SurveyQuestion[];

  @Field(() => [SurveyResponse], { nullable: true })
  responses?: SurveyResponse[];

  @Field(() => Int, { nullable: true })
  _count?: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
