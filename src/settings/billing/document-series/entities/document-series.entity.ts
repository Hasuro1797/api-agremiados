import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SunatDocType } from 'generated/prisma/enums';

registerEnumType(SunatDocType, {
  name: 'SunatDocType',
  description: 'Tipo de comprobante electrónico SUNAT',
  valuesMap: {
    FACTURA: { description: '01 - Factura' },
    BOLETA: { description: '03 - Boleta de venta' },
    NOTA_CREDITO: { description: '07 - Nota de crédito' },
    NOTA_DEBITO: { description: '08 - Nota de débito' },
  },
});

@ObjectType()
export class DocumentSeriesEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  billingConfigId!: number;

  @Field(() => SunatDocType)
  tipoDoc!: SunatDocType;

  @Field(() => String, { description: 'Serie del comprobante (ej: F001, B001)' })
  serie!: string;

  @Field(() => Int, { description: 'Próximo correlativo a usar' })
  correlativo!: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Boolean, {
    description:
      'true cuando se superó el correlativo máximo SUNAT (99,999,999). Debe crearse una serie nueva.',
  })
  isExhausted!: boolean;

  @Field(() => Boolean, {
    description:
      'true cuando faltan menos de 1000 comprobantes para agotar la serie (warning para el admin).',
  })
  isNearExhaustion!: boolean;

  @Field(() => Int, {
    description: 'Cantidad de comprobantes que aún pueden emitirse en esta serie.',
  })
  remainingCapacity!: number;
}
