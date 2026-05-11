-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('REGULAR', 'JUBILADO', 'VITALICIO', 'HONORARIO');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('EVENTS', 'RESERVATIONS', 'SURVEYS', 'SUPPORT', 'AGREEMENTS', 'QUOTES', 'POSTS', 'USERS', 'ANALYTICS', 'SETTINGS');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SOCIAL', 'ACADEMIC');

-- CreateEnum
CREATE TYPE "PeopleAvailable" AS ENUM ('TODOS', 'HABILES', 'HABILES_AL_DIA');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('COMMUNICATIONS', 'NEWS');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'SCALE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('MULTA', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('GENERAL', 'INVITADO', 'CUOTA', 'EVENTO');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PEN', 'USD');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SOCIAL', 'ACADEMIC', 'RESERVATION', 'CURRENCY', 'QUOTE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAGADO', 'EXPIRADO', 'CANCELADO', 'FALLIDO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'FACTURADO', 'EXPIRADO', 'CANCELADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'RUC', 'CE', 'PASAPORTE', 'OTROS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('QUOTA_DUE_REMINDER', 'QUOTA_OVERDUE', 'EVENT_CREATED', 'EVENT_REMINDER', 'POST_PUBLISHED', 'SURVEY_PUBLISHED', 'SUPPORT_ASSIGNED', 'SUPPORT_OVERDUE', 'MONTHLY_REPORT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a1a2e',
    "secondaryColor" TEXT NOT NULL DEFAULT '#16213e',
    "accentColor" TEXT NOT NULL DEFAULT '#e94560',
    "bannerUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "socialMedia" JSONB,
    "footerText" TEXT,
    "footerLinks" JSONB,
    "moduleEvents" BOOLEAN NOT NULL DEFAULT true,
    "moduleReservations" BOOLEAN NOT NULL DEFAULT true,
    "moduleSurveys" BOOLEAN NOT NULL DEFAULT true,
    "moduleSupport" BOOLEAN NOT NULL DEFAULT true,
    "moduleAgreements" BOOLEAN NOT NULL DEFAULT true,
    "moduleQuotes" BOOLEAN NOT NULL DEFAULT true,
    "moraGraceDays" INTEGER NOT NULL DEFAULT 7,
    "moraReminderDays" JSONB NOT NULL DEFAULT '[5, 1, -7, -30]',
    "moraAutoBlock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteAmount" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "discountApply" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuoteAmount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "name" TEXT NOT NULL,
    "paternalSurname" TEXT NOT NULL,
    "maternalSurname" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "memberCode" TEXT,
    "phone" TEXT,
    "birthdate" TIMESTAMP(3),
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "department" TEXT,
    "country" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "memberCategory" "MemberCategory" NOT NULL DEFAULT 'REGULAR',
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "hasRegistered" BOOLEAN NOT NULL DEFAULT false,
    "externalPersonId" TEXT,
    "externalAddressId" TEXT,
    "externalDistrictId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "module" "ModuleType" NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_passwords" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActivityType" NOT NULL DEFAULT 'SOCIAL',
    "date" TIMESTAMP(3) NOT NULL,
    "finishDate" TIMESTAMP(3),
    "hasPrice" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION,
    "priceInvitee" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL,
    "stockUsed" INTEGER NOT NULL DEFAULT 0,
    "hasInvitees" BOOLEAN NOT NULL DEFAULT false,
    "inviteStock" INTEGER NOT NULL DEFAULT 0,
    "peopleAvailable" "PeopleAvailable" NOT NULL DEFAULT 'TODOS',
    "concurrence" TEXT,
    "days" JSONB,
    "finishConcurrence" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_media" (
    "activityId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "activity_media_pkey" PRIMARY KEY ("activityId","mediaId")
);

