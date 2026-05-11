-- CreateEnum
CREATE TYPE "MediaContext" AS ENUM ('GALLERY', 'PROFILE', 'SUPPORT', 'COVER');

-- CreateEnum
CREATE TYPE "SaleCondition" AS ENUM ('CONTADO', 'CREDITO');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('QUOTA', 'ACTIVITY_ENTRY', 'ACTIVITY_GUEST', 'OTHER');

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'SUPPORT_CREATED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'SUPPORT_RESOLVED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'SUPPORT_REJECTED';
ALTER TYPE "AutomationTrigger" ADD VALUE 'SUPPORT_REOPENED';

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'PUSH';

-- AlterEnum
ALTER TYPE "SupportStatus" ADD VALUE 'REOPENED';

-- DropForeignKey
ALTER TABLE "invitees" DROP CONSTRAINT "invitees_attendeeId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_headers" DROP CONSTRAINT "invoice_headers_relatedInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_headers" DROP CONSTRAINT "invoice_headers_userId_fkey";

-- DropForeignKey
ALTER TABLE "profile_images" DROP CONSTRAINT "profile_images_mediaId_fkey";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "hasInvitees",
DROP COLUMN "inviteStock",
ADD COLUMN     "allowExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceExternal" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "activity_attendees" DROP COLUMN "invited";

-- AlterTable
ALTER TABLE "invoice_details" DROP COLUMN "paymentType",
DROP COLUMN "precioUnitarioSinIgv",
DROP COLUMN "relatedId",
DROP COLUMN "relatedType",
DROP COLUMN "reservationId",
DROP COLUMN "tipoAfectacion",
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "itemType" "InvoiceItemType" NOT NULL,
ADD COLUMN     "taxAffectation" TEXT,
ADD COLUMN     "unitPriceWithoutIgv" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "invoice_headers" DROP COLUMN "activityId",
DROP COLUMN "correlativo",
DROP COLUMN "fechaEmision",
DROP COLUMN "idDocument",
DROP COLUMN "invoiceDate",
DROP COLUMN "paramId",
DROP COLUMN "relatedInvoiceId",
DROP COLUMN "serie",
DROP COLUMN "tipoDoc",
DROP COLUMN "totalExonerado",
DROP COLUMN "totalGratuito",
DROP COLUMN "totalGravado",
DROP COLUMN "totalInafecto",
DROP COLUMN "totalOtrosCargos",
DROP COLUMN "withIGV",
ADD COLUMN     "creditDebitReasonCode" TEXT,
ADD COLUMN     "creditDebitReasonDescription" TEXT,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "referenceInvoiceId" TEXT,
ADD COLUMN     "sequential" TEXT,
ADD COLUMN     "series" TEXT,
ADD COLUMN     "sunatDocType" "SunatDocType",
ADD COLUMN     "sunatEmissionDate" TIMESTAMP(3),
ADD COLUMN     "totalExempt" DOUBLE PRECISION,
ADD COLUMN     "totalFree" DOUBLE PRECISION,
ADD COLUMN     "totalOtherCharges" DOUBLE PRECISION,
ADD COLUMN     "totalTaxable" DOUBLE PRECISION,
ADD COLUMN     "totalUnaffected" DOUBLE PRECISION,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT,
ADD COLUMN     "withIgv" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "saleCondition",
ADD COLUMN     "saleCondition" "SaleCondition" NOT NULL DEFAULT 'CONTADO',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "context" "MediaContext" NOT NULL DEFAULT 'GALLERY';

-- AlterTable
ALTER TABLE "notification_templates" DROP COLUMN "channel",
ADD COLUMN     "channels" JSONB NOT NULL DEFAULT '["EMAIL"]',
ADD COLUMN     "isCritical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shortBody" TEXT;

-- AlterTable
ALTER TABLE "payment_transactions" DROP COLUMN "timestamp",
ADD COLUMN     "authorizationCode" TEXT,
ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'PEN',
ADD COLUMN     "processedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "supports" DROP COLUMN "comment",
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "overdueNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "reopenReason" TEXT,
ADD COLUMN     "reopenedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "satisfactionComment" TEXT,
ADD COLUMN     "satisfactionRating" INTEGER,
ADD COLUMN     "subjectDescription" TEXT,
ADD COLUMN     "subjectUserId" TEXT;

-- DropTable
DROP TABLE "invitees";

-- DropEnum
DROP TYPE "PaymentType";

-- CreateTable
CREATE TABLE "activity_guests" (
    "id" TEXT NOT NULL,
    "activityId" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "documentNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "sponsorAttendeeId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ACEPTADO',
    "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "defaultPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "slaDays" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "supportId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_attachments" (
    "messageId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("messageId","mediaId")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_guests_activityId_sponsorAttendeeId_idx" ON "activity_guests"("activityId", "sponsorAttendeeId");

-- CreateIndex
CREATE INDEX "activity_guests_activityId_status_idx" ON "activity_guests"("activityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_guests_documentNumber_activityId_key" ON "activity_guests"("documentNumber", "activityId");

-- CreateIndex
CREATE INDEX "support_messages_supportId_createdAt_idx" ON "support_messages"("supportId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_triggerKey_channel_key" ON "notification_preferences"("userId", "triggerKey", "channel");

-- CreateIndex
CREATE INDEX "invoice_details_invoiceId_idx" ON "invoice_details"("invoiceId");

-- CreateIndex
CREATE INDEX "media_context_idx" ON "media"("context");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "supports_status_dueDate_idx" ON "supports"("status", "dueDate");

-- AddForeignKey
ALTER TABLE "activity_guests" ADD CONSTRAINT "activity_guests_sponsorAttendeeId_fkey" FOREIGN KEY ("sponsorAttendeeId") REFERENCES "activity_attendees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_guests" ADD CONSTRAINT "activity_guests_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "supports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_headers" ADD CONSTRAINT "invoice_headers_referenceInvoiceId_fkey" FOREIGN KEY ("referenceInvoiceId") REFERENCES "invoice_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_headers" ADD CONSTRAINT "invoice_headers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
