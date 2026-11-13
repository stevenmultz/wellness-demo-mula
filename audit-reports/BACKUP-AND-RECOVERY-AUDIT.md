# BACKUP, MIGRATIONS & DISASTER RECOVERY AUDIT

## 1. Database Migration & Drift Findings (`AUD-010` — HIGH, OPEN)

- **No Versioned Migration History**: `prisma/migrations/` does not exist in the repository. `package.json` contains no `prisma migrate deploy` or backup/restore scripts.
- **Residual SQLite Artifact (`AUD-024`)**: A `540 KB` `prisma/wellness.db` file remains in `prisma/` even though `prisma/schema.prisma` targets `postgresql`. `README.md` still contains outdated SQLite setup commands.
- **Risk**: Running `prisma db push` directly against production Supabase Postgres without versioned SQL migrations risks silent column drops, failed locks during type changes, and zero rollback capability if a release needs to be reverted.

---

## 2. Backup, PITR & Recovery Assessment

| Control | Current State | Verification |
|---|---|---|
| **Automated DB Backups / PITR** | Relies entirely on Supabase project plan defaults (unverified from workspace code/config) | `NO DATA` / `NOT VERIFIED` |
| **Application-Level Export / Backup Cron** | Not implemented | `CONFIRMED ABSENT` |
| **Restore / RPO / RTO Drill Runbook** | None present in repo or docs | `CONFIRMED ABSENT` |
| **Media Asset Backup (`public/uploads`)** | Stored on ephemeral container/local disk or embedded in DB `TEXT` columns | `HIGH RISK` (files lost on ephemeral deploy; DB bloated by base64) |
| **Destructive Action Safeguards** | Account deletion (`wellnessDeleteAccount`) permanently cascades `User` -> enrollments, progress, health profile, notifications; zero soft-delete/grace period | `CONFIRMED` |

---

## 3. Recommended DR Roadmap (Requires Approval — Stage 6)
1. Generate an initial baseline Prisma migration (`prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma`) and commit `prisma/migrations/`.
2. Enforce `prisma migrate deploy` in CI/CD; disallow `prisma db push` in production.
3. Verify Supabase automated daily backups & Point-in-Time Recovery (PITR) retention tier, document RPO/RTO targets, and schedule quarterly restore verification tests to a staging project.
4. Move user media to object storage with bucket versioning + lifecycle rules before any production launch (`AUD-002`).
