# FILE AND FOLDER INVENTORY

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Total Tracked Files:** 112  
**Total Directories:** 43  
**Audit Scope:** 100% of non-ignored active source, configuration, asset, and script files.

---

## 1. Directory Tree Structure

```
c:\Users\Steven\.gemini\antigravity\scratch\wellness-pwa\
├── prisma/                          # Database schema & migrations
├── public/                          # Static public assets, icons, service worker
│   └── uploads/                     # Ephemeral media upload directory
├── scripts/                         # Maintenance, test, and seeding scripts
└── src/
    ├── app/                         # Next.js App Router (pages and APIs)
    │   ├── admin/                   # Admin console routes
    │   │   ├── (dashboard)/         # Main admin dashboard catch-all
    │   │   └── desktop-required/    # Viewport guard
    │   ├── api/                     # REST Route Handlers
    │   │   ├── cron/                # Scheduled background triggers
    │   │   ├── explore/             # Program catalog query API
    │   │   ├── notifications/       # User notification tick API
    │   │   ├── profile/             # Profile & avatar management API
    │   │   ├── push/                # Web push registration API
    │   │   └── upload/              # Media upload handler API
    │   ├── dashboard/               # Member sanctuary dashboard
    │   └── reset-password/          # Password recovery page
    ├── components/                  # React UI components
    │   ├── admin/                   # Admin console client implementation
    │   ├── auth/                    # Authentication modals & forms
    │   ├── checkout/                # QRIS payment dialogs
    │   ├── common/                  # Reusable micro-components & loaders
    │   ├── dashboard/               # Member tabs, daily check-in, push hook
    │   ├── home/                    # Public landing page presentation
    │   ├── providers/               # Context providers (Theme, PWA, Lenis)
    │   └── ui/                      # Visual effects & backgrounds
    └── wellness/                    # Domain logic & system infrastructure
        ├── actions/                 # Next.js Server Actions (Mutations)
        ├── integrations/            # External service adapters
        ├── security/                # Session, encryption & rate limiting
        ├── utils/                   # Timezone, timeline, JSON sanitizers
        └── validators/              # Zod input schemas
```

---

## 2. Comprehensive File Inventory & Technical Classification

### 2.1 Root Configurations & Manifests
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `package.json` | 1,238 B | 48 | Project dependencies and operational scripts |
| `package-lock.json` | 274 KB | 4,800+ | Pinned dependency tree lockfile |
| `tsconfig.json` | 578 B | 27 | TypeScript compiler options (strict mode active) |
| `next.config.mjs` | 854 B | 40 | Next.js configuration, rewrites, and security headers |
| `tailwind.config.ts` | 1,309 B | 46 | Monochromatic design system tokens and theme config |
| `postcss.config.mjs` | 105 B | 7 | PostCSS Tailwind and Autoprefixer integration |
| `.eslintrc.json` | 40 B | 3 | Next.js core Web Vitals ESLint ruleset |
| `.gitignore` | 397 B | 42 | Git file exclusion rules |
| `vercel.json` | 113 B | 8 | Vercel platform cron configuration (07:00 WIB daily) |
| `.env` | 696 B | 10 | Local / Staging environment secrets (**Redacted from report**) |
| `.env.example` | 462 B | 10 | Public template for environment variables |
| `.env.production` | 512 B | 7 | Production template with commented placeholders |
| `README.md` | 2,842 B | 78 | Project documentation & operating instructions |
| `SECOND-PASS-AUDIT.md`| 9,712 B | 18 | Historical completion ledger from prior visual audit |

### 2.2 Database & Data Layer (`prisma/`)
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `prisma/schema.prisma` | 16.5 KB | 443 | 3NF PostgreSQL relational schema (14 models) |
| `prisma/seed.ts` | 25.8 KB | 520 | Initial database seed script (programs, coaches, users) |
| `prisma/wellness.db` | 540 KB | N/A | **Legacy SQLite file (OBSOLETE — Recommend removal)** |

### 2.3 Public Assets & Service Worker (`public/`)
| Path | Size | Purpose & Classification |
| :--- | :--- | :--- |
| `public/sw.js` | 8,673 B | Progressive Web App Service Worker (Cache, Push, Intercept) |
| `public/manifest.json` | 1,132 B | W3C Web App Manifest (PWA metadata & icons) |
| `public/favicon.svg` | 372 B | SVG vector favicon |
| `public/favicon.ico` | 242 B | Legacy ICO favicon |
| `public/apple-touch-icon.png` | 3,730 B | iOS Home Screen icon (180x180) |
| `public/icon-192.png` | 4,039 B | PWA Android icon (192x192) |
| `public/icon-512.png` | 10.4 KB | PWA splash icon (512x512) |
| `public/coach.webp` | 45.2 KB | Coach portrait image asset |
| `public/coach2.webp` | 42.1 KB | Coach portrait image asset |
| `public/coach3.webp` | 48.6 KB | Coach portrait image asset |
| `public/image.webp` | 128 KB | Main hero & PWA splash background |
| `public/pic.webp` | 58.4 KB | Lifestyle / Sanctuary image asset |
| `public/test.webp` | 34.1 KB | Fallback video thumbnail asset |
| `public/video.mp4` | 1.8 MB | Static movement preview video |

