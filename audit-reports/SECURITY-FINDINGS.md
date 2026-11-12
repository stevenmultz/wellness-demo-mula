# COMPREHENSIVE SECURITY FINDINGS (VULNERABILITY LEDGER)

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Standard:** OWASP Risk Rating Methodology, Common Weakness Enumeration (CWE)  

---

## 1. Summary of Security Findings

| Finding ID | Title | Severity | Status | OWASP (2021) | CWE | Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Hardcoded Fallback JWT Secret in Middleware & Session | **CRITICAL** | **CONFIRMED** | A02: Cryptographic Failures | CWE-798 | Low |
| **SEC-02** | Hardcoded VAPID Private Key in Source Code | **CRITICAL** | **CONFIRMED** | A02: Cryptographic Failures | CWE-798 | Low |
| **SEC-03** | Missing Content-Security-Policy & Strict-Transport-Security | **HIGH** | **CONFIRMED** | A05: Security Misconfiguration | CWE-693 | Medium |
| **SEC-04** | In-Memory Rate Limiting Incompatible with Multi-Instance Serverless | **HIGH** | **CONFIRMED** | A04: Insecure Design | CWE-799 | Medium |
| **SEC-05** | Sensitive API Secret Accepted via URL Query Parameter | **MEDIUM** | **CONFIRMED** | A05: Security Misconfiguration | CWE-598 | Low |
| **SEC-06** | Ephemeral File Storage with Unbounded Base64 DB Fallback | **HIGH** | **CONFIRMED** | A04: Insecure Design | CWE-400 | Medium |
| **SEC-07** | Client-Triggered Global Dispatch Loop via `/api/notifications/tick` | **HIGH** | **CONFIRMED** | A04: Insecure Design | CWE-400 | Medium |
| **SEC-08** | Inadequate Security Audit Logging & Absence of Correlation IDs | **MEDIUM** | **CONFIRMED** | A09: Security Logging Failures | CWE-778 | Medium |

---

## 2. Detailed Vulnerability Dossiers

### SEC-01: Hardcoded Fallback JWT Secret in Middleware & Session
- **Severity:** **CRITICAL**
- **Status:** **CONFIRMED**
- **Affected Files:**
  - `src/middleware.ts#L7-L8`
  - `src/wellness/security/session.ts#L11-L13`
- **Technical Explanation:**
  The signing key is derived via:
  ```typescript
  const SECRET_KEY = new TextEncoder().encode(
    rawSecret || "wellness_platform_dev_only_jwt_secret_do_not_use_in_prod"
  );
  ```
  If `process.env.JWT_SECRET` is missing in production, the application does not fail closed; instead, it silently defaults to this known static string.
- **Evidence:** Source code inspection verified in `src/middleware.ts` and `src/wellness/security/session.ts`.
- **Exploitation Scenario:**
  1. An attacker discovers or anticipates that an environment variable was omitted during deployment.
  2. The attacker uses standard JWT libraries (`jose`, `jsonwebtoken`) to sign a token with payload `{"userId": "attacker", "email": "admin@bms.id", "role": "SUPERADMIN", "tokenVersion": 0}` using the known static secret.
  3. The attacker injects the cookie `wellness_session=<token>` and accesses `/admin`. Middleware authenticates the request without error.
- **Impact:** Complete system compromise, unauthorized superadmin access, modification of cohort prices, participant records, and payments.
- **Remediation:**
  In `src/middleware.ts` and `src/wellness/security/session.ts`, enforce strict validation:
  ```typescript
  if (!rawSecret && process.env.NODE_ENV === "production") {
    throw new Error("FATAL CONFIG ERROR: JWT_SECRET must be configured in production.");
  }
  ```
- **Verification Method:** Unit test verifying exception when `JWT_SECRET` is undefined in production mode.

---

### SEC-02: Hardcoded VAPID Private Key in Source Code
- **Severity:** **CRITICAL**
- **Status:** **CONFIRMED**
- **Affected File:** `src/wellness/integrations/web-push.ts#L8-L9`
- **Technical Explanation:**
  The VAPID private key is committed in plain text as a fallback:
  ```typescript
  export const VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY ||
    "Nk6A3rtWEE2LtQYyB3Hw3lTwXE7s-CaNh6nEb_Pfb7Q";
  ```
- **Evidence:** Verified directly in `src/wellness/integrations/web-push.ts`.
- **Exploitation Scenario:**
  An attacker obtains the key from the public repository, git clone, or client source maps, and signs arbitrary push notifications directly to the Google FCM or Apple Push endpoints stored in `push_subscriptions`.
- **Impact:** Phishing, reputational destruction of "+ BMS" sanctuary, spamming enrolled users.
- **Remediation:** Remove the fallback string. Require `process.env.VAPID_PRIVATE_KEY`.
- **Verification Method:** Grep source code to ensure 0 occurrences of private keys.

---

### SEC-03: Missing Content-Security-Policy & Strict-Transport-Security
- **Severity:** **HIGH**
- **Status:** **CONFIRMED**
- **Affected File:** `next.config.mjs#L14-L36`
- **Technical Explanation:**
  `next.config.mjs` configures `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, but completely omits:
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy` (CSP)
  - `Cross-Origin-Opener-Policy` (COOP)
- **Impact:** Weak defense-in-depth against SSL stripping, cross-site scripting (XSS), and cross-origin side-channel leaks.
- **Remediation:** Add standardized production headers in `next.config.mjs`.
- **Verification Method:** Inspect HTTP response headers via `curl -I` on production route.

---

### SEC-04: In-Memory Rate Limiting Incompatible with Multi-Instance Serverless
- **Severity:** **HIGH**
- **Status:** **CONFIRMED**
- **Affected File:** `src/wellness/security/rate-limit.ts#L10`
- **Technical Explanation:**
  Uses an in-memory `Map<string, RateLimitEntry>` to track authentication attempts. In serverless deployments, function invocations run across multiple distinct containers that do not share memory.
- **Impact:** An attacker can perform automated brute-force password guessing or spam password reset requests by distributing requests across concurrent connections.
- **Remediation:** Connect Upstash Redis or use a PostgreSQL-backed rate limit store for distributed atomic counters.
- **Verification Method:** Concurrency test sending requests across isolated processes.

---

### SEC-05: Sensitive API Secret Accepted via URL Query Parameter
- **Severity:** **MEDIUM**
- **Status:** **CONFIRMED**
- **Affected File:** `src/app/api/cron/dispatch-notifications/route.ts#L19`, `L38`
- **Technical Explanation:**
  Accepts `?secret=...` in the query string:
  ```typescript
  const secretQuery = searchParams.get("secret");
  const providedSecret = bearerSecret || secretQuery || bodyJson.secret;
  ```
- **Impact:** Query strings are recorded in plain text in proxy logs, CDN logs, browser histories, and `Referer` headers, leaking `CRON_SECRET`.
- **Remediation:** Only accept secrets via `Authorization: Bearer <token>` header.
- **Verification Method:** Probe `/api/cron/dispatch-notifications?secret=...` and verify HTTP 401 is returned.
