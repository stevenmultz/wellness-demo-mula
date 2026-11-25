-- ============================================================================
-- Migration 0008: Universal Daily Biomarkers, Tracking Pass Entitlement & RLS
-- ============================================================================

-- 1. New PostgreSQL Enums
CREATE TYPE "PaymentItemType" AS ENUM ('PROGRAM_ENROLLMENT', 'TRACKING_PASS');
CREATE TYPE "TrackingPassOrderStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "TrackingGrantSourceType" AS ENUM ('PROGRAM_BONUS', 'STANDALONE_PASS', 'ADMIN_COMP');
CREATE TYPE "TrackingGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "DailyMealQualityMode" AS ENUM ('ON_PLAN', 'PARTIAL', 'OFF_TRACK', 'SELF_LOGGED');

-- 2. Extend Existing Tables Safely (Backwards-Compatible Defaults)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tracking_access_until" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_tracking_access_until_idx"
  ON "users"("tracking_access_until");

ALTER TABLE "programs"
  ADD COLUMN IF NOT EXISTS "bonus_tracking_days" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "programs"
  DROP CONSTRAINT IF EXISTS "chk_programs_bonus_tracking_days";
ALTER TABLE "programs"
  ADD CONSTRAINT "chk_programs_bonus_tracking_days"
  CHECK ("bonus_tracking_days" >= 0 AND "bonus_tracking_days" <= 365);

-- 3. Standalone Tracking Pass Catalog & Orders
CREATE TABLE "tracking_pass_plans" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "duration_days" INTEGER NOT NULL DEFAULT 180,
  "actual_price" INTEGER NOT NULL DEFAULT 500000,
  "discount_percentage" INTEGER NOT NULL DEFAULT 0,
  "price" INTEGER NOT NULL DEFAULT 500000,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "custom_terms" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracking_pass_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_tracking_pass_plans_bounds" CHECK ("duration_days" >= 1 AND "duration_days" <= 1095 AND "price" >= 0)
);

CREATE UNIQUE INDEX "tracking_pass_plans_slug_key" ON "tracking_pass_plans"("slug");
CREATE INDEX "tracking_pass_plans_is_active_sort_order_idx" ON "tracking_pass_plans"("is_active", "sort_order");

CREATE TABLE "tracking_pass_orders" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "TrackingPassOrderStatus" NOT NULL DEFAULT 'PENDING',
  "payment_reference" TEXT,
  "invoice_expires_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "duration_days_snapshot" INTEGER NOT NULL,
  "price_snapshot" INTEGER NOT NULL,
  "terms_agreed_at" TIMESTAMP(3),
  "terms_agreed_version" TEXT DEFAULT 'v1.0',
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tracking_pass_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tracking_pass_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tracking_pass_orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tracking_pass_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chk_tracking_pass_orders_snapshots" CHECK ("duration_days_snapshot" >= 1 AND "price_snapshot" >= 0)
);

CREATE UNIQUE INDEX "tracking_pass_orders_payment_reference_key" ON "tracking_pass_orders"("payment_reference");
CREATE INDEX "tracking_pass_orders_user_id_status_idx" ON "tracking_pass_orders"("user_id", "status");
CREATE INDEX "tracking_pass_orders_user_id_created_at_idx" ON "tracking_pass_orders"("user_id", "created_at");
CREATE INDEX "tracking_pass_orders_status_invoice_expires_at_idx" ON "tracking_pass_orders"("status", "invoice_expires_at");
CREATE INDEX "tracking_pass_orders_plan_id_idx" ON "tracking_pass_orders"("plan_id");

-- 4. Immutable Tracking Entitlement Ledger (DB-Level Idempotency via Unique Source FKs)
CREATE TABLE "user_tracking_grants" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source_type" "TrackingGrantSourceType" NOT NULL,
  "status" "TrackingGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "program_enrollment_id" TEXT,
  "tracking_pass_order_id" TEXT,
  "duration_days" INTEGER NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "granted_by_id" TEXT,
  "revoked_at" TIMESTAMP(3),
  "revoke_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_tracking_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_tracking_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_tracking_grants_program_enrollment_id_fkey" FOREIGN KEY ("program_enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "user_tracking_grants_tracking_pass_order_id_fkey" FOREIGN KEY ("tracking_pass_order_id") REFERENCES "tracking_pass_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_user_tracking_grants_bounds" CHECK ("duration_days" >= 1 AND "ends_at" >= "starts_at"),
  CONSTRAINT "chk_user_tracking_grants_exclusive_source" CHECK (
    ("source_type" = 'PROGRAM_BONUS' AND "tracking_pass_order_id" IS NULL)
    OR ("source_type" = 'STANDALONE_PASS' AND "program_enrollment_id" IS NULL)
    OR ("source_type" = 'ADMIN_COMP' AND "program_enrollment_id" IS NULL AND "tracking_pass_order_id" IS NULL)
  )
);

CREATE UNIQUE INDEX "user_tracking_grants_program_enrollment_id_key" ON "user_tracking_grants"("program_enrollment_id");
CREATE UNIQUE INDEX "user_tracking_grants_tracking_pass_order_id_key" ON "user_tracking_grants"("tracking_pass_order_id");
CREATE INDEX "user_tracking_grants_user_id_status_ends_at_idx" ON "user_tracking_grants"("user_id", "status", "ends_at");
CREATE INDEX "user_tracking_grants_status_ends_at_idx" ON "user_tracking_grants"("status", "ends_at");

