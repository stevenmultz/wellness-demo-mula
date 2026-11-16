-- AlterTable
ALTER TABLE "program_day_progress" DROP COLUMN "photo_after_url",
DROP COLUMN "photo_before_url";

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "program_day_custom_submissions_program_day_id_idx" ON "program_day_custom_submissions"("program_day_id");

-- CreateIndex
CREATE INDEX "user_body_metric_logs_user_id_program_day_id_source_idx" ON "user_body_metric_logs"("user_id", "program_day_id", "source");

