# CODE QUALITY AUDIT

## 1. Type Safety, Lint & Static Checks
- `npx tsc --noEmit`: **PASS** (strict mode enabled in `tsconfig.json`).
- `npm run lint` (`next/core-web-vitals`): **PASS** (`No ESLint warnings or errors`).

---

## 2. Structural & Code Quality Findings

1. **Monolithic UI Components (`AUD-012` — MEDIUM, OPEN)**:
   - `src/components/admin/AdminClient.tsx` (**11,720 lines / 582.8 KB**) handles dashboard analytics, programs CRUD, curriculum day editor, master data CRUD, submissions gallery, and user management in one client file.
   - `src/components/dashboard/tabs/MyPlanTab.tsx` (**2,495 lines**), `DailyCheckIn.tsx` (**2,472 lines**), and `DashboardClient.tsx` (**1,906 lines**) similarly concentrate heavy state/UI logic in single files.
2. **Duplicated UI & Validation Helpers (Partially Remediated)**:
   - Prior `safeHttpUrl` in `src/components/dashboard/tabs/shared.tsx` was duplicated across components and missing in `AdminClient.tsx` and `DailyCheckIn.tsx`. Consolidated into [url-safety.ts](file:///c:/Users/Steven/.gemini/antigravity/scratch/wellness-pwa/src/wellness/utils/url-safety.ts) (`AUD-003`).
3. **Missing Try/Catch & Silent Client Fallbacks (`AUD-017` — FIXED; `AUD-009` — OPEN)**:
   - `QrisCheckoutModal.tsx` (`handleModeChange`, `handleRegenerateQris`) lacked `catch` handlers, leaving rejected Server Actions unhandled in UI state (**fixed in Stage 5**).
   - `MyPlanTab.tsx:1209-1231` fakes issue reporting / program quit requests via `setTimeout` + `localStorage` without backend calls (**open**).
4. **Unvalidated Admin Profile Update Action (`AUD-011` — HIGH, OPEN)**:
   - `wellnessAdminUpdateCustomerProfile` (`src/wellness/actions/admin.ts:322-407`) takes raw arguments without Zod schema parsing or `try/catch` wrapper (unlike `auth.ts`/`program.ts` actions).
5. **Non-Transactional Master Cache Updates (`AUD-014` — MEDIUM, OPEN)**:
   - `src/wellness/actions/master.ts` updates `Program` cached text columns (`category`, `coachName`, etc.) with exact equality matching and no `$transaction`, missing comma-separated multi-value rows, and emits synthetic fallback IDs (`mc-1`, `cat-1`) when tables are empty.
6. **Inconsistent Program Status Strings (`AUD-013` — MEDIUM, OPEN)**:
   - Code checks a mix of `PUBLISH`, `PUBLISHED`, `ACTIVE`, `OPEN`, `REVIEW`, `DRAFT`, `DONE`, `ARCHIVE` across `dashboard/page.tsx`, `api/explore/programs/route.ts`, `timeline.ts`, and `program.ts`.
7. **Concurrency Bug on Free Enrollment Reference (`AUD-005` — FIXED in Stage 5)**:
   - `account.ts:415` previously truncated `Date.now().toString().slice(-6)` into a `@unique` field; replaced with `crypto.randomBytes(6).toString("hex").toUpperCase()`.
8. **Dead / Residual Files (`AUD-015`, `AUD-024`)**:
   - `DashboardClient.tsx:1365-1373` invokes authenticated `/api/cron/dispatch-notifications` from the client without `CRON_SECRET`; `README.md` still references SQLite; `prisma/wellness.db` and `scratch/*.js` remain in workspace.
