import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationArgs } from 'src/common/dtos/pagination.args';
import { Status } from 'generated/prisma/enums';

@InputType()
export class QuotaDiscountFiltersInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

@ArgsType()
export class QuotaDiscountFilterArgs extends PaginationArgs {
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => QuotaDiscountFiltersInput, { nullable: true })
  @IsOptional()
  filters?: QuotaDiscountFiltersInput;
}