### 2.4 Testing & Maintenance Scripts (`scripts/`)
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `scripts/test-security-remediation.ts` | 5,331 B | 130 | Unit tests for rate limiter, SSRF filter, timing safety |
| `scripts/test-wellness-auth-flow.ts` | 7,400 B | 189 | Integration test suite for signup, login, reset tokens |
| `scripts/test-wellness-features.ts` | 5,033 B | 125 | Verification of sleep duration, day validation |
| `scripts/test-wellness-lifecycle.ts` | 5,889 B | 148 | Program lifecycle, drip scheduling, and enrollment test |
| `scripts/test-health-profile.ts` | 3,043 B | 88 | Validation of CustomerHealthProfile mutations |
| `scripts/check-notification-schedule.ts`| 3,354 B | 92 | Diagnostic simulation of WIB notification dispatch |
| `scripts/ensure-5-cohorts.ts` | 11.0 KB | 280 | Database utility ensuring 5 distinct cohort batches |
| `scripts/seed-5-programs.ts` | 9.8 KB | 240 | Program creation utility |
| `scripts/seed-additional-customers.ts` | 5.8 KB | 160 | Test participant generation utility |
| `scripts/seed-master.ts` | 1.4 KB | 45 | Master taxonomy directory seeder |
| `scripts/seed-steven-data.ts` | 30.4 KB | 750 | Comprehensive test data seeder |
| `scripts/update-training-options.ts` | 1.7 KB | 52 | Day curriculum options utility |
| `scripts/generate-pwa-icons.js` | 891 B | 35 | Canvas utility to generate standard PWA icon set |

### 2.5 Application Routes (`src/app/`)
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `src/middleware.ts` | 3,281 B | 89 | Edge middleware for route protection & device routing |
| `src/app/layout.tsx` | 5,391 B | 146 | Root layout with PWA splash, font variables & theme init |
| `src/app/globals.css` | 7,265 B | 225 | Monochromatic 10-30-60 CSS tokens & base styles |
| `src/app/loading.tsx` | 137 B | 6 | Root Suspense fallback |
| `src/app/page.tsx` | 3,482 B | 123 | Public Landing Page RSC |
| `src/app/dashboard/layout.tsx` | 397 B | 14 | Member dashboard layout wrapper |
| `src/app/dashboard/page.tsx` | 12.8 KB | 344 | Member sanctuary dashboard RSC |
| `src/app/dashboard/loading.tsx` | 146 B | 6 | Member dashboard Suspense fallback |
| `src/app/admin/(dashboard)/layout.tsx` | 422 B | 15 | Admin console dashboard layout |
| `src/app/admin/(dashboard)/[[...slug]]/page.tsx` | 1,843 B | 58 | Admin console dynamic route controller |
| `src/app/admin/desktop-required/page.tsx` | 2,060 B | 65 | Mobile viewport restriction notice |
| `src/app/reset-password/page.tsx` | 8,152 B | 215 | Password reset verification and input form |
| `src/app/api/upload/route.ts` | 3,674 B | 95 | Photo upload endpoint with magic byte validation |
| `src/app/api/profile/avatar/route.ts` | 3,387 B | 95 | Avatar upload & delete endpoint |
| `src/app/api/explore/programs/route.ts` | 6,494 B | 178 | Published cohort catalog query API |
| `src/app/api/push/subscribe/route.ts` | 5,316 B | 159 | Web push subscription management API |
| `src/app/api/notifications/tick/route.ts` | 1,465 B | 39 | Client-triggered notification tick API |
| `src/app/api/cron/dispatch-notifications/route.ts`| 3,106 B | 87 | Server-side cron notification dispatcher |

