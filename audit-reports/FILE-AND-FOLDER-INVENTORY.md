# FILE AND FOLDER INVENTORY

**Scan Boundary**: Entire workspace excluding `node_modules`, `.git`, `.next`.  
**Totals Observed**: **42 directories**, **138 files** (including `23` report files in `audit-reports/`, `1` legacy `SECOND-PASS-AUDIT.md`, and `2` safe remediation/unit-test files added during Stage 5: `src/wellness/utils/url-safety.ts` and `scripts/test-audit-unit.ts`).

---

## 1. Directory Breakdown

| Directory | File Count | Role |
|---|---:|---|
| `.` (root) | 16 | Configs (`.env*`, `next.config.mjs`, `tsconfig.json`, `vercel.json`, `package*.json`, `.eslintrc.json`, `.gitignore`), `README.md`, `SECOND-PASS-AUDIT.md` |
| `src/app/` | 17 | Next.js App Router pages, layouts, loading boundaries, globals CSS, and 6 API routes (`src/app/api/*`) |
| `src/components/` | 20 | Client components (`AdminClient.tsx`, `DashboardClient.tsx`, tabs, auth/checkout modals, providers, theme) |
| `src/wellness/` | 26 | Domain backend: `actions/` (6), `integrations/` (7), `security/` (4), `utils/` (6), `validators/` (2), `db.ts` (1) |
| `src/middleware.ts` | 1 | Edge request authentication & admin device guard |
| `prisma/` | 3 | `schema.prisma` (PostgreSQL), `seed.ts` (930 lines), residual `wellness.db` (540 KB SQLite) |
| `public/` | 15 | PWA icons, `manifest.json`, `sw.js`, `offline.html`, images (`.webp`), `video.mp4` (31.2 MB) |
| `scripts/` | 14 | Seeding, maintenance, and verification scripts |
| `scratch/` | 3 | Ad-hoc historical helper scripts (`apply_v3_improvements.js`, `audit_all_placeholders.js`, `make_customer_info_readonly.js`) |
| `audit-reports/` | 23 | Audit reports and machine-readable JSON summaries |

---

## 2. Largest Source & Asset Files (Complexity / Payload Signals)

| Path | Size / Lines | Observation |
|---|---:|---|
| `public/video.mp4` | ~31.2 MB | Hero video loaded directly by landing page (`LandingClient.tsx`) |
| `src/components/admin/AdminClient.tsx` | 582.8 KB / 11,720 lines | Oversized monolith UI bundle (`ADMIN`) |
| `src/components/dashboard/tabs/MyPlanTab.tsx` | 118.9 KB / 2,495 lines | Large program timeline + mock issue/quit form |
| `src/components/dashboard/tabs/DailyCheckIn.tsx` | 109.3 KB / 2,472 lines | Large check-in accordion + video/meetup/meal/sleep forms |
| `src/components/dashboard/DashboardClient.tsx` | 71.1 KB / 1,906 lines | Main dashboard orchestrator + tick polling + SW subscription |
| `src/wellness/actions/program.ts` | 1,286 lines | Program catalog, admin CRUD, day progress submission |
| `prisma/seed.ts` | 930 lines | Full cohort and curriculum seed dataset |
| `src/wellness/actions/account.ts` | 725 lines | Profile, health profile, enrollment, simulated QRIS checkout |
| `prisma/wellness.db` | ~540 KB | Residual SQLite database file unused by PostgreSQL schema |

---

## 3. Complete `src/` Inventory

- **Middleware**: `src/middleware.ts`
- **App Pages/Layouts**: `src/app/layout.tsx`, `src/app/loading.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/reset-password/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/loading.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/(dashboard)/layout.tsx`, `src/app/admin/(dashboard)/[[...slug]]/page.tsx`, `src/app/admin/desktop-required/page.tsx`
- **API Routes**: `src/app/api/cron/dispatch-notifications/route.ts`, `src/app/api/explore/programs/route.ts`, `src/app/api/notifications/tick/route.ts`, `src/app/api/profile/avatar/route.ts`, `src/app/api/push/subscribe/route.ts`, `src/app/api/upload/route.ts`
- **Actions**: `src/wellness/actions/account.ts`, `activity.ts`, `admin.ts`, `auth.ts`, `master.ts`, `program.ts`
- **Security**: `src/wellness/security/guards.ts`, `password.ts`, `rate-limit.ts`, `session.ts`
- **Integrations**: `src/wellness/integrations/dispatch-due-notifications.ts`, `email-service.ts`, `payment-gateway.ts`, `push-notification.ts`, `user-notifications.ts`, `video-provider.ts`, `web-push.ts`
- **Utils & Validators**: `src/wellness/db.ts`, `src/wellness/utils/daily-tasks.ts`, `json.ts`, `notification-schedule.ts`, `timeline.ts`, `timezone.ts`, `url-safety.ts`, `src/wellness/validators/auth.ts`, `program.ts`
- **Components**: `AdminClient.tsx`, `AuthModal.tsx`, `QrisCheckoutModal.tsx`, `BmsLogoLoading.tsx`, `DashboardClient.tsx`, `LandingClient.tsx`, `AuraBackground.tsx`, `tabs/{DailyCheckIn,ExplorePlanTab,MyPlanTab,NotificationsHistoryTab,ProfileTab,ProgramDetailView,shared,usePushNotifications}`, `providers/{PwaSplashDismiss,ServiceWorkerRegister,SmoothScroll}`, `theme/{ThemeProvider,ThemeToggle}`
