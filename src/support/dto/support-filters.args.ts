import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Priority, SupportStatus } from 'generated/prisma/enums';

@ArgsType()
export class SupportFiltersArgs {
  @IsOptional()
  @IsEnum(SupportStatus)
  @Field(() => String, { nullable: true })
  status?: SupportStatus;

  @IsOptional()
  @IsEnum(Priority)
  @Field(() => String, { nullable: true })
  priority?: Priority;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  pageSize?: number;
}
