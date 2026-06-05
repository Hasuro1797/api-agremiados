import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Currency } from 'generated/prisma/enums';

@InputType()
export class CreateQuoteAmountInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  description!: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  organizationId!: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @Field(() => Currency, { nullable: true, defaultValue: Currency.PEN })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  discountApply?: boolean;
}
