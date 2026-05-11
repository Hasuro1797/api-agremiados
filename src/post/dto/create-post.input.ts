import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PostType, Status } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreatePostInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  title!: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  slug?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  content?: any;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  contentHtml?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  href?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  author?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  tags?: string[];

  @IsNotEmpty()
  @IsEnum(PostType)
  @Field(() => String)
  type!: PostType;

  @IsOptional()
  @IsEnum(Status)
  @Field(() => String, { nullable: true })
  status?: Status;

  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  isPinned?: boolean;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  publishedAt?: Date;
}
