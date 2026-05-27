import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Currency } from 'generated/prisma/enums';

@ObjectType()
export class PreviewLineEntity {
  @Field(() => String, {
    description:
      'Etiqueta legible. Ej: "Cuota 4/2025", "Inscripción: Curso X", "Invitados".',
  })
  label!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float, { description: 'Precio unitario (sin descuento)' })
  unitAmount!: number;

  @Field(() => Float, {
    description: 'Importe de la línea = quantity × unitAmount (sin descuento)',
  })
  amount!: number;
}

@ObjectType()
export class PreviewDiscountEntity {
  @Field(() => Float, { description: 'Monto total descontado' })
  amount!: number;

  @Field(() => Float, { description: 'Porcentaje aplicado (0–100)' })
  percentage!: number;

  @Field(() => String, {
    description:
      'Nombre legible del descuento aplicado (descripción del Discount o un fallback).',
  })
  name!: string;
}

@ObjectType()
export class PreviewIgvEntity {
  @Field(() => Float, { description: 'Monto del IGV incluido en el total' })
  amount!: number;

  @Field(() => Float, { description: 'Tasa aplicada (ej. 0.18)' })
  rate!: number;
}

@ObjectType()
export class PaymentPreviewEntity {
  @Field(() => Float, {
    description: 'Suma de líneas a precio de catálogo, antes de descuentos.',
  })
  subtotal!: number;

  @Field(() => PreviewDiscountEntity, {
    nullable: true,
    description:
      'Descuento ganador. null si no aplica ningún descuento vigente.',
  })
  discount?: PreviewDiscountEntity | null;

  @Field(() => PreviewIgvEntity, {
    nullable: true,
    description:
      'Desglose del IGV incluido en el total. null para cuotas (exoneradas).',
  })
  igv?: PreviewIgvEntity | null;

  @Field(() => Float, {
    description:
      'Importe que se cobrará efectivamente (mismo valor que generatePaymentToken.amount).',
  })
  total!: number;

  @Field(() => Currency, { description: 'Moneda del cobro' })
  currency!: Currency;

  @Field(() => [PreviewLineEntity], {
    description: 'Desglose por ítem para mostrar al usuario',
  })
  lines!: PreviewLineEntity[];

  @Field(() => [String], {
    description:
      'Avisos no bloqueantes (ej. cuotas ya pagadas que fueron filtradas).',
  })
  warnings!: string[];
}
