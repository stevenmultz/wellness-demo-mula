# BUG & DEFECT FINDINGS REGISTER

| ID | Severity | Classification | Status | Location(s) | Defect & Evidence |
|---|---|---|---|---|---|
| **AUD-001** | CRITICAL | CONFIRMED | OPEN (Requires Approval) | `payment-gateway.ts`, `account.ts:569-579`, `QrisCheckoutModal.tsx` | Checkout shows hardcoded static QR SVG, simulation blocks prod unless flag set, and `agreedToTerms` is unchecked server-side. |
| **AUD-002** | CRITICAL | CONFIRMED | OPEN (Requires Approval) | `src/app/api/upload/route.ts:63-86` | Serverless FS fallback writes multi-MB base64 strings directly into DB `TEXT` columns; local disk leaves unauthenticated & orphaned files. |
| **AUD-003** | HIGH | CONFIRMED | **FIXED (Stage 5)** | `url-safety.ts`, `validators/{auth,program}.ts`, `video-provider.ts`, `DailyCheckIn.tsx`, `AdminClient.tsx` | Missing URL scheme checks and substring hostname checks allowed `javascript:` URIs and spoofed YouTube/Cloudflare hosts. |
| **AUD-005** | HIGH | CONFIRMED | **FIXED (Stage 5)** | `src/wellness/actions/account.ts:415` | `FREE-${Date.now().toString().slice(-6)}` caused `P2002` unique constraint collision on concurrent/wrapped enrollments. Replaced with `crypto.randomBytes(6)`. |
| **AUD-007** | HIGH | CONFIRMED | OPEN (Requires Approval) | `dispatch-due-notifications.ts`, `tick/route.ts`, `admin/[[...slug]]/page.tsx` | Global notification fanout runs nested `findMany` queries per browser tick; `/admin` fetches 200 users + nested `healthProfile` & `dayProgress` unconditionally. |
| **AUD-008** | HIGH | CONFIRMED | **FIXED (Stage 5)** | `public/sw.js` | Navigation failure after >60ms caused an infinite reload loop offline, maps lacked eviction, and `/uploads/` photos entered shared SW cache. |
| **AUD-009** | HIGH | CONFIRMED | OPEN (Recommended) | `src/components/dashboard/tabs/MyPlanTab.tsx:1209-1231` | Issue reporting and Quit Program UI forms fake submission via `setTimeout` + `localStorage` and drop data on logout/device change. |
| **AUD-010** | HIGH | CONFIRMED | OPEN (Requires Approval) | `prisma/`, `package.json` | Missing `prisma/migrations` directory; residual SQLite `prisma/wellness.db`; no DB backup/DR verification. |
| **AUD-012** | MEDIUM | CONFIRMED | OPEN (Recommended) | `AdminClient.tsx` (11,720L), `MyPlanTab.tsx`, `DailyCheckIn.tsx` | Monolithic UI files degrade maintainability and bloat client bundles. |
| **AUD-013** | MEDIUM | CONFIRMED | OPEN (Requires Approval) | `prisma/schema.prisma` | Missing indexes (`invoiceExpiresAt`, `[userId, createdAt]`, `PasswordResetToken.expiresAt`); `Float` currency; unvalidated status strings. |
| **AUD-014** | MEDIUM | CONFIRMED | OPEN (Recommended) | `src/wellness/actions/master.ts` | Master rename sync misses multi-value comma-joined strings and skips `$transaction`; synthetic `mc-1` IDs returned when empty. |
| **AUD-017** | MEDIUM | CONFIRMED | **FIXED (Stage 5)** | `QrisCheckoutModal.tsx:96-153` | `handleModeChange` & `handleRegenerateQris` omitted `catch` blocks, causing unhandled promise rejections on failure. |
| **AUD-018** | MEDIUM | CONFIRMED | **FIXED (Stage 5)** | `src/wellness/integrations/web-push.ts` | Attempted `webpush.sendNotification` even when VAPID env vars were empty strings. |
| **AUD-021** | MEDIUM | CONFIRMED | OPEN (Recommended) | `public/video.mp4`, `globals.css`, `api/explore/programs` | 31.2 MB unchunked hero video; global mobile `backdrop-filter` disable; uncached explore endpoint capped at 100. |
| **AUD-023** | LOW | CONFIRMED | **FIXED (Stage 5)** | `ProfileTab.tsx:387` | Referenced non-existent `/program-cover-cardio.webp` (HTTP 404). Fixed to `/image.webp`. |
| **AUD-024** | LOW | CONFIRMED | OPEN (Recommended) | `README.md`, `prisma/wellness.db`, `scratch/` | Stale SQLite docs and unused scratch/SQLite artifacts remain. |
