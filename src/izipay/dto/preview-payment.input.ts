import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ActivityGuestInput } from './generate-payment-token.input';
import { PaymentTargetType } from './payment-target.enum';

@InputType()
export class PreviewPaymentInput {
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
      'Invitados para previsualizar (solo ACTIVITY). Solo se usa la cantidad y precio configurado; no se validan documentos.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityGuestInput)
  guests?: ActivityGuestInput[];
}
