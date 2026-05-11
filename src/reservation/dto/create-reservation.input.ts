import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SpaceType } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateReservationInput {
  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  title!: string;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  description?: any;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  location?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  address?: string;

  @IsOptional()
  @IsEnum(SpaceType)
  @Field(() => String, { nullable: true })
  spaceType?: SpaceType;

  @IsOptional()
  @IsNumber()
  @Field(() => Float, { nullable: true })
  pricePerHour?: number;

  @IsOptional()
  @IsNumber()
  @Field(() => Float, { nullable: true })
  price?: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Field(() => Int)
  capacity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  amenities?: string[];

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  rules?: any;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Field(() => [Int], { nullable: true })
  mediaIds?: number[];
}
