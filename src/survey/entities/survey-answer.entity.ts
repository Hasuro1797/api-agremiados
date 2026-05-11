import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SurveyAnswer {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  responseId!: number;

  @Field(() => Int)
  questionId!: number;

  @Field(() => Int, { nullable: true })
  optionId?: number;

  @Field(() => String, { nullable: true })
  textValue?: string;

  @Field(() => Int, { nullable: true })
  scaleValue?: number;
}
