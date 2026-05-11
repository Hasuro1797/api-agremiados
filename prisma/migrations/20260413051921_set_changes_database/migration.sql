/*
  Warnings:

  - The values [SUSPENDIDO] on the enum `SanctionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dates` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `reservations` table. All the data in the column will be lost.
  - The `description` column on the `reservations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `sanctionedLawyerId` on the `sanctions` table. All the data in the column will be lost.
  - You are about to drop the `QuoteAmount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reservation_attendees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sanctioned_lawyers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `agreements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `posts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `capacity` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `sanctions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('HABILITACION', 'COLEGIATURA', 'ASISTENCIA', 'OTROS');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgreementCategory" AS ENUM ('EDUCATION', 'HEALTH', 'COMMERCIAL', 'FINANCIAL', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('HALL', 'CONFERENCE', 'CLASSROOM', 'OFFICE', 'OUTDOOR', 'MULTIPURPOSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationRequestStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- AlterEnum
BEGIN;
CREATE TYPE "SanctionType_new" AS ENUM ('AMONESTACION', 'MULTA', 'SUSPENSION_TEMPORAL', 'INHABILITACION', 'EXPULSION');
ALTER TABLE "sanctions" ALTER COLUMN "sanctionType" TYPE "SanctionType_new" USING ("sanctionType"::text::"SanctionType_new");
ALTER TYPE "SanctionType" RENAME TO "SanctionType_old";
ALTER TYPE "SanctionType_new" RENAME TO "SanctionType";
DROP TYPE "public"."SanctionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "QuoteAmount" DROP CONSTRAINT "QuoteAmount_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "reservation_attendees" DROP CONSTRAINT "reservation_attendees_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "reservation_attendees" DROP CONSTRAINT "reservation_attendees_userId_fkey";

-- DropForeignKey
ALTER TABLE "sanctions" DROP CONSTRAINT "sanctions_sanctionedLawyerId_fkey";

-- DropIndex
DROP INDEX "sanctions_sanctionType_idx";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "address" TEXT,
ADD COLUMN     "venue" TEXT;

-- AlterTable
ALTER TABLE "agreements" ADD COLUMN     "benefitSummary" TEXT,
ADD COLUMN     "category" "AgreementCategory" NOT NULL DEFAULT 'EDUCATION',
ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "partnerLogo" TEXT,
ADD COLUMN     "partnerName" TEXT,
ADD COLUMN     "partnerWebsite" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "modulePosts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduleSanctions" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "author" TEXT,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "dates",
DROP COLUMN "stock",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "amenities" JSONB,
ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "pricePerHour" DOUBLE PRECISION,
ADD COLUMN     "rules" JSONB,
ADD COLUMN     "spaceType" "SpaceType" NOT NULL DEFAULT 'HALL',
DROP COLUMN "description",
ADD COLUMN     "description" JSONB,
ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sanctions" DROP COLUMN "sanctionedLawyerId",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "survey_responses" ADD COLUMN     "isPartial" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "QuoteAmount";

-- DropTable
DROP TABLE "reservation_attendees";

-- DropTable
DROP TABLE "sanctioned_lawyers";

-- CreateTable
CREATE TABLE "quote_amounts" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "discountApply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_amounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_requests" (
    "id" TEXT NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "purpose" TEXT,
    "guestCount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ReservationRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "adminComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "estimatedPrice" DOUBLE PRECISION,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "activityId" INTEGER,
    "observations" TEXT,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "fileUrl" TEXT,
    "filePublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_requests_reservationId_status_idx" ON "reservation_requests"("reservationId", "status");

-- CreateIndex
CREATE INDEX "reservation_requests_userId_status_idx" ON "reservation_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "reservation_requests_startDate_endDate_idx" ON "reservation_requests"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_userId_type_idx" ON "certificates"("userId", "type");

-- CreateIndex
CREATE INDEX "certificates_code_idx" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_status_validUntil_idx" ON "certificates"("status", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_slug_key" ON "agreements"("slug");

-- CreateIndex
CREATE INDEX "agreements_status_category_idx" ON "agreements"("status", "category");

-- CreateIndex
CREATE INDEX "agreements_validUntil_idx" ON "agreements"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_isPinned_publishedAt_idx" ON "posts"("isPinned", "publishedAt");

-- CreateIndex
CREATE INDEX "reservations_spaceType_status_idx" ON "reservations"("spaceType", "status");

-- CreateIndex
CREATE INDEX "sanctions_userId_idx" ON "sanctions"("userId");

-- CreateIndex
CREATE INDEX "sanctions_sanctionType_isActive_idx" ON "sanctions"("sanctionType", "isActive");

-- AddForeignKey
ALTER TABLE "quote_amounts" ADD CONSTRAINT "quote_amounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_requests" ADD CONSTRAINT "reservation_requests_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_requests" ADD CONSTRAINT "reservation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
