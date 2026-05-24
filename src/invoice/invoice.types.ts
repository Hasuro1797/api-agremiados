import { Prisma } from 'generated/prisma/client';
import {
  Currency,
  DocumentType,
  InvoiceItemType,
  SaleCondition,
} from 'generated/prisma/enums';

/** Una línea normalizada lista para crear un InvoiceDetail. */
export interface CreateInvoiceLine {
  description: string;
  quantity: number;
  /** Valor unitario SIN IGV (base imponible por unidad). */
  valorUnitario: number;
  /** Catálogo 07 SUNAT. Default '10' (gravado oneroso). */
  tipoAfectacionIgv?: string;
  /** Unidad de medida SUNAT. Default 'NIU'. */
  unitOfMeasure?: string;
  /** Descuento absoluto sobre la línea. Default 0. */
  discount?: number;
  itemType: InvoiceItemType;
  itemId?: string | null;
}

/** Datos normalizados para crear un comprobante interno (header + detalles). */
export interface CreateInvoiceData {
  userId?: string | null;
  clientName?: string | null;
  documentType?: DocumentType;
  documentNumber?: string | null;
  billingAddress?: string | null;
  saleCondition?: SaleCondition;
  currency?: Currency;
  exchangeRate?: number | null;
  observations?: string | null;
  lines: CreateInvoiceLine[];
  metadata?: Prisma.InputJsonValue;
}
