# INFRASTRUCTURE, ENVIRONMENT & CI/CD AUDIT

## 1. Environment & Secrets Configuration Findings (`AUD-004` — HIGH, OPEN)

| File | Git Tracked | Contents / Risk |
|---|---|---|
| `.env` | Ignored (`.gitignore`) | Points `DATABASE_URL` & `DIRECT_URL` to remote Supabase pooler (`aws-0-ap-northeast-2.pooler.supabase.com` ports `6543` / `5432`) alongside a **placeholder `JWT_SECRET`** (`placeholder=true`, length `54`). |
| `.env.example` | Tracked | Documents required keys (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `APP_URL`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). |
| `.env.production` | **Tracked in Git** | Currently `512 bytes` of comments only (no active `KEY=VAL` pairs), omitted from `.gitignore` — high risk of future accidental secret commit. |

- **Hardcoded Fallback Secrets in Code (`AUD-004`)**:
  - `src/middleware.ts:10`, `src/wellness/security/session.ts:12`, and `src/app/api/cron/dispatch-notifications/route.ts` provide hardcoded fallback secret strings if env vars are missing, instead of failing closed in production.
  - `src/components/dashboard/DashboardClient.tsx:82-84` embeds a hardcoded fallback `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (`AUD-015`).

---

## 2. Hosting, Scheduling & CI/CD Findings

1. **Vercel Hobby Cron Constraint (`AUD-026` — LOW, OPEN)**:
   - `vercel.json` defines a single cron job: `/api/cron/dispatch-notifications` at `0 0 * * *` (once per day at 00:00 UTC / 07:00 WIB). Because cohort notifications schedule across arbitrary WIB times throughout the day, the app relies on open member browsers polling `/api/notifications/tick` (`AUD-007`). If zero members keep `/dashboard` open at a scheduled time, notifications are delayed until someone opens the app or next day's cron.
2. **Missing CI/CD & Quality Gates (`AUD-022` — MEDIUM, OPEN)**:
   - No `.github/workflows/`, `Dockerfile`, or deployment verification pipeline exists in the workspace.
   - No automated test, lint, typecheck, migration check, or dependency audit gate runs prior to deployment.
3. **Serverless Execution Constraints**:
   - In-memory rate-limit `Map()` (`AUD-006`) resets across Vercel Lambda cold starts and scales independently per instance.
   - Ephemeral read-only filesystem on Vercel forces `/api/upload` into PostgreSQL base64 fallback mode (`AUD-002`).
4. **Live Infrastructure / TLS Checks (`AUD-027` — NOT TESTED)**:
   - Live DNS, Vercel headers, SSL/TLS certificate chain, and Supabase network rules could not be probed from the sandbox without a live deployment target.
