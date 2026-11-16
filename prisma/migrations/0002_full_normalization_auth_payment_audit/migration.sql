-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'COACH', 'PARTNER_ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "ProgramDifficultyLevel" AS ENUM ('BEGINNER', 'MODERATE', 'INTERMEDIATE', 'ADVANCED', 'HIGH_INTENSITY');

-- CreateEnum
CREATE TYPE "ProgramLocationType" AS ENUM ('ONLINE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'OPEN', 'PUBLISHED', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProgramDayType" AS ENUM ('TRAINING_DAY', 'REST_DAY', 'CONNECTION_DAY', 'MEETUP_DAY');

-- CreateEnum
CREATE TYPE "CustomTaskType" AS ENUM ('MEASUREMENT', 'BENCHMARK', 'FORM', 'CHECKLIST', 'MEDIA_UPLOAD');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('IN_PERSON', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SETTLEMENT', 'EXPIRE', 'CANCEL', 'DENY', 'REFUND', 'MANUAL_APPROVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROGRAM', 'TASK', 'PAYMENT', 'REMINDER', 'ANNOUNCEMENT', 'INFO');

-- CreateEnum
CREATE TYPE "BodyMetricSource" AS ENUM ('CUSTOM_TASK', 'ADMIN', 'SELF');

-- CreateEnum
CREATE TYPE "SupportRequestType" AS ENUM ('QUIT_COHORT', 'REPORT_ISSUE');

-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "customer_health_profiles" DROP CONSTRAINT "customer_health_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "program_day_progress" DROP CONSTRAINT "program_day_progress_program_day_id_fkey";

-- DropForeignKey
ALTER TABLE "program_day_progress" DROP CONSTRAINT "program_day_progress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "program_enrollments" DROP CONSTRAINT "program_enrollments_program_id_fkey";

-- DropForeignKey
ALTER TABLE "program_enrollments" DROP CONSTRAINT "program_enrollments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "push_subscriptions" DROP CONSTRAINT "push_subscriptions_user_id_fkey";

-- DropIndex
DROP INDEX "program_enrollments_status_idx";

-- DropIndex
DROP INDEX "programs_location_type_is_published_idx";

-- DropIndex
DROP INDEX "programs_status_is_published_start_date_idx";

-- AlterTable
ALTER TABLE "master_organizations" DROP COLUMN "logo_url",
ADD COLUMN     "logo_path" TEXT;

-- AlterTable
ALTER TABLE "program_coaches" DROP COLUMN "display_order",
DROP COLUMN "is_lead";

-- AlterTable
ALTER TABLE "program_day_custom_submissions" DROP COLUMN "values_json",
ADD COLUMN     "values_json" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "program_day_custom_tasks" DROP COLUMN "fields_schema",
DROP COLUMN "translations",
ADD COLUMN     "fields_schema_json" JSONB NOT NULL,
ADD COLUMN     "translations_json" JSONB,
DROP COLUMN "task_type",
ADD COLUMN     "task_type" "CustomTaskType" NOT NULL;

-- AlterTable
ALTER TABLE "program_days" DROP COLUMN "day_notifications",
DROP COLUMN "translations",
DROP COLUMN "video_checklist",
DROP COLUMN "workout_options",
ADD COLUMN     "day_notifications_json" JSONB,
ADD COLUMN     "translations_json" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "video_checklist_json" JSONB,
ADD COLUMN     "workout_options_json" JSONB,
DROP COLUMN "day_type",
ADD COLUMN     "day_type" "ProgramDayType" NOT NULL DEFAULT 'TRAINING_DAY';

-- AlterTable
ALTER TABLE "program_enrollments" DROP COLUMN "valid_until",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "valid_until_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "attendance_mode",
ADD COLUMN     "attendance_mode" "AttendanceMode" NOT NULL DEFAULT 'VIRTUAL';

-- AlterTable
ALTER TABLE "program_equipments" DROP COLUMN "is_required";

-- AlterTable
ALTER TABLE "programs" DROP COLUMN "audience_cache",
DROP COLUMN "category",
DROP COLUMN "category_cache",
DROP COLUMN "coach_cache",
DROP COLUMN "coach_name",
DROP COLUMN "coach_title",
DROP COLUMN "commitment_cache",
DROP COLUMN "cover_image",
DROP COLUMN "daily_commitment",
DROP COLUMN "end_date",
DROP COLUMN "equipment",
DROP COLUMN "equipment_cache",
DROP COLUMN "expected_benefits",
DROP COLUMN "is_published",
DROP COLUMN "organization_cache",
DROP COLUMN "program_guidelines",
DROP COLUMN "recommended_for",
DROP COLUMN "registration_deadline",
DROP COLUMN "registration_open_date",
DROP COLUMN "scientific_references",
DROP COLUMN "start_date",
DROP COLUMN "translations",
DROP COLUMN "virtual_fallback_available",
ADD COLUMN     "cover_image_path" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "end_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expected_benefits_json" JSONB,
ADD COLUMN     "is_virtual_fallback_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "program_guidelines_json" JSONB,
ADD COLUMN     "registration_deadline_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "registration_open_at" TIMESTAMP(3),
ADD COLUMN     "scientific_references_json" JSONB,
ADD COLUMN     "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "translations_json" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "difficulty_level",
ADD COLUMN     "difficulty_level" "ProgramDifficultyLevel" NOT NULL DEFAULT 'INTERMEDIATE',
ALTER COLUMN "actual_price" SET DEFAULT 0,
ALTER COLUMN "actual_price" SET DATA TYPE INTEGER,
ALTER COLUMN "price" SET DEFAULT 0,
ALTER COLUMN "price" SET DATA TYPE INTEGER,
DROP COLUMN "location_type",
ADD COLUMN     "location_type" "ProgramLocationType" NOT NULL DEFAULT 'ONLINE',
DROP COLUMN "status",
ADD COLUMN     "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "user_body_metric_logs" DROP COLUMN "source",
ADD COLUMN     "source" "BodyMetricSource" NOT NULL DEFAULT 'CUSTOM_TASK';

-- AlterTable
ALTER TABLE "user_notifications" DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "age",
DROP COLUMN "avatar_url",
DROP COLUMN "date_of_birth",
ADD COLUMN     "avatar_path" TEXT,
ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ALTER COLUMN "password_hash" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "customer_health_profiles";

-- DropTable
DROP TABLE "password_reset_tokens";

-- DropTable
DROP TABLE "program_day_progress";

-- DropTable
DROP TABLE "push_subscriptions";

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "gateway_transaction_id" TEXT,
    "provider" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL DEFAULT 'qris',
    "gross_amount" INTEGER NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "qris_string_or_url" TEXT,
    "raw_webhook_json" JSONB,
    "expires_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_support_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "request_type" "SupportRequestType" NOT NULL,
    "reason_code" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohort_support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day_progresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_day_id" TEXT NOT NULL,
    "is_video_watched" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "checklist_completed_json" JSONB,
    "selected_workout" TEXT,
    "workout_notes" TEXT,
    "event_feedback" TEXT,
    "meal_compliance" TEXT,
    "meal_notes" TEXT,
    "daily_reflection" TEXT,
    "happiness_rate" INTEGER,
    "bedtime" TEXT,
    "wake_time" TEXT,
    "sleep_duration_minutes" INTEGER,
    "assessment_response" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata_json" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "window_start_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_account_id_key" ON "user_identities"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_verification_tokens_token_hash_key" ON "user_email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "user_email_verification_tokens_user_id_idx" ON "user_email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "user_email_verification_tokens_expires_at_idx" ON "user_email_verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_password_reset_tokens_token_hash_key" ON "user_password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "user_password_reset_tokens_user_id_idx" ON "user_password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "user_password_reset_tokens_expires_at_idx" ON "user_password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_enrollment_id_idx" ON "payment_transactions"("enrollment_id");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_created_at_idx" ON "payment_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_transactions_status_expires_at_idx" ON "payment_transactions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "cohort_support_requests_user_id_created_at_idx" ON "cohort_support_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "cohort_support_requests_program_id_status_idx" ON "cohort_support_requests"("program_id", "status");

-- CreateIndex
CREATE INDEX "cohort_support_requests_status_created_at_idx" ON "cohort_support_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "program_day_progresses_program_day_id_idx" ON "program_day_progresses"("program_day_id");

-- CreateIndex
CREATE INDEX "program_day_progresses_user_id_is_completed_idx" ON "program_day_progresses"("user_id", "is_completed");

-- CreateIndex
CREATE UNIQUE INDEX "program_day_progresses_user_id_program_day_id_key" ON "program_day_progresses"("user_id", "program_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_push_subscriptions_endpoint_key" ON "user_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "user_push_subscriptions_user_id_idx" ON "user_push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets"("expires_at");

-- CreateIndex
CREATE INDEX "master_coaches_name_idx" ON "master_coaches"("name");

-- CreateIndex
CREATE INDEX "program_enrollments_program_id_status_idx" ON "program_enrollments"("program_id", "status");

-- CreateIndex
CREATE INDEX "program_enrollments_user_id_status_idx" ON "program_enrollments"("user_id", "status");

-- CreateIndex
CREATE INDEX "program_enrollments_status_invoice_expires_at_idx" ON "program_enrollments"("status", "invoice_expires_at");

-- CreateIndex
CREATE INDEX "programs_status_start_at_idx" ON "programs"("status", "start_at");

-- CreateIndex
CREATE INDEX "programs_status_created_at_idx" ON "programs"("status", "created_at");

-- CreateIndex
CREATE INDEX "programs_location_type_status_idx" ON "programs"("location_type", "status");

-- CreateIndex
CREATE INDEX "programs_deleted_at_idx" ON "programs"("deleted_at");

-- CreateIndex
CREATE INDEX "user_body_metric_logs_user_id_program_day_id_source_idx" ON "user_body_metric_logs"("user_id", "program_day_id", "source");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_email_verification_tokens" ADD CONSTRAINT "user_email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_password_reset_tokens" ADD CONSTRAINT "user_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_body_metric_logs" ADD CONSTRAINT "user_body_metric_logs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_body_metric_logs" ADD CONSTRAINT "user_body_metric_logs_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_support_requests" ADD CONSTRAINT "cohort_support_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_support_requests" ADD CONSTRAINT "cohort_support_requests_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_support_requests" ADD CONSTRAINT "cohort_support_requests_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_progresses" ADD CONSTRAINT "program_day_progresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_progresses" ADD CONSTRAINT "program_day_progresses_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_push_subscriptions" ADD CONSTRAINT "user_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Functional & Partial Unique Indexes
CREATE UNIQUE INDEX "users_email_lower_uidx" ON "users"(LOWER("email"));
CREATE UNIQUE INDEX "user_body_metric_logs_custom_task_day_uidx" ON "user_body_metric_logs"("user_id", "program_day_id", "source") WHERE "program_day_id" IS NOT NULL AND "source" = 'CUSTOM_TASK';
