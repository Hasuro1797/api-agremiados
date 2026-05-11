import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  IsUrl,
} from 'class-validator';

@InputType()
export class UpdateOrganizationInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Color primario en hex (#RRGGBB). primaryLight se genera automáticamente.',
  })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor debe ser un color hexadecimal válido (ej: #232c57)',
  })
  primaryColor?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Color de acento en hex (#RRGGBB). accentHover se genera automáticamente.',
  })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'accentColor debe ser un color hexadecimal válido (ej: #FF7043)',
  })
  accentColor?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'email debe ser un correo electrónico válido' })
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'website debe ser una URL válida' })
  website?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  socialMedia?: unknown;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  footerText?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  footerLinks?: unknown;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleEvents?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleReservations?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleSurveys?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleSupport?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleAgreements?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moduleQuotes?: boolean;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  moraGraceDays?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  moraReminderDays?: unknown;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  moraAutoBlock?: boolean;

  @Field(() => Number, {
    nullable: true,
    description: 'Día del mes en que vence la cuota (1-28)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  quotaDueDay?: number;
}
