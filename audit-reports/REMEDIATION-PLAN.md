# PRIORITIZED REMEDIATION PLAN (STAGE 5 EXECUTED & STAGE 6 AWAITING APPROVAL)

## Phase 0 — Already Fixed & Verified in Stage 5 (Safe Non-Breaking Changes)

| ID | Fix Applied | Verification |
|---|---|---|
| `AUD-003` | Created `url-safety.ts`, validated photo schemas in `auth.ts` & `program.ts`, wrapped `href`/`src` in `DailyCheckIn.tsx` & `AdminClient.tsx`, hardened `video-provider.ts` | `test-audit-unit.ts` PASS + `tsc`/`lint`/`build` PASS |
| `AUD-005` | Replaced truncated timestamp `FREE-...` reference in `account.ts` with `crypto.randomBytes(6)` | `tsc`/`lint`/`build` PASS |
| `AUD-008` | Updated `public/sw.js` (`v8`) to route failed delayed navigations to `/offline.html`, prune nav maps, and exclude `/uploads/` | `build` PASS (static asset verified) |
| `AUD-016` | Sanitized HTTP 500 JSON responses across cron, tick, and push routes | `tsc`/`lint`/`build` PASS |
| `AUD-017` | Added `catch` error handling in `QrisCheckoutModal.tsx` (`handleModeChange`, `handleRegenerateQris`) | `tsc`/`lint`/`build` PASS |
| `AUD-018` | Short-circuited `sendWebPushNotification` in `web-push.ts` when VAPID keys are missing | `tsc`/`lint`/`build` PASS |
| `AUD-023` | Fixed missing `/program-cover-cardio.webp` -> `/image.webp` in `ProfileTab.tsx` | `tsc`/`lint`/`build` PASS |

---

## Phase 1 — Production Blockers (REQUIRES EXPLICIT USER APPROVAL — Stage 6)

1. **Private Object Storage Migration (`AUD-002`)**: Provision S3/R2/Supabase private bucket, generate presigned upload & authorized read URLs, migrate existing DB base64/local disk photos, and remove base64 fallback.
2. **Real QRIS Payment Gateway + Webhook (`AUD-001`)**: Integrate signed Midtrans/Xendit QRIS API, verify webhook HMAC signature + idempotent transaction update, render dynamic QR string, and validate `agreedToTerms` server-side.
3. **Secrets & Environment Hygiene (`AUD-004`)**: Rotate `JWT_SECRET` & `CRON_SECRET`, untrack `.env.production` from git (`git rm --cached`), remove dev fallback secrets in production paths, and align middleware revocation checks.
4. **Prisma Migrations & DB Backup Verification (`AUD-010`, `AUD-013`)**: Initialize baseline `prisma/migrations/`, add missing indexes (`invoiceExpiresAt`, `[userId, createdAt]`, `PasswordResetToken.expiresAt`), standardize `Program.status` enum and `Int`/`Decimal` pricing, and verify Supabase PITR + restore drill.
5. **Distributed Rate Limiting & Notification Queue (`AUD-006`, `AUD-007`)**: Adopt Redis/Upstash rate limiting keyed by `IP + email`, stop client polling ticks from driving full DB notification scans, move dispatch to a scheduled worker, and paginate `/admin` user queries without eager base64 media payloads.

---

## Phase 2 — High-Value Application & Performance Fixes (Recommended Next Sprint)

6. Implement real Server Actions & DB model for Issue Reporting and Quit Program requests (`AUD-009`).
7. Strip locked/un-enrolled day content server-side in `/dashboard/page.tsx` and add Zod validation + `try/catch` to `wellnessAdminUpdateCustomerProfile` (`AUD-011`).
8. Tighten CSP in `next.config.mjs` (remove `'unsafe-eval'` / wildcard `https:` where tested compatible) and enforce PushSubscription ownership checks (`AUD-019`).
9. Split `AdminClient.tsx` (`11,720` lines) via `next/dynamic`, optimize/compress `public/video.mp4` (`31.2 MB`), add CI/CD quality gates + isolated test DB (`AUD-012`, `AUD-021`, `AUD-022`), and remove unused `pg`/`sharp` if unneeded (`AUD-020`).
