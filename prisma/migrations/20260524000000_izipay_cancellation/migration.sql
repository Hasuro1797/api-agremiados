-- CreateEnum
CREATE TYPE "CancellationType" AS ENUM ('ANULACION', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('APPLIED', 'FAILED');

-- CreateTable
CREATE TABLE "payment_cancellations" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "type" "CancellationType" NOT NULL,
    "status" "CancellationStatus" NOT NULL DEFAULT 'APPLIED',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "izipayOperationId" TEXT,
    "responseCode" TEXT,
    "message" TEXT,
    "rawResponse" JSONB,
    "reason" TEXT,
    "creditNoteId" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_cancellations_paymentTransactionId_idx" ON "payment_cancellations"("paymentTransactionId");

-- AddForeignKey
ALTER TABLE "payment_cancellations" ADD CONSTRAINT "payment_cancellations_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
