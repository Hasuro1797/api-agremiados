-- CreateEnum
CREATE TYPE "SunatDocType" AS ENUM ('FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO');

-- CreateEnum
CREATE TYPE "SunatStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'SIGNED', 'SENT', 'ACCEPTED', 'OBSERVED', 'REJECTED', 'ERROR', 'VOIDED');

-- CreateEnum
CREATE TYPE "BillingDocType" AS ENUM ('XML_SIGNED', 'CDR_ZIP', 'PDF');

-- AlterTable
ALTER TABLE "invoice_details" ADD COLUMN     "igv" DOUBLE PRECISION,
ADD COLUMN     "precioUnitarioSinIgv" DOUBLE PRECISION,
ADD COLUMN     "tipoAfectacion" TEXT;

-- AlterTable
ALTER TABLE "invoice_headers" ADD COLUMN     "correlativo" TEXT,
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "relatedInvoiceId" TEXT,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "seriesConfigId" INTEGER,
ADD COLUMN     "sunatAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sunatDescription" TEXT,
ADD COLUMN     "sunatResponseCode" TEXT,
ADD COLUMN     "sunatSentAt" TIMESTAMP(3),
ADD COLUMN     "sunatStatus" "SunatStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "tipoDoc" "SunatDocType",
ADD COLUMN     "totalExonerado" DOUBLE PRECISION,
ADD COLUMN     "totalGratuito" DOUBLE PRECISION,
ADD COLUMN     "totalGravado" DOUBLE PRECISION,
ADD COLUMN     "totalIgv" DOUBLE PRECISION,
ADD COLUMN     "totalInafecto" DOUBLE PRECISION,
ADD COLUMN     "totalIsc" DOUBLE PRECISION,
ADD COLUMN     "totalOtrosCargos" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "quotaDueDay" INTEGER;

-- CreateTable
CREATE TABLE "billing_configs" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "comercialName" TEXT,
    "solUser" TEXT NOT NULL,
    "solPass" TEXT NOT NULL,
    "certPfxBase64" TEXT,
    "certPassword" TEXT,
    "ubigeo" TEXT,
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "department" TEXT,
    "production" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_series" (
    "id" SERIAL NOT NULL,
    "billingConfigId" INTEGER NOT NULL,
    "tipoDoc" "SunatDocType" NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_documents" (
    "id" SERIAL NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "BillingDocType" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "format" TEXT,
    "bytes" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_configs_organizationId_key" ON "billing_configs"("organizationId");

-- CreateIndex
CREATE INDEX "document_series_billingConfigId_tipoDoc_idx" ON "document_series"("billingConfigId", "tipoDoc");

-- CreateIndex
CREATE UNIQUE INDEX "document_series_billingConfigId_tipoDoc_serie_key" ON "document_series"("billingConfigId", "tipoDoc", "serie");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_invoiceId_type_key" ON "billing_documents"("invoiceId", "type");

-- CreateIndex
CREATE INDEX "invoice_headers_sunatStatus_idx" ON "invoice_headers"("sunatStatus");

-- AddForeignKey
ALTER TABLE "billing_configs" ADD CONSTRAINT "billing_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_series" ADD CONSTRAINT "document_series_billingConfigId_fkey" FOREIGN KEY ("billingConfigId") REFERENCES "billing_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_headers" ADD CONSTRAINT "invoice_headers_seriesConfigId_fkey" FOREIGN KEY ("seriesConfigId") REFERENCES "document_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_headers" ADD CONSTRAINT "invoice_headers_relatedInvoiceId_fkey" FOREIGN KEY ("relatedInvoiceId") REFERENCES "invoice_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
