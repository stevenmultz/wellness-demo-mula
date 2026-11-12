# APPLICATION SECURITY AUDIT (OWASP TOP 10 EVALUATION)

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Standard:** OWASP Top 10 (2021), CWE / SANS Top 25, NIST SP 800-63B  
**Security Posture:** Medium-High Application Hardening, Critical Secrets & Configuration Remediations Required  
**Audit Scope:** Authentication, Authorization, APIs, Session Lifecycle, Data Validation, Cryptography, Supply Chain  

---

## 1. OWASP Top 10 (2021) Compliance Matrix

| OWASP Category | Finding Reference | Risk Level | Status | Evaluation Summary |
| :--- | :--- | :--- | :--- | :--- |
| **A01: Broken Access Control** | SEC-01, SEC-07 | **HIGH** | **CONFIRMED** | RBAC guards (`requireAuth`, `requireSuperadmin`) and IDOR protections are strictly implemented across server actions. However, hardcoded JWT fallback secret enables potential privilege escalation to `SUPERADMIN` if `JWT_SECRET` is unset. |
| **A02: Cryptographic Failures** | SEC-01, SEC-02 | **CRITICAL** | **CONFIRMED** | Static fallback JWT secret in `middleware.ts` and hardcoded `VAPID_PRIVATE_KEY` in `src/wellness/integrations/web-push.ts`. Password hashing uses `bcryptjs` with cost factor 12 (Secure). |
| **A03: Injection** | N/A | **LOW** | **PASS** | Parameterized queries enforced via Prisma ORM throughout. No raw SQL (`$queryRaw`) exists. XSS risks minimized via React JSX escaping; `dangerouslySetInnerHTML` restricted to controlled static scripts in `layout.tsx`. |
| **A04: Insecure Design** | SEC-04, PERF-01 | **HIGH** | **CONFIRMED** | In-memory sliding-window rate limiter fails across distributed serverless lambdas. Client-triggered `/api/notifications/tick` initiates global platform-wide push dispatches. |
| **A05: Security Misconfiguration** | SEC-03, SEC-05 | **HIGH** | **CONFIRMED** | Missing `Content-Security-Policy` (CSP) and `Strict-Transport-Security` (HSTS). Cron secret accepted via URL query parameter (`?secret=...`). |
| **A06: Vulnerable & Outdated Components**| DEP-01 | **MEDIUM** | **PASS WITH WARNINGS** | Next.js 14.2.13 has known public advisories resolved in 14.2.15+. No malicious packages identified. `sharp` misplaced in `devDependencies`. |
| **A07: Identification & Auth Failures** | SEC-04 | **MEDIUM** | **PASS WITH WARNINGS** | Strong password policy (8+ chars, uppercase, digits). Real-time `tokenVersion` invalidation on password change. Brute-force protection requires multi-instance Redis store. |
| **A08: Software & Data Integrity Failures**| SEC-06 | **LOW** | **PASS** | True magic byte verification (`detectImageMime`) implemented on `/api/upload` and `/api/profile/avatar`, rejecting client-spoofed MIME types. |
| **A09: Security Logging & Monitoring Failures**| SEC-08 | **MEDIUM** | **CONFIRMED** | Security events (failed logins, rate limit breaches, admin actions) logged via raw `console.error` without structured format, alerting hooks, or correlation IDs. |
| **A10: Server-Side Request Forgery (SSRF)**| SEC-09 | **LOW** | **PASS** | Web push endpoint registration strictly validates hostnames against trusted push providers (`fcm.googleapis.com`, `push.apple.com`, `mozilla.com`), blocking private IPs and cloud metadata (`169.254.169.254`). |

---

## 2. In-Depth Vulnerability Analysis

### 2.1 Hardcoded Fallback JWT Secret (CRITICAL — SEC-01)
- **Vulnerable Files:** `src/middleware.ts#L7-L8`, `src/wellness/security/session.ts#L11-L13`
- **Code:**
  ```typescript
  const rawSecret = process.env.JWT_SECRET;
  const SECRET_KEY = new TextEncoder().encode(
    rawSecret || "wellness_platform_dev_only_jwt_secret_do_not_use_in_prod"
  );
  ```
- **Mechanics:** If the application is started in production or staging without `process.env.JWT_SECRET` properly injected (e.g. deployment script failure or misconfigured container), the application defaults to a widely known static string.
- **Exploitation Scenario:** An attacker signs a custom JWT with `{ userId: "admin", email: "attacker@bms.id", role: "SUPERADMIN", tokenVersion: 0 }` using the HMAC-SHA256 algorithm with `"wellness_platform_dev_only_jwt_secret_do_not_use_in_prod"`. The middleware accepts the token, granting unrestricted access to `/admin` routes.
- **Remediation:** In production, explicitly throw an unrecoverable initialization error if `JWT_SECRET` is missing. Never permit static fallback in production.

### 2.2 Hardcoded VAPID Private Key in Source Code (CRITICAL — SEC-02)
- **Vulnerable File:** `src/wellness/integrations/web-push.ts#L8-L9`
- **Code:**
  ```typescript
  export const VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY ||
    "Nk6A3rtWEE2LtQYyB3Hw3lTwXE7s-CaNh6nEb_Pfb7Q";
  ```
