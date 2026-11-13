# API & BACKEND FLOW AUDIT

## 1. HTTP API Routes Inventory (`src/app/api/**`)

| Endpoint | Methods | Auth | Rate Limit | Key Issues & Status |
|---|---|---|---|---|
| `/api/cron/dispatch-notifications` | `GET`, `POST` | `CRON_SECRET` Bearer/query | None (secret-gated) | Hardcoded dev secret fallback (`AUD-004`). 500 error message sanitized (**Fixed Stage 5** — `AUD-016`). |
| `/api/explore/programs` | `GET` | Public | None | Unpaginated (`take: 100`), no `Cache-Control` header (`AUD-021`). |
| `/api/notifications/tick` | `POST` | `getWellnessSession()` | 4 req/min/user (in-memory) | Triggers global N+1 `dispatchDueNotifications` from client (`AUD-007`); in-memory RL (`AUD-006`). 500 sanitized (**Fixed Stage 5** — `AUD-016`). |
| `/api/profile/avatar` | `POST`, `DELETE` | `getWellnessSession()` | None explicit | Validates MIME + size; updates `User.avatarUrl` cleanly. |
| `/api/push/subscribe` | `POST`, `DELETE` | `getWellnessSession()` | None explicit | SSRF endpoint allowlist tested & passing (`test-security-remediation.ts`). `upsert` by `endpoint` allows cross-user endpoint takeover (`AUD-019`). 500 sanitized (**Fixed Stage 5** — `AUD-016`). |
| `/api/upload` | `POST` | `getWellnessSession()` | None explicit | Magic-byte verified, 5MB limit. Writes to public `public/uploads/workouts/` or returns base64 data URI (`AUD-002`). |

---

## 2. Server Actions Inventory (`src/wellness/actions/**`)

- **`auth.ts`**: Sign up, sign in, sign out, forgot password (SHA-256 reset tokens), reset password. Rate limits use in-memory `Map` keyed only by email (`AUD-006`).
- **`account.ts`**: Profile updates, `HealthProfile` updates (`AUD-003` URL validation fixed Stage 5), program enrollment (`AUD-005` `FREE-` collision fixed Stage 5), QRIS payment confirmation (`AUD-001` simulated/client-only Terms check).
- **`program.ts`**: Public/member catalog read, day progress submission (`AUD-003` URL validation fixed Stage 5), admin program/day CRUD & completion checks.
- **`admin.ts`**: Admin metrics, user status/role toggles, `wellnessAdminUpdateCustomerProfile` (**missing Zod validation & try/catch** — `AUD-011`).
- **`master.ts`**: Master Category/Coach/Audience/Equipment/DailyCommitment CRUD (**non-transactional cache sync + synthetic IDs** — `AUD-014`).
- **`activity.ts`**: Notification inbox fetch, mark read, clear notifications.

---

## 3. Core Flows Traced

1. **Authentication Flow**: `AuthModal` -> `auth.ts` (`bcryptjs` + HS256 JWT cookie) -> `middleware.ts` (signature check) -> RSC `getWellnessSession()` (`ACTIVE` + `tokenVersion` check).
2. **Enrollment & Checkout Flow**: `ProgramDetailView` -> `wellnessEnrollProgram` -> `QrisCheckoutModal` -> `wellnessConfirmQrisPayment` (**blocked/simulated in prod** — `AUD-001`).
3. **Daily Check-In Flow**: `DailyCheckIn` -> optional `/api/upload` -> `wellnessSubmitDayProgress` -> `ProgramDayProgress` upsert.
4. **Notification Dispatch Flow**: `Vercel Cron` (1x/day) + Member `DashboardClient` interval -> `/api/notifications/tick` -> `dispatchDueNotifications` -> `UserNotification` + `web-push` (**N+1 & polling amplification** — `AUD-007`, `AUD-026`).
