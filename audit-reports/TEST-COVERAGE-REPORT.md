# TEST COVERAGE & VERIFICATION REPORT

## 1. Existing Test & Script Suite Inventory (`scripts/`)

| Script | Type | Runs Against | Executed in Audit? | Result |
|---|---|---|---|---|
| `npx tsc --noEmit` | TypeScript check | Local source | **Yes (post-edit)** | **PASS** (exit 0) |
| `npm run lint` | ESLint (`next/core-web-vitals`) | Local source | **Yes (post-edit)** | **PASS** (`No ESLint warnings or errors`) |
| `npm run build` | `prisma generate && next build` | Local build + `.env` | **Yes (post-edit)** | **PASS** (exit 0; client bundles generated) |
| `scripts/test-security-remediation.ts` | Unit tests (in-memory) | Rate limit, push SSRF, timing-safe, magic bytes | **Yes (post-edit)** | **PASS** (`4/4` suites) |
| `scripts/test-audit-unit.ts` *(added Stage 5)* | Unit tests (in-memory) | `url-safety`, `video-provider`, Zod photo validators, WIB timezone/sleep | **Yes (post-edit)** | **PASS** (`4/4` suites) |
| `scripts/test-wellness-auth-flow.ts` | E2E / DB write test | Reads `.env` -> remote Supabase DB | **NOT RUN** (Safety lock) | `NOT TESTED` (modifies live DB) |
| `scripts/test-wellness-features.ts` | DB write test | Reads `.env` -> remote Supabase DB | **NOT RUN** (Safety lock) | `NOT TESTED` (modifies live DB) |
| `scripts/test-health-profile.ts` | DB write test | Reads `.env` -> remote Supabase DB | **NOT RUN** (Safety lock) | `NOT TESTED` (modifies live DB) |
| `scripts/test-wellness-lifecycle.ts` | DB read script | Reads `.env` -> remote Supabase DB | **NOT RUN** (Offline sandbox) | `NOT TESTED` |

---

## 2. Coverage Gaps (`AUD-022`, `AUD-027`)

1. **No Framework Test Runner / Coverage Measurement**: There is no Jest, Vitest, or Playwright E2E suite in `package.json`, and zero `%.cov` statement/branch coverage metrics exist.
2. **Unsafe `npm test` Default**: `package.json` maps `npm test` directly to `tsx scripts/test-wellness-auth-flow.ts`, which connects to whatever `DATABASE_URL` sits in `.env` (currently remote Supabase Postgres) and writes/deletes test records without checking a `TEST_DATABASE_URL` or non-production guard.
3. **Untested Flows Requiring Staging/Isolated Postgres**:
   - Full HTTP integration tests on `/api/upload`, `/api/push/subscribe`, `/api/cron/dispatch-notifications`, `/api/notifications/tick`.
   - End-to-end Playwright browser tests for offline Service Worker fallback (`/offline.html`), QRIS checkout, and Admin RBAC.
   - Concurrency/load stress testing (`k6` / Locust) for tick polling amplification (`AUD-007`) and free enrollment uniqueness (`AUD-005`).
