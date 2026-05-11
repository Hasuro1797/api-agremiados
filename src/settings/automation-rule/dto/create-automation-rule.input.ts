import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { AutomationTrigger } from 'generated/prisma/enums';

@InputType()
export class CreateAutomationRuleInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => AutomationTrigger)
  @IsNotEmpty()
  @IsEnum(AutomationTrigger)
  trigger!: AutomationTrigger;

  @Field(() => GraphQLJSON)
  @IsNotEmpty()
  config!: unknown;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
