import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  Currency,
  DocumentType,
  InvoiceStatus,
  SaleCondition,
  SunatDocType,
  SunatStatus,
} from 'generated/prisma/enums';
import { Meta } from 'src/common/entities/meta.entity';
import './invoice.enums';
import { InvoiceDetailEntity } from './invoice-detail.entity';
import { PaymentTransactionEntity } from './payment-transaction.entity';
import { BillingDocumentEntity } from './billing-document.entity';

@ObjectType()
export class InvoiceHeaderEntity {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => Date)
  issueDate!: Date;

  @Field(() => InvoiceStatus)
  status!: InvoiceStatus;

  // --- Cliente ---
  @Field(() => String, { nullable: true })
  clientName?: string;

  @Field(() => DocumentType)
  documentType!: DocumentType;

  @Field(() => String, { nullable: true })
  documentNumber?: string;

  @Field(() => String, { nullable: true })
  billingAddress?: string;

  @Field(() => SaleCondition)
  saleCondition!: SaleCondition;

  @Field(() => Currency)
  currency!: Currency;

  @Field(() => Float, { nullable: true })
  exchangeRate?: number;

  @Field(() => String, { nullable: true })
  observations?: string;

  // --- SUNAT ---
  @Field(() => SunatStatus)
  sunatStatus!: SunatStatus;

  @Field(() => SunatDocType, { nullable: true })
  sunatDocType?: SunatDocType;

  @Field(() => String, { nullable: true })
  series?: string;

  @Field(() => String, { nullable: true })
  sequential?: string;

  @Field(() => Date, { nullable: true })
  sunatEmissionDate?: Date;

  // --- NC/ND: referencia al comprobante original ---
  @Field(() => String, { nullable: true })
  referenceInvoiceId?: string;

  @Field(() => String, { nullable: true })
  creditDebitReasonCode?: string;

  @Field(() => String, { nullable: true })
  creditDebitReasonDescription?: string;

  // --- Respuesta SUNAT ---
  @Field(() => String, { nullable: true })
  sunatResponseCode?: string;

  @Field(() => String, { nullable: true })
  sunatDescription?: string;

  @Field(() => Int)
  sunatAttempts!: number;

  @Field(() => Date, { nullable: true })
  sunatSentAt?: Date;

  // --- Totales tributarios ---
  @Field(() => Float, { nullable: true })
  totalTaxable?: number;

  @Field(() => Float, { nullable: true })
  totalExempt?: number;

  @Field(() => Float, { nullable: true })
  totalUnaffected?: number;

  @Field(() => Float, { nullable: true })
  totalFree?: number;

  @Field(() => Float, { nullable: true })
  totalIgv?: number;

  @Field(() => Float, { nullable: true })
  totalIsc?: number;

  @Field(() => Float, { nullable: true })
  totalOtherCharges?: number;

  @Field(() => Float, {
    description: 'Importe total a pagar (suma de bases + IGV + otros cargos)',
  })
  total!: number;

  // --- Anulación interna ---
  @Field(() => Date, { nullable: true })
  voidedAt?: Date;

  @Field(() => String, { nullable: true })
  voidedBy?: string;

  @Field(() => String, { nullable: true })
  voidReason?: string;

  // --- Relaciones ---
  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => [InvoiceDetailEntity])
  details!: InvoiceDetailEntity[];

  @Field(() => PaymentTransactionEntity, { nullable: true })
  transaction?: PaymentTransactionEntity;

  @Field(() => [BillingDocumentEntity], { nullable: true })
  billingDocuments?: BillingDocumentEntity[];

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class PaginatedInvoices {
  @Field(() => [InvoiceHeaderEntity])
  data!: InvoiceHeaderEntity[];

  @Field(() => Meta)
  meta!: Meta;
}
