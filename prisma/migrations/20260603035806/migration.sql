/*
  Warnings:

  - You are about to drop the column `withIgv` on the `invoice_headers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoice_headers" DROP COLUMN "withIgv";
