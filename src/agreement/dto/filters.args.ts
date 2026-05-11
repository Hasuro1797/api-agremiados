import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgreementCategory, Status } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersAgreementInput {
  @IsOptional()
  @IsEnum(Status)
  @Field(() => String, { nullable: true })
  status?: Status;

  @IsOptional()
  @IsEnum(AgreementCategory)
  @Field(() => String, { nullable: true })
  category?: AgreementCategory;
}

@ArgsType()
export class AgreementArgs extends PaginationArgs {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  orderBy?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @Field(() => FiltersAgreementInput, { nullable: true })
  filters?: FiltersAgreementInput;
}
