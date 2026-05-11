/*
  Warnings:

  - The values [ACTIVITY_ENTRY,ACTIVITY_GUEST] on the enum `InvoiceItemType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `allowExternal` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the column `mediaId` on the `profile_images` table. All the data in the column will be lost.
  - You are about to drop the `activity_guests` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[documentNumber,activityId]` on the table `activity_attendees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicId` to the `profile_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `profile_images` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityAudience" AS ENUM ('MEMBERS_ONLY', 'MEMBERS_AND_GUESTS', 'OPEN');

-- CreateEnum
CREATE TYPE "AttendeeType" AS ENUM ('MEMBER', 'INVITED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "DiscountTargetType" AS ENUM ('ALL', 'BY_CATEGORY', 'SPECIFIC_USERS');

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceItemType_new" AS ENUM ('QUOTA', 'ACTIVITY_ATTENDEE', 'OTHER');
ALTER TABLE "invoice_details" ALTER COLUMN "itemType" TYPE "InvoiceItemType_new" USING ("itemType"::text::"InvoiceItemType_new");
ALTER TYPE "InvoiceItemType" RENAME TO "InvoiceItemType_old";
ALTER TYPE "InvoiceItemType_new" RENAME TO "InvoiceItemType";
DROP TYPE "public"."InvoiceItemType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'TREASURER';
ALTER TYPE "Role" ADD VALUE 'EVENT_MANAGER';
ALTER TYPE "Role" ADD VALUE 'CONTENT_EDITOR';
ALTER TYPE "Role" ADD VALUE 'SUPPORT_AGENT';
ALTER TYPE "Role" ADD VALUE 'SECRETARY';

-- DropForeignKey
ALTER TABLE "activity_attendees" DROP CONSTRAINT "activity_attendees_userId_fkey";

-- DropForeignKey
ALTER TABLE "activity_guests" DROP CONSTRAINT "activity_guests_activityId_fkey";

-- DropForeignKey
ALTER TABLE "activity_guests" DROP CONSTRAINT "activity_guests_sponsorAttendeeId_fkey";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "allowExternal",
ADD COLUMN     "audience" "ActivityAudience" NOT NULL DEFAULT 'MEMBERS_ONLY';

-- AlterTable
ALTER TABLE "activity_attendees" ADD COLUMN     "attendeeType" "AttendeeType" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "DocumentType",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastname" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sponsorAttendeeId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "targetCategories" JSONB,
ADD COLUMN     "targetType" "DiscountTargetType" NOT NULL DEFAULT 'SPECIFIC_USERS';

-- AlterTable
ALTER TABLE "profile_images" DROP COLUMN "mediaId",
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- DropTable
DROP TABLE "activity_guests";

-- CreateIndex
CREATE INDEX "activity_attendees_activityId_attendeeType_idx" ON "activity_attendees"("activityId", "attendeeType");

-- CreateIndex
CREATE UNIQUE INDEX "activity_attendees_documentNumber_activityId_key" ON "activity_attendees"("documentNumber", "activityId");

-- AddForeignKey
ALTER TABLE "activity_attendees" ADD CONSTRAINT "activity_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attendees" ADD CONSTRAINT "activity_attendees_sponsorAttendeeId_fkey" FOREIGN KEY ("sponsorAttendeeId") REFERENCES "activity_attendees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
