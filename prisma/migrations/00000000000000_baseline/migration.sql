-- CreateTable
CREATE TABLE "customer_health_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "photo_front_url" TEXT,
    "photo_side_url" TEXT,
    "photo_back_url" TEXT,
    "age" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "diet_type" TEXT,
    "waist_cm" DOUBLE PRECISION,
    "chest_cm" DOUBLE PRECISION,
    "hips_cm" DOUBLE PRECISION,
    "current_mood" TEXT,
    "energy_level" INTEGER,
    "routine_confidence" INTEGER,
    "workout_frequency" TEXT,
    "average_bedtime" TEXT,
    "average_wake_time" TEXT,
    "sleep_quality_notes" TEXT,
    "eating_patterns" TEXT,
    "injuries_or_conditions" TEXT,
    "food_allergies" TEXT,
    "primary_goal" TEXT,
    "coach_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_coaches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_daily_commitments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_daily_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_equipments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "logo_url" TEXT,
    "website_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_target_audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_target_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_audiences" (
    "program_id" TEXT NOT NULL,
    "audience_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_audiences_pkey" PRIMARY KEY ("program_id","audience_id")
);

-- CreateTable
CREATE TABLE "program_categories" (
    "program_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_categories_pkey" PRIMARY KEY ("program_id","category_id")
);

-- CreateTable
CREATE TABLE "program_coaches" (
    "program_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_coaches_pkey" PRIMARY KEY ("program_id","coach_id")
);

-- CreateTable
CREATE TABLE "program_day_custom_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_day_id" TEXT NOT NULL,
    "custom_task_id" TEXT NOT NULL,
    "values_json" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_custom_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day_custom_tasks" (
    "id" TEXT NOT NULL,
    "program_day_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "fields_schema" TEXT NOT NULL,
    "translations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_custom_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_day_id" TEXT NOT NULL,
    "video_watched" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "checklist_completed" TEXT,
    "selected_workout" TEXT,
    "photo_before_url" TEXT,
    "photo_after_url" TEXT,
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_days" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "day_type" TEXT NOT NULL DEFAULT 'TRAINING_DAY',
    "workout_options" TEXT,
    "sleep_recommendation" TEXT,
    "day_notifications" TEXT,
    "video_url" TEXT,
    "video_checklist" TEXT,
    "meal_recommendation" TEXT,
    "daily_assessment" TEXT,
    "pending_reminder" TEXT,
    "completed_reminder" TEXT,
    "meetup_link" TEXT,
    "map_link" TEXT,
    "onsite_venue" TEXT,
    "onsite_schedule" TEXT,
    "event_title" TEXT,
    "event_host" TEXT,
    "event_details" TEXT,
    "rest_instructions" TEXT,
    "coach_name" TEXT,
    "recommended_for" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "translations" TEXT,

    CONSTRAINT "program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attendance_mode" TEXT NOT NULL DEFAULT 'VIRTUAL',
    "payment_reference" TEXT,
    "invoice_expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "terms_agreed_at" TIMESTAMP(3),
    "terms_agreed_version" TEXT DEFAULT 'v1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_equipments" (
    "program_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_equipments_pkey" PRIMARY KEY ("program_id","equipment_id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image" TEXT,
    "difficulty_level" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "duration_days" INTEGER NOT NULL DEFAULT 21,
    "actual_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_percentage" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_quota" INTEGER NOT NULL DEFAULT 50,
    "community_link" TEXT,
    "location_type" TEXT NOT NULL DEFAULT 'ONLINE',
    "city" TEXT,
    "venue_address" TEXT,
    "virtual_fallback_available" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registration_open_date" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "daily_commitment_id" TEXT,
    "terms_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "custom_terms" TEXT,
    "target_state" TEXT,
    "methodology" TEXT,
    "expected_benefits" TEXT,
    "scientific_references" TEXT,
    "program_guidelines" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Pilates',
    "equipment" TEXT,
    "daily_commitment" TEXT,
    "recommended_for" TEXT NOT NULL DEFAULT 'All Levels • Mindful Movement & Longevity',
    "coach_name" TEXT NOT NULL DEFAULT 'Head Wellness Coach',
    "coach_title" TEXT DEFAULT 'Movement & Longevity Specialist',
    "category_cache" TEXT,
    "coach_cache" TEXT,
    "equipment_cache" TEXT,
    "audience_cache" TEXT,
    "commitment_cache" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'id',
    "organization_cache" TEXT,
    "organization_id" TEXT,
    "translations" TEXT,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_body_metric_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_id" TEXT,
    "program_day_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CUSTOM_TASK',
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "waist_cm" DOUBLE PRECISION,
    "chest_cm" DOUBLE PRECISION,
    "hips_cm" DOUBLE PRECISION,
    "body_fat_pct" DOUBLE PRECISION,
    "resting_hr" INTEGER,
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_body_metric_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "occupation" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "avatar_url" TEXT,
    "date_of_birth" DATE,
    "coach_profile_id" TEXT,
    "organization_id" TEXT,
    "preferred_locale" TEXT NOT NULL DEFAULT 'id',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_health_profiles_user_id_key" ON "customer_health_profiles"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_categories_name_key" ON "master_categories"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_daily_commitments_name_key" ON "master_daily_commitments"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_equipments_name_key" ON "master_equipments"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_organizations_name_key" ON "master_organizations"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_organizations_slug_key" ON "master_organizations"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_target_audiences_name_key" ON "master_target_audiences"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id" ASC);

