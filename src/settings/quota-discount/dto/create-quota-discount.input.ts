import { InputType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsDate,
  Min,
  Max,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateQuotaDiscountInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @Field(() => Date)
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @Field(() => Date)
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quotesNumber?: number;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs de usuarios a los que aplica el descuento',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @Field(() => Boolean, {
    defaultValue: true,
    description: 'Si el descuento aplica para todos los usuarios',
  })
  @IsNotEmpty()
  @IsBoolean()
  applyToAllUsers!: boolean;
}
