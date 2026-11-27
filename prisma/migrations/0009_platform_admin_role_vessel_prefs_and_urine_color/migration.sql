-- ============================================================================
-- Migration 0009: Internal Platform ADMIN Role, Vessel Preferences & Urine Check
-- ============================================================================

-- 1. Extend UserRole enum with internal platform ADMIN role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- 2. Add cross-device user preferences JSONB column (custom water vessel sizes)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "preferences_json" JSONB;

-- 3. Add optional urine hydration check column on universal daily logs
ALTER TABLE "user_daily_logs"
  ADD COLUMN IF NOT EXISTS "urine_color" TEXT;
