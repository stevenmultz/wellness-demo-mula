-- 1. Convert any ONSITE programs to HYBRID before narrowing the enum
UPDATE "programs"
SET "location_type" = 'HYBRID'
WHERE "location_type" = 'ONSITE';

-- 2. Narrow ProgramLocationType enum to ('ONLINE', 'HYBRID')
CREATE TYPE "ProgramLocationType_new" AS ENUM ('ONLINE', 'HYBRID');
ALTER TABLE "programs" ALTER COLUMN "location_type" DROP DEFAULT;
ALTER TABLE "programs"
  ALTER COLUMN "location_type" TYPE "ProgramLocationType_new"
  USING ("location_type"::text::"ProgramLocationType_new");
ALTER TYPE "ProgramLocationType" RENAME TO "ProgramLocationType_old";
ALTER TYPE "ProgramLocationType_new" RENAME TO "ProgramLocationType";
DROP TYPE "ProgramLocationType_old";
ALTER TABLE "programs" ALTER COLUMN "location_type" SET DEFAULT 'ONLINE';

-- 3. Allow NULL date ranges for Full Online (anytime) programs, and add intro_video_url
ALTER TABLE "programs"
  ADD COLUMN "intro_video_url" TEXT,
  ALTER COLUMN "start_at" DROP NOT NULL,
  ALTER COLUMN "start_at" DROP DEFAULT,
  ALTER COLUMN "end_at" DROP NOT NULL,
  ALTER COLUMN "end_at" DROP DEFAULT,
  ALTER COLUMN "registration_deadline_at" DROP NOT NULL,
  ALTER COLUMN "registration_deadline_at" DROP DEFAULT;

-- 4. Full Online programs do not have a fixed cohort date range or venue
UPDATE "programs"
SET "start_at" = NULL,
    "end_at" = NULL,
    "registration_open_at" = NULL,
    "registration_deadline_at" = NULL,
    "city" = NULL,
    "venue_address" = NULL
WHERE "location_type" = 'ONLINE';

-- 5. Full Online programs do not have Connect Days (convert any existing ones to TRAINING_DAY)
UPDATE "program_days" pd
SET "day_type" = 'TRAINING_DAY',
    "title" = REPLACE(pd."title", 'Cohort Live Circle & Form Review', 'Mobility & Core Integration Session'),
    "video_url" = COALESCE(NULLIF(BTRIM(pd."video_url"), ''), 'https://www.youtube.com/watch?v=sTANio_2E0Q'),
    "video_checklist_json" = CASE
      WHEN pd."video_checklist_json" IS NULL OR jsonb_array_length(pd."video_checklist_json") = 0
      THEN '["5 min diaphragmatic breathing & posture check","15 min guided mobility & core sequence","5 min gentle fascial cooldown"]'::jsonb
      ELSE pd."video_checklist_json"
    END,
    "workout_options_json" = CASE
      WHEN pd."workout_options_json" IS NULL OR jsonb_array_length(pd."workout_options_json") = 0
      THEN '["Hot Pilates","Strength & Conditioning","Yoga & Mobility Flow","Mat Pilates Core"]'::jsonb
      ELSE pd."workout_options_json"
    END,
    "meetup_link" = NULL,
    "map_link" = NULL,
    "onsite_venue" = NULL,
    "onsite_schedule" = NULL,
    "event_title" = NULL,
    "event_host" = NULL,
    "event_details" = NULL
FROM "programs" p
WHERE pd."program_id" = p."id"
  AND p."location_type" = 'ONLINE'
  AND pd."day_type" IN ('CONNECTION_DAY', 'MEETUP_DAY');

-- 6. For existing ONLINE active enrollments, remove cohort expiry (accessible anytime)
UPDATE "program_enrollments" pe
SET "valid_until_at" = NULL
FROM "programs" p
WHERE pe."program_id" = p."id"
  AND p."location_type" = 'ONLINE';

-- 7. Enforce DB-level integrity:
--    - ONLINE programs have no cohort date range
--    - Published HYBRID programs must have start_at <= end_at and registration_deadline_at
ALTER TABLE "programs"
  ADD CONSTRAINT "programs_mode_schedule_integrity_chk"
  CHECK (
    (
      "location_type" = 'ONLINE'
      AND "start_at" IS NULL
      AND "end_at" IS NULL
      AND "registration_deadline_at" IS NULL
    )
    OR
    (
      "location_type" = 'HYBRID'
      AND (
        "status" <> 'PUBLISHED'
        OR (
          "start_at" IS NOT NULL
          AND "end_at" IS NOT NULL
          AND "registration_deadline_at" IS NOT NULL
          AND "start_at" <= "end_at"
        )
      )
    )
  );
