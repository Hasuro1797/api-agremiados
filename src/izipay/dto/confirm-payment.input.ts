import { Field, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class ConfirmPaymentInput {
  @Field(() => String, {
    description: 'transactionId generado por el backend al solicitar el token',
  })
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Firma (hash) que devuelve Izipay para validar el payload',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @Field(() => String, {
    nullable: true,
    description: 'String firmado por Izipay (payloadHttp) para validar la firma',
  })
  @IsOptional()
  @IsString()
  payloadHttp?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Respuesta cruda del formulario Izipay (para auditoría)',
  })
  @IsOptional()
  answer?: Record<string, unknown>;
}
