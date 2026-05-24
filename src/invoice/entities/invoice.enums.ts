import { registerEnumType } from '@nestjs/graphql';
import {
  BillingDocType,
  DocumentType,
  InvoiceItemType,
  InvoiceStatus,
  PaymentStatus,
  SaleCondition,
  SunatStatus,
} from 'generated/prisma/enums';

// Currency y SunatDocType ya se registran en otros módulos; aquí solo los nuevos.

registerEnumType(InvoiceStatus, {
  name: 'InvoiceStatus',
  description: 'Estado interno del comprobante / orden de pago',
});

registerEnumType(SunatStatus, {
  name: 'SunatStatus',
  description: 'Estado del envío del comprobante a SUNAT',
});

registerEnumType(SaleCondition, {
  name: 'SaleCondition',
  description: 'Condición de venta: CONTADO o CREDITO',
});

registerEnumType(DocumentType, {
  name: 'DocumentType',
  description: 'Tipo de documento de identidad del cliente',
});

registerEnumType(InvoiceItemType, {
  name: 'InvoiceItemType',
  description: 'Entidad que origina la línea del comprobante',
});

registerEnumType(BillingDocType, {
  name: 'BillingDocType',
  description: 'Tipo de archivo de facturación (XML firmado, CDR, PDF)',
});

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Estado del pago',
});
