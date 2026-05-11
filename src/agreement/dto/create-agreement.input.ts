import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { AgreementCategory, Status } from 'generated/prisma/enums';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class ContactInfoInput {
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  name?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  email?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  phone?: string;
}

@InputType()
export class CreateAgreementInput {
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
  @ValidateIf((o) => o.href !== undefined && o.href !== null && o.href !== '')
  @IsUrl({}, { message: 'URL del convenio inválida' })
  @Field(() => String, { nullable: true })
  href?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  partnerName?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  partnerLogo?: string;

  @IsOptional()
  @IsString()
  @ValidateIf(
    (o) =>
      o.partnerWebsite !== undefined &&
      o.partnerWebsite !== null &&
      o.partnerWebsite !== '',
  )
  @IsUrl({}, { message: 'URL del socio inválida' })
  @Field(() => String, { nullable: true })
  partnerWebsite?: string;

  @IsOptional()
  @Field(() => ContactInfoInput, { nullable: true })
  contactInfo?: ContactInfoInput;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  benefitSummary?: string;

  @IsOptional()
  @IsEnum(AgreementCategory)
  @Field(() => String, { nullable: true })
  category?: AgreementCategory;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  validFrom?: Date;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  validUntil?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(Status)
  @Field(() => String, { nullable: true })
  status?: Status;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  publishedAt?: Date;
}