-- 5. Unified PaymentTransaction Exclusive Arc (PROGRAM_ENROLLMENT XOR TRACKING_PASS)
ALTER TABLE "payment_transactions"
  ADD COLUMN IF NOT EXISTS "item_type" "PaymentItemType" NOT NULL DEFAULT 'PROGRAM_ENROLLMENT',
  ADD COLUMN IF NOT EXISTS "tracking_pass_order_id" TEXT;

ALTER TABLE "payment_transactions"
  ALTER COLUMN "enrollment_id" DROP NOT NULL,
  ALTER COLUMN "program_id" DROP NOT NULL;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_tracking_pass_order_id_fkey"
  FOREIGN KEY ("tracking_pass_order_id") REFERENCES "tracking_pass_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  DROP CONSTRAINT IF EXISTS "chk_payment_tx_exclusive_target";
ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "chk_payment_tx_exclusive_target" CHECK (
    ("item_type" = 'PROGRAM_ENROLLMENT' AND "enrollment_id" IS NOT NULL AND "program_id" IS NOT NULL AND "tracking_pass_order_id" IS NULL)
    OR
    ("item_type" = 'TRACKING_PASS' AND "tracking_pass_order_id" IS NOT NULL AND "enrollment_id" IS NULL AND "program_id" IS NULL)
  );

CREATE INDEX IF NOT EXISTS "payment_transactions_tracking_pass_order_id_status_created_at_idx"
  ON "payment_transactions"("tracking_pass_order_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "payment_transactions_item_type_status_created_at_idx"
  ON "payment_transactions"("item_type", "status", "created_at");

-- 6. Universal Daily Biomarkers & Normalized Extra Workouts
CREATE TABLE "user_daily_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "log_date" DATE NOT NULL,
  "bedtime" TEXT,
  "wake_time" TEXT,
  "sleep_duration_minutes" INTEGER,
  "sleep_feeling" TEXT,
  "water_ml" INTEGER NOT NULL DEFAULT 0,
  "steps_count" INTEGER NOT NULL DEFAULT 0,
  "steps_burned_kcal" INTEGER NOT NULL DEFAULT 0,
  "meals_count" INTEGER,
  "calories_kcal" INTEGER NOT NULL DEFAULT 0,
  "carbs_g" INTEGER NOT NULL DEFAULT 0,
  "protein_g" INTEGER NOT NULL DEFAULT 0,
  "fat_g" INTEGER NOT NULL DEFAULT 0,
  "meal_quality_mode" "DailyMealQualityMode",
  "meal_feeling" TEXT,
  "meal_entries_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_daily_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_user_daily_logs_bounds" CHECK (
    "water_ml" >= 0 AND "water_ml" <= 15000
    AND "steps_count" >= 0 AND "steps_count" <= 100000
    AND "steps_burned_kcal" >= 0 AND "steps_burned_kcal" <= 10000
    AND "calories_kcal" >= 0 AND "calories_kcal" <= 15000
    AND "carbs_g" >= 0 AND "carbs_g" <= 3000
    AND "protein_g" >= 0 AND "protein_g" <= 1500
    AND "fat_g" >= 0 AND "fat_g" <= 1000
    AND ("meals_count" IS NULL OR ("meals_count" >= 1 AND "meals_count" <= 6))
    AND ("sleep_duration_minutes" IS NULL OR ("sleep_duration_minutes" >= 60 AND "sleep_duration_minutes" <= 1080))
  )
);

CREATE UNIQUE INDEX "user_daily_logs_user_id_log_date_key" ON "user_daily_logs"("user_id", "log_date");
CREATE INDEX "user_daily_logs_user_id_log_date_idx" ON "user_daily_logs"("user_id", "log_date" DESC);

CREATE TABLE "user_extra_workout_logs" (
  "id" TEXT NOT NULL,
  "daily_log_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "activity_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "estimated_kcal" INTEGER NOT NULL,
  "exclude_from_net_burn" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_extra_workout_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_extra_workout_logs_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "user_daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_extra_workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chk_user_extra_workout_logs_bounds" CHECK (
    "duration_minutes" >= 1 AND "duration_minutes" <= 360
    AND "estimated_kcal" >= 0 AND "estimated_kcal" <= 3500
  )
);

CREATE INDEX "user_extra_workout_logs_daily_log_id_idx" ON "user_extra_workout_logs"("daily_log_id");
CREATE INDEX "user_extra_workout_logs_user_id_created_at_idx" ON "user_extra_workout_logs"("user_id", "created_at");

-- 7. Seed Default 6-Month Independent Tracking Pass Plan (Idempotent)
INSERT INTO "tracking_pass_plans" (
  "id", "slug", "name", "description", "duration_days",
  "actual_price", "discount_percentage", "price", "is_active", "sort_order"
)
VALUES (
  'plan_tracking_pass_6m',
  'tracking-pass-6m',
  '6-Month Independent Tracking Pass',
  'Full access to Zera daily biomarkers (Sleep, Water, Steps, Meal & Macro Calculator, Extra Workouts) and 1-year growth analytics for 6 months without coach cohort commitment.',
  180,
  500000,
  0,
  500000,
  true,
  1
)
ON CONFLICT ("slug") DO NOTHING;

-- 8. Enable PostgreSQL Row Level Security (Deny-by-Default for Supabase PostgREST)
ALTER TABLE "tracking_pass_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_pass_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_tracking_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_daily_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_extra_workout_logs" ENABLE ROW LEVEL SECURITY;
