import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QuotaSummary {
  @Field(() => Int)
  totalPeriods!: number;

  @Field(() => Int)
  pendingCount!: number;

  @Field(() => Int)
  paidCount!: number;

  @Field(() => Int)
  overdueCount!: number;

  @Field(() => Float)
  totalOwed!: number;

  @Field(() => Float)
  totalOverdue!: number;
}
