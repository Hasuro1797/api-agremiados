import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@ArgsType()
export class ActiveMembersInput {
  @IsOptional()
  @Field(() => Int, { nullable: true })
  page?: number;
  @IsOptional()
  @Field(() => Int, { nullable: true })
  pageSize?: number;
}
