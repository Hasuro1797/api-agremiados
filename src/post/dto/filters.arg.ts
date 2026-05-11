import { ArgsType, Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PostType, Status } from 'generated/prisma/enums';
import { PaginationArgs } from 'src/common/dtos';

@InputType()
export class FiltersPostInput {
  @IsOptional()
  @IsArray()
  @IsEnum(PostType, { each: true })
  @Field(() => [String], { nullable: true })
  type?: PostType[];

  @IsOptional()
  @IsEnum(Status)
  @Field(() => String, { nullable: true })
  status?: Status;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isPinned?: boolean;
}

@ArgsType()
export class PostArgs extends PaginationArgs {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  orderBy?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @Field(() => FiltersPostInput, { nullable: true })
  filters?: FiltersPostInput;
}

@ArgsType()
export class PostArgsForWebsite extends PaginationArgs {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  sort?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  search?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  type?: string;
}