-- CreateTable
CREATE TABLE "activity_attendees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" INTEGER NOT NULL,
    "invited" BOOLEAN NOT NULL DEFAULT false,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ACEPTADO',
    "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitees" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attendeeId" TEXT NOT NULL,

    CONSTRAINT "invitees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "DiscountType" NOT NULL,
    "quotesNumber" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "activityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_users" (
    "id" SERIAL NOT NULL,
    "discountId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "discount_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_periods" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quota_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_payments" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paidAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quota_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "contentHtml" TEXT,
    "coverImage" TEXT,
    "href" TEXT,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "type" "PostType" NOT NULL DEFAULT 'COMMUNICATIONS',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "contentHtml" TEXT,
    "coverImage" TEXT,
    "href" TEXT,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scaleMin" INTEGER DEFAULT 1,
    "scaleMax" INTEGER DEFAULT 5,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_options" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "survey_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "userId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" SERIAL NOT NULL,
    "responseId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "optionId" INTEGER,
    "textValue" TEXT,
    "scaleValue" INTEGER,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supports" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "comment" TEXT,
    "assignedTo" TEXT,
    "assignedName" TEXT,
    "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "dates" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_media" (
    "reservationId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reservation_media_pkey" PRIMARY KEY ("reservationId","mediaId")
);

-- CreateTable
CREATE TABLE "reservation_attendees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "productId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ACEPTADO',
    "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctioned_lawyers" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanctioned_lawyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions" (
    "id" SERIAL NOT NULL,
    "sanctionType" "SanctionType" NOT NULL,
    "sanctionResolution" TEXT NOT NULL,
    "amount" TEXT,
    "description" TEXT,
    "endDate" TIMESTAMP(3),
    "sanctionedLawyerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_headers" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDIENTE',
    "withIGV" BOOLEAN NOT NULL DEFAULT false,
    "idDocument" TEXT NOT NULL DEFAULT '01',
    "clientName" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "documentNumber" TEXT,
    "billingAddress" TEXT,
    "saleCondition" TEXT NOT NULL DEFAULT 'CONTADO',
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "observations" TEXT,
    "userId" TEXT NOT NULL,
    "paramId" TEXT,
    "activityId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_details" (
    "id" SERIAL NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'NIU',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentType" "PaymentType" NOT NULL,
    "relatedId" INTEGER,
    "reservationId" TEXT,
    "relatedType" TEXT,

    CONSTRAINT "invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "message" TEXT,
    "rawData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT,
    "type" TEXT,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_images" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" INTEGER,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_memberCode_key" ON "users"("memberCode");

-- CreateIndex
CREATE INDEX "users_email_name_dni_memberCode_idx" ON "users"("email", "name", "dni", "memberCode");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_module_key" ON "role_permissions"("role", "module");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_passwords_identifier_key" ON "recovery_passwords"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_passwords_identifier_token_key" ON "recovery_passwords"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_token_key" ON "revoked_tokens"("token");

-- CreateIndex
CREATE INDEX "activities_type_status_date_idx" ON "activities"("type", "status", "date");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "activities"("status");

-- CreateIndex
CREATE INDEX "activity_attendees_activityId_status_idx" ON "activity_attendees"("activityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_attendees_userId_activityId_key" ON "activity_attendees"("userId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "invitees_dni_attendeeId_key" ON "invitees"("dni", "attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_users_discountId_userId_key" ON "discount_users"("discountId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "quota_periods_year_month_key" ON "quota_periods"("year", "month");

-- CreateIndex
CREATE INDEX "quota_payments_userId_status_idx" ON "quota_payments"("userId", "status");

-- CreateIndex
CREATE INDEX "quota_payments_status_idx" ON "quota_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quota_payments_userId_periodId_key" ON "quota_payments"("userId", "periodId");

-- CreateIndex
CREATE INDEX "posts_type_status_publishedAt_idx" ON "posts"("type", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "surveys_status_idx" ON "surveys"("status");

-- CreateIndex
CREATE INDEX "survey_questions_surveyId_order_idx" ON "survey_questions"("surveyId", "order");

-- CreateIndex
CREATE INDEX "survey_options_questionId_order_idx" ON "survey_options"("questionId", "order");

-- CreateIndex
CREATE INDEX "survey_responses_surveyId_idx" ON "survey_responses"("surveyId");

-- CreateIndex
CREATE INDEX "survey_responses_userId_idx" ON "survey_responses"("userId");

-- CreateIndex
CREATE INDEX "survey_answers_responseId_idx" ON "survey_answers"("responseId");

-- CreateIndex
CREATE INDEX "survey_answers_questionId_idx" ON "survey_answers"("questionId");

-- CreateIndex
CREATE INDEX "supports_status_priority_idx" ON "supports"("status", "priority");

-- CreateIndex
CREATE INDEX "supports_userId_idx" ON "supports"("userId");

-- CreateIndex
CREATE INDEX "reservations_title_status_idx" ON "reservations"("title", "status");

-- CreateIndex
CREATE INDEX "reservation_attendees_reservationId_userId_status_idx" ON "reservation_attendees"("reservationId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sanctioned_lawyers_memberCode_key" ON "sanctioned_lawyers"("memberCode");

-- CreateIndex
CREATE INDEX "sanctions_sanctionType_idx" ON "sanctions"("sanctionType");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_headers_orderNumber_key" ON "invoice_headers"("orderNumber");

-- CreateIndex
CREATE INDEX "invoice_headers_userId_idx" ON "invoice_headers"("userId");

-- CreateIndex
CREATE INDEX "invoice_headers_status_createdAt_idx" ON "invoice_headers"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_invoiceId_key" ON "payment_transactions"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transactionId_key" ON "payment_transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_images_userId_key" ON "profile_images"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_action_createdAt_idx" ON "audit_logs"("entity", "action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "QuoteAmount" ADD CONSTRAINT "QuoteAmount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_media" ADD CONSTRAINT "activity_media_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_media" ADD CONSTRAINT "activity_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attendees" ADD CONSTRAINT "activity_attendees_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attendees" ADD CONSTRAINT "activity_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitees" ADD CONSTRAINT "invitees_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "activity_attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_users" ADD CONSTRAINT "discount_users_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_users" ADD CONSTRAINT "discount_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_payments" ADD CONSTRAINT "quota_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_payments" ADD CONSTRAINT "quota_payments_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "quota_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_options" ADD CONSTRAINT "survey_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "survey_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_media" ADD CONSTRAINT "reservation_media_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_media" ADD CONSTRAINT "reservation_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_attendees" ADD CONSTRAINT "reservation_attendees_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_attendees" ADD CONSTRAINT "reservation_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_sanctionedLawyerId_fkey" FOREIGN KEY ("sanctionedLawyerId") REFERENCES "sanctioned_lawyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_headers" ADD CONSTRAINT "invoice_headers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_details" ADD CONSTRAINT "invoice_details_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice_headers"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_images" ADD CONSTRAINT "profile_images_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_images" ADD CONSTRAINT "profile_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
