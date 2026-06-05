import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Meta {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  totalPages!: number;
}