- **Mechanics:** The private key used to sign web push messages (RFC 8292) is exposed in plain text within source code.
- **Exploitation Scenario:** Anyone with read access to the repository can use this private key to craft and broadcast fraudulent push notifications (phishing links, fake password reset alerts) to all endpoints registered in `push_subscriptions`.
- **Remediation:** Remove the fallback string. Require `process.env.VAPID_PRIVATE_KEY`.

### 2.3 Missing Security Headers (HIGH — SEC-03)
- **Vulnerable File:** `next.config.mjs#L14-L36`
- **Deficiencies:**
  1. Missing `Strict-Transport-Security`: Allows potential man-in-the-middle SSL stripping attacks on insecure networks.
  2. Missing `Content-Security-Policy`: Defense-in-depth against unauthorized third-party script execution, data exfiltration, and CSS injection.
  3. Missing `Cross-Origin-Opener-Policy` (COOP): Leaves the window vulnerable to cross-origin side-channel attacks (`window.opener` references).
- **Remediation:** Configure production headers in `next.config.mjs`:
  ```javascript
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://fcm.googleapis.com; frame-src 'self' https://www.youtube.com https://player.vimeo.com;"
  }
  ```

### 2.4 Serverless In-Memory Rate Limiting Bypass (HIGH — SEC-04)
- **Vulnerable File:** `src/wellness/security/rate-limit.ts#L10`
- **Mechanics:** The rate limiter uses `const rateLimitStore = new Map<string, RateLimitEntry>()`.
- **Limitation:** In serverless environments (Vercel, AWS Lambda, Google Cloud Run), function instances scale horizontally and terminate after execution. Memory is isolated per container.
- **Exploitation Scenario:** An attacker performing credential stuffing or password reset flooding makes requests concurrently. Each request hitting a different cold lambda instance sees an empty `rateLimitStore`, effectively bypassing the limit.
- **Remediation:** Integrate a Redis-backed sliding-window rate limiter (e.g., Upstash Redis with `@upstash/ratelimit`) or a database transaction lock.

### 2.5 Secret Passed via URL Query Parameter (MEDIUM — SEC-05)
- **Vulnerable File:** `src/app/api/cron/dispatch-notifications/route.ts#L19`, `L38`
- **Code:**
  ```typescript
  const secretQuery = searchParams.get("secret");
  const providedSecret = bearerSecret || secretQuery || bodyJson.secret;
  ```
- **Mechanics:** Passing authentication secrets via GET parameters causes the token to be logged in web server logs, proxy access logs, browser history, and HTTP `Referer` headers.
- **Remediation:** Reject secrets in query strings. Restrict authentication to `Authorization: Bearer <CRON_SECRET>`.

---

## 3. Access Control & Authorization (RBAC / IDOR Analysis)

All Server Actions were audited against Broken Object Level Authorization (BOLA / IDOR):

1. **`src/wellness/actions/account.ts`:**
   - `wellnessUpdateProfile`: Scoped strictly to `session.userId`. **(PASS)**
   - `wellnessUpdateHealthProfile`: Scoped strictly to `session.userId`. **(PASS)**
   - `wellnessChangePassword`: Scoped strictly to `session.userId`. **(PASS)**
   - `wellnessDeleteAccount`: Scoped strictly to `session.userId`. Protects sole Superadmin from accidental deletion. **(PASS)**
   - `wellnessConfirmQrisPayment`: Explicitly checks `enrollment.userId === session.userId` and validates quota before activation. **(PASS)**

2. **`src/wellness/actions/program.ts`:**
   - `wellnessUserSubmitDayProgress`: Verifies active enrollment (`status === "ACTIVE"`) for the calling user, checks strict WIB calendar drip window, and restricts past day modifications. **(PASS)**
   - `wellnessAdminCreateProgram`, `wellnessAdminSaveProgramDay`, `wellnessAdminSetProgramStatus`, `wellnessAdminDeleteProgram`: Enforces `requireSuperadmin()` guard. **(PASS)**

3. **`src/wellness/actions/admin.ts`:**
   - `wellnessAdminApprovePayment`, `wellnessAdminDeleteUser`, `wellnessAdminUpdateUserRole`, `wellnessAdminUpdateUserStatus`: Enforces `requireSuperadmin()` guard. **(PASS)**

---

## 4. Input Sanitization & Magic Byte File Verification

### Upload Validation Architecture (`/api/upload` & `/api/profile/avatar`)
- Payload verification does **not** rely on `file.type` or `Content-Type` headers supplied by the client.
- The server reads the first 12 bytes of the decoded buffer and validates file signatures:
  - **JPEG:** `0xFF 0xD8 0xFF`
  - **PNG:** `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`
  - **WebP:** `RIFF....WEBP`
- Malicious executable files renamed with `.jpg` or `.png` extensions (polyglot files, PHP, shell scripts) are rejected with HTTP 400.
- Payload size is capped at **400 KB** for avatars and **5 MB** for workout check-in photos.
