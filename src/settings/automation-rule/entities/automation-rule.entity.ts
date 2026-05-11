import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { AutomationTrigger } from 'generated/prisma/enums';

registerEnumType(AutomationTrigger, {
  name: 'AutomationTrigger',
  description: 'Evento que dispara la regla de automatización',
});

@ObjectType()
export class AutomationRuleEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => AutomationTrigger)
  trigger!: AutomationTrigger;

  @Field(() => GraphQLJSON)
  config!: unknown;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date, { nullable: true })
  lastRunAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
