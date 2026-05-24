import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

@InputType()
export class UpsertBillingConfigInput {
  @Field(() => String, { description: 'RUC del emisor (11 dígitos)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos' })
  ruc!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  razonSocial!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  comercialName?: string;

  @Field(() => String, { description: 'Usuario SOL (ej: MODDATOS)' })
  @IsString()
  @IsNotEmpty()
  solUser!: string;

  @Field(() => String, { description: 'Clave SOL' })
  @IsString()
  @IsNotEmpty()
  solPass!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Código ubigeo INEI de 6 dígitos (ej: 040101)',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, {
    message: 'El ubigeo debe tener exactamente 6 dígitos',
  })
  ubigeo?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  district?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  province?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
