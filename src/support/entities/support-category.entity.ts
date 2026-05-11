import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Priority } from 'generated/prisma/enums';

@ObjectType()
export class SupportCategory {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => String)
  defaultPriority!: Priority;

  @Field(() => Int, { nullable: true })
  slaDays?: number;

  @Field(() => Int)
  order!: number;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
