# SECURITY FINDINGS REGISTER

| ID | Severity | Classification | Status | Location(s) | Summary & Impact |
|---|---|---|---|---|---|
| **AUD-001** | CRITICAL | CONFIRMED | OPEN (Requires Approval) | `src/wellness/integrations/payment-gateway.ts`, `src/wellness/actions/account.ts:569-579`, `QrisCheckoutModal.tsx` | Simulated payment confirmation & Midtrans/Xendit TODO stubs; client-only Terms verification; no payment webhook signature verification. |
| **AUD-002** | CRITICAL | CONFIRMED | OPEN (Requires Approval) | `src/app/api/upload/route.ts:63-86` | Sensitive member progress/body photos written to public unauthenticated `/uploads/workouts/` disk directory or stored as multi-MB base64 strings in PostgreSQL `TEXT` columns. |
| **AUD-003** | HIGH | CONFIRMED | **FIXED (Stage 5)** | `url-safety.ts`, `validators/{auth,program}.ts`, `video-provider.ts`, `DailyCheckIn.tsx`, `AdminClient.tsx` | Stored XSS via `javascript:` photo/video/community/meetup/map links & spoofed YouTube/Cloudflare hostname checks. Remediated & unit-tested. |
| **AUD-004** | HIGH | CONFIRMED | OPEN (Requires Approval) | `.env`, `.env.production`, `.gitignore`, `src/middleware.ts`, `session.ts`, `cron` route | Placeholder `JWT_SECRET` in active `.env`, `.env.production` tracked in git, hardcoded dev secret fallbacks, middleware omits `tokenVersion` check. |
| **AUD-006** | HIGH | CONFIRMED | OPEN (Requires Approval) | `src/wellness/security/rate-limit.ts`, `src/wellness/actions/auth.ts` | Per-process `Map` rate limiter ineffective on serverless; email-only key allows IP spraying and victim lockout. |
| **AUD-008** | HIGH | CONFIRMED | **FIXED (Stage 5)** | `public/sw.js` | Shared SW cache previously retained `/uploads/` user photos and caused an infinite offline reload loop. Excluded `/uploads/` & bumped cache to `v8`. |
| **AUD-011** | HIGH | CONFIRMED | OPEN (Recommended) | `src/app/dashboard/page.tsx`, `src/wellness/actions/admin.ts:322-407` | Locked/un-enrolled day content serialized to dashboard RSC props; `wellnessAdminUpdateCustomerProfile` missing Zod validation. |
| **AUD-015** | MEDIUM | CONFIRMED | OPEN (Recommended) | `src/components/dashboard/DashboardClient.tsx:82-84,1365-1373` | Hardcoded fallback VAPID public key string and client POST to cron endpoint without `CRON_SECRET`. |
| **AUD-016** | MEDIUM | CONFIRMED | **FIXED (Stage 5)** | `api/{cron/dispatch-notifications,notifications/tick,push/subscribe}/route.ts` | Raw `error.message` returned on HTTP 500 responses. Replaced with generic client error text. |
| **AUD-019** | MEDIUM | CONFIRMED | OPEN (Recommended) | `next.config.mjs`, `src/app/api/push/subscribe/route.ts:87` | Permissive CSP (`'unsafe-inline'`, `'unsafe-eval'`, `https:`); `PushSubscription` upsert allows endpoint reassignment across users. |
| **AUD-025** | LOW | CONFIRMED | OPEN (Recommended) | `src/middleware.ts` | Undocumented `?forceDesktop=true` query flag bypasses mobile admin redirect check (role auth still enforced). |
