import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SurveyOption } from './survey-option.entity';

@ObjectType()
export class SurveyQuestion {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  surveyId!: number;

  @Field(() => String)
  text!: string;

  @Field(() => String)
  type!: string;

  @Field(() => Boolean)
  isRequired!: boolean;

  @Field(() => Int)
  order!: number;

  @Field(() => Int, { nullable: true })
  scaleMin?: number;

  @Field(() => Int, { nullable: true })
  scaleMax?: number;

  @Field(() => String, { nullable: true })
  scaleMinLabel?: string;

  @Field(() => String, { nullable: true })
  scaleMaxLabel?: string;

  @Field(() => [SurveyOption], { nullable: true })
  options?: SurveyOption[];
}