-- CreateIndex
CREATE INDEX "program_audiences_audience_id_idx" ON "program_audiences"("audience_id" ASC);

-- CreateIndex
CREATE INDEX "program_categories_category_id_idx" ON "program_categories"("category_id" ASC);

-- CreateIndex
CREATE INDEX "program_coaches_coach_id_idx" ON "program_coaches"("coach_id" ASC);

-- CreateIndex
CREATE INDEX "program_day_custom_submissions_custom_task_id_idx" ON "program_day_custom_submissions"("custom_task_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "program_day_custom_submissions_user_id_custom_task_id_key" ON "program_day_custom_submissions"("user_id" ASC, "custom_task_id" ASC);

-- CreateIndex
CREATE INDEX "program_day_custom_submissions_user_id_program_day_id_idx" ON "program_day_custom_submissions"("user_id" ASC, "program_day_id" ASC);

-- CreateIndex
CREATE INDEX "program_day_custom_tasks_program_day_id_sort_order_idx" ON "program_day_custom_tasks"("program_day_id" ASC, "sort_order" ASC);

-- CreateIndex
CREATE INDEX "program_day_progress_is_completed_idx" ON "program_day_progress"("is_completed" ASC);

-- CreateIndex
CREATE INDEX "program_day_progress_program_day_id_idx" ON "program_day_progress"("program_day_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "program_day_progress_user_id_program_day_id_key" ON "program_day_progress"("user_id" ASC, "program_day_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "program_days_program_id_day_number_key" ON "program_days"("program_id" ASC, "day_number" ASC);

-- CreateIndex
CREATE INDEX "program_days_program_id_idx" ON "program_days"("program_id" ASC);

-- CreateIndex
CREATE INDEX "program_enrollments_created_at_idx" ON "program_enrollments"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "program_enrollments_payment_reference_key" ON "program_enrollments"("payment_reference" ASC);

-- CreateIndex
CREATE INDEX "program_enrollments_program_id_status_idx" ON "program_enrollments"("program_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "program_enrollments_status_idx" ON "program_enrollments"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "program_enrollments_user_id_program_id_key" ON "program_enrollments"("user_id" ASC, "program_id" ASC);

-- CreateIndex
CREATE INDEX "program_equipments_equipment_id_idx" ON "program_equipments"("equipment_id" ASC);

-- CreateIndex
CREATE INDEX "programs_daily_commitment_id_idx" ON "programs"("daily_commitment_id" ASC);

-- CreateIndex
CREATE INDEX "programs_location_type_is_published_idx" ON "programs"("location_type" ASC, "is_published" ASC);

-- CreateIndex
CREATE INDEX "programs_organization_id_idx" ON "programs"("organization_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug" ASC);

-- CreateIndex
CREATE INDEX "programs_status_is_published_start_date_idx" ON "programs"("status" ASC, "is_published" ASC, "start_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "user_body_metric_logs_user_id_program_id_idx" ON "user_body_metric_logs"("user_id" ASC, "program_id" ASC);

-- CreateIndex
CREATE INDEX "user_body_metric_logs_user_id_recorded_at_idx" ON "user_body_metric_logs"("user_id" ASC, "recorded_at" ASC);

-- CreateIndex
CREATE INDEX "user_notifications_user_id_created_at_idx" ON "user_notifications"("user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_user_id_dedupe_key_key" ON "user_notifications"("user_id" ASC, "dedupe_key" ASC);

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_idx" ON "user_notifications"("user_id" ASC, "read_at" ASC);

-- CreateIndex
CREATE INDEX "users_coach_profile_id_idx" ON "users"("coach_profile_id" ASC);

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role" ASC);

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status" ASC);

-- AddForeignKey
ALTER TABLE "customer_health_profiles" ADD CONSTRAINT "customer_health_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_audiences" ADD CONSTRAINT "program_audiences_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "master_target_audiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_audiences" ADD CONSTRAINT "program_audiences_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_coaches" ADD CONSTRAINT "program_coaches_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "master_coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_coaches" ADD CONSTRAINT "program_coaches_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_custom_submissions" ADD CONSTRAINT "program_day_custom_submissions_custom_task_id_fkey" FOREIGN KEY ("custom_task_id") REFERENCES "program_day_custom_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_custom_submissions" ADD CONSTRAINT "program_day_custom_submissions_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_custom_submissions" ADD CONSTRAINT "program_day_custom_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_custom_tasks" ADD CONSTRAINT "program_day_custom_tasks_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_progress" ADD CONSTRAINT "program_day_progress_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_progress" ADD CONSTRAINT "program_day_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_equipments" ADD CONSTRAINT "program_equipments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "master_equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_equipments" ADD CONSTRAINT "program_equipments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_daily_commitment_id_fkey" FOREIGN KEY ("daily_commitment_id") REFERENCES "master_daily_commitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "master_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_body_metric_logs" ADD CONSTRAINT "user_body_metric_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_coach_profile_id_fkey" FOREIGN KEY ("coach_profile_id") REFERENCES "master_coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "master_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

