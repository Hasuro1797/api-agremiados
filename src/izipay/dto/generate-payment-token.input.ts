import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from 'generated/prisma/enums';
import '../../invoice/entities/invoice.enums';
import { PaymentTargetType } from './payment-target.enum';

@InputType()
export class ActivityGuestInput {
  @Field(() => DocumentType)
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @Field(() => String)
  @IsString()
  documentNumber!: string;

  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String)
  @IsString()
  lastname!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;
}

@InputType()
export class GeneratePaymentTokenInput {
  @Field(() => PaymentTargetType)
  @IsEnum(PaymentTargetType)
  target!: PaymentTargetType;

  @Field(() => Int, {
    nullable: true,
    description: 'Activity.id — requerido cuando target = ACTIVITY',
  })
  @IsOptional()
  @IsInt()
  targetId?: number;

  @Field(() => [Int], {
    nullable: true,
    description:
      'Lista de QuotaPayment.id — requerido cuando target = QUOTA (1 o varias)',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  quotaPaymentIds?: number[];

  @Field(() => [ActivityGuestInput], {
    nullable: true,
    description:
      'Invitados que el miembro paga junto a su inscripción (solo ACTIVITY, audiencia que admita invitados)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityGuestInput)
  guests?: ActivityGuestInput[];

  // --- Datos de facturación opcionales (para emitir FACTURA con RUC) ---
  @Field(() => DocumentType, {
    nullable: true,
    description:
      'Si se omite, se usa el documento del usuario (genera BOLETA). RUC genera FACTURA.',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8,11}$/, {
    message: 'documentNumber debe tener entre 8 y 11 dígitos',
  })
  documentNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  clientName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingAddress?: string;
}
