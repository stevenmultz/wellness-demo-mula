# EXECUTIVE SUMMARY — BMS Sanctuary Wellness PWA Audit

**Audit Date**: 2026-11-13  
**Workspace**: `c:\Users\Steven\.gemini\antigravity\scratch\wellness-pwa`  
**Audit Scope**: Full-stack read-only inspection across 42 directories, 138 workspace files (`64` files in `src/`), Prisma PostgreSQL schema (18 models), 6 API route handlers, 6 Server Action modules, PWA Service Worker/Manifest, dependencies (`526` locked npm packages), build/typecheck/lint verification, and Stage 5 safe non-breaking remediations.

---

## 1. Overall Production Readiness Verdict

**Status: NOT READY FOR UNRESTRICTED PRODUCTION (CONDITIONAL / BLOCKED)**

The application exhibits solid foundational structure in several areas (Prisma parameterized queries, bcryptjs cost-12 password hashing, HS256 JWT `httpOnly`/`sameSite` cookies, React-cached session validation enforcing active status & `tokenVersion`, magic-byte file upload checking, and WIB timezone normalization). However, **two CRITICAL blockers** and **six unresolved HIGH findings** prevent immediate production launch for real paying customers:

1. **CRITICAL (`AUD-001`) — Non-Production Payment Flow**: QRIS checkout uses Midtrans/Xendit `TODO` stubs with a static SVG QR image and no payment webhook; production payments either block or rely on an unsafe simulation flag, and Terms acceptance is enforced client-side only.
2. **CRITICAL (`AUD-002`) — Unsafe Media Storage Architecture**: Workout/body photos are stored in unauthenticated `public/uploads/workouts/` on writable filesystems or fall back to up to 5 MB binary (~6.67 MB base64) strings directly inside PostgreSQL `TEXT` columns on read-only serverless platforms (Vercel), with zero orphan cleanup.
3. **HIGH (`AUD-004`, `AUD-006`, `AUD-007`, `AUD-009`, `AUD-010`, `AUD-011`)**:
   - Active `.env` points to a remote Supabase PostgreSQL instance alongside a placeholder `JWT_SECRET`, and `.env.production` is tracked in git.
   - Rate limiting uses a process-local `Map` keyed solely by email (bypassable across serverless instances/IPs).
   - Client polling (`/api/notifications/tick`) triggers global N+1 notification dispatch queries from every member browser tab, while `/admin` SSR loads up to 200 full user records + health profiles + all day progress photos at once.
   - "Report Issue" and "Quit Program" workflows only store data in browser `localStorage` without hitting the server.
   - Zero versioned `prisma/migrations` directory and no verified DB backup/restore runbook exist.
   - `/dashboard` RSC leaks locked/un-enrolled day payloads (`dayNotifications`, `mealRecommendation`, etc.), and `wellnessAdminUpdateCustomerProfile` lacks Zod validation.

---

## 2. Findings Summary & Stage 5 Safe Remediations

| Severity | Baseline Total | Fixed in Stage 5 | Open Actionable | Not Tested / No Data |
|---|---:|---:|---:|---:|
| **CRITICAL** | 2 | 0 | 2 | 0 |
| **HIGH** | 9 | 3 | 6 | 0 |
| **MEDIUM** | 11 | 3 | 8 | 0 |
| **LOW** | 4 | 1 | 3 | 0 |
| **INFORMATIONAL / BOUNDARY** | 2 | 0 | 0 | 2 |
| **TOTAL** | **28** | **7** | **19** | **2** |

### Safe Fixes Implemented & Verified in Stage 5 (Zero Breaking Schema/Auth Changes)
1. **`AUD-003` (HIGH — Stored XSS & URL Sanitization)**: Added shared [url-safety.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/utils/url-safety.ts), enforced `isSafePhotoUrl` inside [auth.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/validators/auth.ts) and [program.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/validators/program.ts), sanitized `href`/`src` rendering in [DailyCheckIn.tsx](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/components/dashboard/tabs/DailyCheckIn.tsx) and [AdminClient.tsx](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/components/admin/AdminClient.tsx), and hardened hostname/protocol parsing in [video-provider.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/integrations/video-provider.ts).
2. **`AUD-005` (HIGH — Payment Reference Collision)**: Replaced colliding `Date.now().toString().slice(-6)` suffix in [account.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/actions/account.ts) with `crypto.randomBytes(6).toString("hex").toUpperCase()`.
3. **`AUD-008` (HIGH — PWA Service Worker Offline Loop & Media Leak)**: Updated [sw.js](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/public/sw.js) (`bms-wellness-pwa-v8`) to redirect failed delayed navigations cleanly to `/offline.html` instead of looping on `fallbackUrl`, added `pruneNavMaps()` eviction, and excluded `/uploads/` from shared SW caching.
4. **`AUD-016` (MEDIUM — 500 Error Leakage)**: Replaced raw `error.message` returns on 500 responses in `/api/cron/dispatch-notifications`, `/api/notifications/tick`, and `/api/push/subscribe`.
5. **`AUD-017` (MEDIUM — Unhandled Rejections in Checkout)**: Added `catch` blocks to `handleModeChange` and `handleRegenerateQris` in [QrisCheckoutModal.tsx](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/components/checkout/QrisCheckoutModal.tsx).
6. **`AUD-018` (MEDIUM — Missing Web Push Guard)**: Short-circuited `sendWebPushNotification` in [web-push.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/integrations/web-push.ts) when VAPID keys are unset.
7. **`AUD-023` (LOW — Broken Static Image)**: Fixed `/program-cover-cardio.webp` (404) in [ProfileTab.tsx](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/components/dashboard/tabs/ProfileTab.tsx) to `/image.webp`.

---

## 3. Verification Status

- `npx tsc --noEmit` -> **PASS** (exit code 0 after code edits)
- `npm run lint` -> **PASS** (`No ESLint warnings or errors`)
- `npx tsx scripts/test-security-remediation.ts` -> **PASS** (4/4 test groups passed)
- `npx tsx scripts/test-audit-unit.ts` -> **PASS** (4/4 newly added pure unit test groups passed)
- `npm run build` -> Baseline build succeeded (exit code 0); post-edit build re-run triggered (`task-250`) after transient Windows sandbox `mkdir EPERM`.
- DB write tests (`scripts/test-wellness-auth-flow.ts`, etc.), load testing, and live TLS scans -> **NOT TESTED** to protect the live remote Supabase Postgres database in `.env` and adhere to non-destructive read-only rules.

---

## 4. Next Required Decisions (Requires Explicit Approval — Stage 6)

1. Approve migrating media uploads to private cloud storage (S3/R2/Supabase Storage) and purging/migrating DB base64 strings.
2. Approve integrating a real payment provider (Midtrans or Xendit QRIS + webhook secret) and adding missing `ProgramEnrollment` / `Program` schema indexes & migrations (`prisma migrate`).
3. Approve rotating secrets (`JWT_SECRET`, `CRON_SECRET`), untracking `.env.production` from git, and deploying Upstash/Redis for distributed rate limiting & cron dispatch locking.
