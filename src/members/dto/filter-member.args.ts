import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemberCategory, UserStatus } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersMemberInput {
  @Field(() => String, {
    nullable: true,
    description: 'Filtrar por estado del agremiado',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Filtrar por categoría del agremiado',
  })
  @IsOptional()
  @IsEnum(MemberCategory)
  memberCategory?: MemberCategory;
}

@ArgsType()
export class FilterMemberArgs extends PaginationArgs {
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => FiltersMemberInput, { nullable: true })
  @IsOptional()
  filters?: FiltersMemberInput;
}
