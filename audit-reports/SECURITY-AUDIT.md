# APPLICATION SECURITY AUDIT

## 1. OWASP Top 10 & Security Domain Assessment

| Domain | Status / Verdict | Evidence & Key Observations |
|---|---|---|
| **A01 Broken Access Control** | **PARTIAL / GAPS FOUND** | Server Actions consistently use `requireAuth()` / `requireAdmin()` (`src/wellness/security/guards.ts`), and `getWellnessSession()` validates `status === "ACTIVE"` + `tokenVersion`. However: (1) `src/middleware.ts` checks JWT signature only (does not check `tokenVersion` or `status`), (2) `src/app/dashboard/page.tsx` serializes locked/un-enrolled day details (`dayNotifications`, `mealRecommendation`, `dailyAssessment`, `eventDetails`) even when gated on video/meetup links (`AUD-011`), (3) `/api/push/subscribe` upserts by `endpoint` without checking ownership (`AUD-019`), (4) `public/uploads/workouts/` stores member body/progress photos without access control (`AUD-002`). |
| **A02 Cryptographic & Secret Management** | **HIGH RISK** | Password hashing uses `bcryptjs` (12 rounds) and reset tokens use `crypto.randomBytes(32)` + SHA-256 hashing (`src/wellness/actions/auth.ts`). However, `.env` points to remote Supabase PostgreSQL alongside a placeholder `JWT_SECRET`, `.env.production` is tracked by git (`git ls-files .env*`), and fallback secrets exist in `src/middleware.ts`, `src/wellness/security/session.ts`, and `src/app/api/cron/dispatch-notifications/route.ts` (`AUD-004`). |
| **A03 Injection (SQLi, XSS, Command)** | **SQLi PROTECTED / XSS REMEDIATED** | All database queries use Prisma ORM parameterized calls (`$queryRawUnsafe` not present). Stored XSS risks via `javascript:` photo/video/community/meetup/map links and substring video host checks (`AUD-003`) were **fixed in Stage 5** via `src/wellness/utils/url-safety.ts`, Zod validator checks, UI sanitization, and strict `video-provider.ts` hostname checks. |
| **A04 Insecure Design** | **CRITICAL RISK** | Payment confirmation (`AUD-001`) uses simulation stubs + client-only Terms agreement check + static SVG QR code. "Quit Program" and "Report Issue" persist only to `localStorage` (`AUD-009`). |
| **A05 Security Misconfiguration** | **MEDIUM-HIGH RISK** | `next.config.mjs` enables `HSTS`, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `COOP: same-origin`, `CORP: cross-origin`, `poweredByHeader: false`, but CSP allows `'unsafe-inline'`, `'unsafe-eval'`, and broad `https:` (`AUD-019`). API routes previously leaked raw `error.message` on 500s (**fixed in Stage 5** — `AUD-016`). |
| **A06 Vulnerable Components** | **NOT TESTED (OFFLINE)** | 526 locked npm dependencies (`package-lock.json`); `npm audit` CVE feed unavailable in offline sandbox (`AUD-028`); unused `pg` & `sharp` + `LGPL-3.0-or-later` transitive dependencies (`AUD-020`). |
| **A07 Identification & Authentication** | **HIGH RISK (RATE LIMIT)** | `wellness_session` cookie uses `httpOnly`, `sameSite: "lax"`, `secure: NODE_ENV === "production"`, and 7-day expiry. However, `src/wellness/security/rate-limit.ts` uses a process-local `Map` keyed only by `email` on login/forgot-password (`AUD-006`). |
| **A08 Integrity Failures** | **CRITICAL / HIGH** | No payment webhook HMAC verification exists (`AUD-001`). Database schema uses `prisma db push` without versioned migrations (`AUD-010`). No CI/CD pipeline enforces tests (`AUD-022`). |
| **A09 Logging & Monitoring Failures** | **NOT IMPLEMENTED** | Only unstructured `console.error`/`console.warn` exists; zero SIEM/APM telemetry or brute-force alerting (`AUD-028`). |
| **A10 SSRF** | **PARTIALLY HARDENED** | Push endpoints validate against trusted Web Push hostnames (`scripts/test-security-remediation.ts` passes). Video provider parsing previously allowed substring hostname spoofing (`AUD-003` — **fixed in Stage 5**). |

---

## 2. Security Headers Audit (`next.config.mjs`)

| Header | Configured Value | Assessment |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Strong HTTPS enforcement at edge |
| `X-Content-Type-Options` | `nosniff` | Properly prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Strong anti-clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Appropriately restrictive |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Properly disables unused hardware APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` | Good isolation |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Permissive for cross-origin embed assets |
| `Content-Security-Policy` | Allows `'unsafe-inline'`, `'unsafe-eval'`, `https:` for `img-src`/`media-src`/`frame-src`/`connect-src` | Overly permissive; weakens XSS defense-in-depth (`AUD-019`) |
| **Live TLS / Certs** | *Not inspected on live domain* | `NOT TESTED` (no live production domain accessed; `AUD-027`) |
