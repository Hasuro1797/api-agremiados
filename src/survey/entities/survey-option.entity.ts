import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SurveyOption {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  questionId!: number;

  @Field(() => String)
  text!: string;

  @Field(() => Int)
  order!: number;
}
