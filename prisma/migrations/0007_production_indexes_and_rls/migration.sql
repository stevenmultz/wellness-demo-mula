-- ============================================================================
-- Migration 0007: Production Composite Indexes & Supabase Row Level Security
-- ============================================================================

-- 1. Composite Indexes for Hot WHERE + ORDER BY Queries
CREATE INDEX IF NOT EXISTS "users_deleted_at_created_at_idx" ON "users"("deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "users_role_deleted_at_created_at_idx" ON "users"("role", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "programs_status_deleted_at_created_at_idx" ON "programs"("status", "deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "programs_status_deleted_at_price_idx" ON "programs"("status", "deleted_at", "price");
CREATE INDEX IF NOT EXISTS "programs_status_deleted_at_start_at_idx" ON "programs"("status", "deleted_at", "start_at");
CREATE INDEX IF NOT EXISTS "programs_organization_id_deleted_at_created_at_idx" ON "programs"("organization_id", "deleted_at", "created_at");

CREATE INDEX IF NOT EXISTS "program_enrollments_user_id_created_at_idx" ON "program_enrollments"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "payment_transactions_enrollment_id_status_created_at_idx" ON "payment_transactions"("enrollment_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_created_at_idx" ON "payment_transactions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "payment_transactions_program_id_status_idx" ON "payment_transactions"("program_id", "status");

CREATE INDEX IF NOT EXISTS "program_day_progresses_program_day_id_completed_at_idx" ON "program_day_progresses"("program_day_id", "completed_at");
CREATE INDEX IF NOT EXISTS "program_day_progresses_user_id_completed_at_idx" ON "program_day_progresses"("user_id", "completed_at");

-- 2. Enable PostgreSQL Row Level Security (Deny-by-Default for Supabase PostgREST anon/authenticated roles)
-- Server-side Prisma connects as table owner / postgres role and bypasses RLS automatically.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_email_verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_progress_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_coaches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_equipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_daily_commitments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_coaches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_equipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_day_custom_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_day_custom_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_body_metric_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cohort_support_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_day_progresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
