import { ArgsType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { PaginationArgs } from 'src/common/dtos';

@ArgsType()
export class FilterUserArgs extends PaginationArgs {
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