### 2.6 Presentation Components (`src/components/`)
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `src/components/admin/AdminClient.tsx` | 428 KB | 11,719 | **Monolithic Admin Console (Program, Users, Payments)** |
| `src/components/dashboard/DashboardClient.tsx` | 74.8 KB | 1,905 | Main Member Dashboard Controller & View Router |
| `src/components/dashboard/tabs/MyPlanTab.tsx` | 31.2 KB | 760 | Active cohort curriculum timeline & daily tasks |
| `src/components/dashboard/tabs/DailyCheckIn.tsx` | 35.8 KB | 875 | Daily check-in modal (sleep, photos, reflections) |
| `src/components/dashboard/tabs/ExplorePlanTab.tsx` | 18.5 KB | 450 | Cohort catalog exploration with filters & search |
| `src/components/dashboard/tabs/NotificationsHistoryTab.tsx`| 15.6 KB | 412 | User notification inbox and transaction history |
| `src/components/dashboard/tabs/ProfileTab.tsx` | 34.2 KB | 825 | User account settings, health profile & password change |
| `src/components/dashboard/tabs/ProgramDetailView.tsx` | 22.1 KB | 530 | Cohort syllabus, methodology & coach bio modal |
| `src/components/dashboard/tabs/shared.tsx` | 9,674 B | 260 | Shared UI tokens, skeletons, and date formatters |
| `src/components/dashboard/tabs/usePushNotifications.ts` | 9,587 B | 273 | Custom React hook for W3C PushManager lifecycle |
| `src/components/home/LandingClient.tsx` | 41.5 KB | 1,020 | Public sanctuary landing page UI |
| `src/components/auth/AuthModal.tsx` | 14.8 KB | 385 | Sign In & Sign Up modal dialog |
| `src/components/checkout/QrisCheckoutModal.tsx` | 18.9 KB | 465 | 15-Minute QRIS payment modal with countdown |
| `src/components/common/BmsLogoLoading.tsx` | 1,176 B | 36 | Reusable + BMS pulse loading skeleton |
| `src/components/theme/ThemeProvider.tsx` | 1,508 B | 48 | Light/Dark theme context provider |
| `src/components/theme/ThemeToggle.tsx` | 1,326 B | 42 | Minimalist theme toggle switch |
| `src/components/providers/SmoothScroll.tsx` | 1,837 B | 58 | Lenis smooth scroll provider (disabled on touch/admin) |
| `src/components/providers/ServiceWorkerRegister.tsx`| 438 B | 18 | Client-side service worker registration hook |
| `src/components/providers/PwaSplashDismiss.tsx` | 1,404 B | 42 | Smooth transition dismisser for initial HTML splash |
| `src/components/ui/AuraBackground.tsx` | 151 B | 8 | Ambient background visual glow effect |

### 2.7 Domain Services, Actions & Utilities (`src/wellness/`)
| Path | Size | Lines | Purpose & Classification |
| :--- | :--- | :--- | :--- |
| `src/wellness/db.ts` | 665 B | 27 | PrismaClient singleton instance manager |
| `src/wellness/actions/auth.ts` | 9,435 B | 355 | Sign-Up, Sign-In, Sign-Out, Password Reset actions |
| `src/wellness/actions/account.ts` | 24.8 KB | 725 | Profile update, Health profile, Enrollment, Payment |
| `src/wellness/actions/program.ts` | 46.2 KB | 1,286 | Admin curriculum builder & member submission actions |
| `src/wellness/actions/admin.ts` | 13.9 KB | 407 | Admin user management & manual payment approvals |
| `src/wellness/actions/master.ts` | 15.2 KB | 480 | CRUD actions for master taxonomy catalogs |
| `src/wellness/actions/activity.ts` | 4,946 B | 165 | In-app notifications & transaction history retrieval |
| `src/wellness/security/session.ts` | 4,533 B | 165 | JWT issuance, verification, cookie management |
| `src/wellness/security/guards.ts` | 984 B | 37 | RBAC security guards (`requireAuth`, `requireSuperadmin`) |
| `src/wellness/security/password.ts` | 465 B | 18 | bcryptjs password hashing (cost factor 12) |
| `src/wellness/security/rate-limit.ts` | 1,714 B | 55 | In-memory sliding-window rate limiter |
| `src/wellness/validators/auth.ts` | 6,644 B | 162 | Zod validation schemas for auth, profile, and health |
| `src/wellness/validators/program.ts` | 9,848 B | 245 | Zod validation schemas for programs, days, checklists |
| `src/wellness/utils/timezone.ts` | 3,426 B | 110 | WIB (UTC+7) calendar calculations & sleep math |
| `src/wellness/utils/timeline.ts` | 11.2 KB | 348 | Dynamic public badge resolver ("Open", "Full", "End") |
| `src/wellness/utils/daily-tasks.ts` | 4,651 B | 158 | Daily curriculum task resolution for today/tomorrow |
| `src/wellness/utils/json.ts` | 17.5 KB | 592 | Safe JSON parsers and default domain copy constants |
| `src/wellness/utils/notification-schedule.ts` | 2,986 B | 88 | Slot calculation and deduplication key builder |
| `src/wellness/integrations/web-push.ts` | 2,153 B | 76 | W3C Web Push adapter using web-push library |
| `src/wellness/integrations/user-notifications.ts` | 1,376 B | 47 | In-app notification persistence with deduplication |
| `src/wellness/integrations/dispatch-due-notifications.ts`| 6,414 B | 185 | Batch notification evaluator and push dispatcher |
| `src/wellness/integrations/email-service.ts` | 2,179 B | 61 | Transactional email adapter (Console dev / Resend) |
| `src/wellness/integrations/payment-gateway.ts` | 1,922 B | 56 | QRIS payment gateway adapter template (Midtrans/Xendit) |
| `src/wellness/integrations/video-provider.ts` | 3,768 B | 120 | YouTube / Vimeo embed URL extractor and sanitizer |
| `src/wellness/integrations/push-notification.ts` | 901 B | 24 | **Legacy stub adapter (OBSOLETE — Recommend removal)** |
