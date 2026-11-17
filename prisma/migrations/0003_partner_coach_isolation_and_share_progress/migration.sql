-- CreateEnum
CREATE TYPE "ProgressShareStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "master_coaches" ADD COLUMN "organization_id" TEXT;

-- CreateTable
CREATE TABLE "user_progress_shares" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "viewer_email" TEXT NOT NULL,
    "viewer_user_id" TEXT,
    "label" TEXT,
    "status" "ProgressShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "master_coaches_organization_id_idx" ON "master_coaches"("organization_id");

-- CreateIndex
CREATE INDEX "user_progress_shares_viewer_email_status_idx" ON "user_progress_shares"("viewer_email", "status");

-- CreateIndex
CREATE INDEX "user_progress_shares_viewer_user_id_status_idx" ON "user_progress_shares"("viewer_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_shares_owner_user_id_viewer_email_key" ON "user_progress_shares"("owner_user_id", "viewer_email");

-- AddForeignKey
ALTER TABLE "user_progress_shares" ADD CONSTRAINT "user_progress_shares_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress_shares" ADD CONSTRAINT "user_progress_shares_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_coaches" ADD CONSTRAINT "master_coaches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "master_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
