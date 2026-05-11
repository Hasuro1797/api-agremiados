import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SurveyStatus } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersSurveyInput {
  @IsOptional()
  @IsEnum(SurveyStatus)
  @Field(() => String, { nullable: true })
  status?: SurveyStatus;
}

@ArgsType()
export class SurveyArgs extends PaginationArgs {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  orderBy?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @Field(() => FiltersSurveyInput, { nullable: true })
  filters?: FiltersSurveyInput;
}
