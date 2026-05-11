import { ObjectType, Field, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class NotificationTemplateEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  subject!: string;

  @Field(() => String)
  body!: string;

  @Field(() => String, { nullable: true })
  shortBody?: string;

  @Field(() => GraphQLJSON)
  channels!: string[];

  @Field(() => Boolean)
  isCritical!: boolean;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
