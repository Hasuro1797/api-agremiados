import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

@InputType()
export class VoidInvoiceInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @Field(() => String, { description: 'Motivo de la anulación interna' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

@InputType()
export class CreateCreditNoteInput {
  @Field(() => String, { description: 'ID del comprobante original (aceptado)' })
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @Field(() => String, {
    description:
      'Catálogo 09 SUNAT: 01=Anulación de la operación, 06=Devolución total, 07=Devolución por ítem, etc.',
  })
  @IsString()
  @Matches(/^\d{2}$/, { message: 'reasonCode debe ser un código de 2 dígitos' })
  reasonCode!: string;

  @Field(() => String, { description: 'Sustento / descripción del motivo' })
  @IsString()
  @IsNotEmpty()
  reasonDescription!: string;
}
