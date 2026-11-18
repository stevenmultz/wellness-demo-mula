-- 1. Add optional batch_number to programs & remove deprecated/unused columns
ALTER TABLE "programs"
  ADD COLUMN IF NOT EXISTS "batch_number" INTEGER,
  DROP COLUMN IF EXISTS "is_virtual_fallback_available",
  DROP COLUMN IF EXISTS "terms_type",
  DROP COLUMN IF EXISTS "language",
  DROP COLUMN IF EXISTS "translations_json";

-- 2. Remove Target Audience pivot & master directory
DROP TABLE IF EXISTS "program_audiences";
DROP TABLE IF EXISTS "master_target_audiences";

-- 3. Remove unused/redundant columns from program_days
ALTER TABLE "program_days"
  DROP COLUMN IF EXISTS "daily_assessment",
  DROP COLUMN IF EXISTS "pending_reminder",
  DROP COLUMN IF EXISTS "completed_reminder",
  DROP COLUMN IF EXISTS "coach_name",
  DROP COLUMN IF EXISTS "recommended_for",
  DROP COLUMN IF EXISTS "translations_json";

-- 4. Create reusable ProgramTemplate table for Platform & Community custom templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProgramTemplateType') THEN
    CREATE TYPE "ProgramTemplateType" AS ENUM ('PROGRAM_HEADER', 'DAY_ROUTINE');
  END IF;
END $$;

DROP TABLE IF EXISTS "program_templates";

CREATE TABLE "program_templates" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "template_type" "ProgramTemplateType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "payload_json" JSONB NOT NULL,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "program_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "program_templates_organization_id_template_type_idx" ON "program_templates"("organization_id", "template_type");
CREATE INDEX "program_templates_template_type_idx" ON "program_templates"("template_type");

ALTER TABLE "program_templates"
  ADD CONSTRAINT "program_templates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "master_organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
