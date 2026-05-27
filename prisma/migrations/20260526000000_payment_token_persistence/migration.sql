-- AlterTable
ALTER TABLE "payment_transactions"
ADD COLUMN "paymentToken" TEXT,
ADD COLUMN "paymentTokenAt" TIMESTAMP(3);
