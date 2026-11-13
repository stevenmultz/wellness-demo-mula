# DATABASE & N+1 PERFORMANCE AUDIT

**Database Engine**: PostgreSQL (`prisma/schema.prisma`, Supabase Transaction/Direct URLs in `.env`)  
**Models**: `18` Prisma models (`User`, `PasswordResetToken`, `MasterCategory`, `MasterCoach`, `MasterTargetAudience`, `MasterEquipment`, `MasterDailyCommitment`, `Program`, `ProgramCategory`, `ProgramCoach`, `ProgramAudience`, `ProgramEquipment`, `ProgramDay`, `ProgramEnrollment`, `ProgramDayProgress`, `PushSubscription`, `UserNotification`, `CustomerHealthProfile`).

---

## 1. Schema, Migration & Integrity Findings

1. **Zero Versioned Prisma Migrations (`AUD-010` — HIGH, OPEN)**:
   - No `prisma/migrations/` folder exists in the repository; schema sync relies on `db push`. Legacy `prisma/wellness.db` (540 KB SQLite) still sits in `prisma/`. This risks destructive drift in production.
2. **Unique Constraint Collision Fixed (`AUD-005` — HIGH, FIXED Stage 5)**:
   - Free enrollment `paymentReference` previously used `FREE-${Date.now().toString().slice(-6)}` (collides every ~16.6 min or concurrently with `P2002`). Fixed with `crypto.randomBytes(6)`.
3. **Missing Indexes & Suboptimal Types (`AUD-013` — MEDIUM, OPEN)**:
   - `ProgramEnrollment`: indexed on `[userId]`, `[programId]`, `[status]`, unique on `[userId, programId]` and `paymentReference`; **missing** index on `invoiceExpiresAt` for expiration sweeps.
   - `UserNotification`: indexed on `[userId, isRead]` and `[userId, isCleared]`, unique on `dedupeKey`; **missing** composite index `[userId, createdAt]` for sorted notification feeds.
   - `PasswordResetToken`: unique on `tokenHash`, indexed on `userId`; **missing** index on `expiresAt` for cleanup jobs.
   - `Program.price` & `actualPrice`: stored as `Float` instead of integer IDR `Int` or `Decimal`.
   - `Program.status`: unconstrained `String` (`PUBLISH`, `PUBLISHED`, `ACTIVE`, `OPEN`, `REVIEW`, `DRAFT`, `ARCHIVE`).
4. **DB Text Bloat from Base64 Image Fallbacks (`AUD-002` — CRITICAL, OPEN)**:
   - `CustomerHealthProfile` (`photoFrontUrl`, `photoSideUrl`, `photoBackUrl`) and `ProgramDayProgress` (`photoBeforeUrl`, `photoAfterUrl`) store `data:image/...;base64,...` strings up to ~6.67 MB directly in row `TEXT` columns when `/api/upload` runs on read-only serverless filesystems.
5. **Master Data Denormalized Cache Sync (`AUD-014` — MEDIUM, OPEN)**:
   - `src/wellness/actions/master.ts` updates cached strings on `Program` using exact match outside `$transaction`, causing stale labels when multiple categories/coaches are comma-joined.

---

## 2. Query & N+1 Performance Findings (`AUD-007` — HIGH, OPEN)

- **`dispatchDueNotifications` (`src/wellness/integrations/dispatch-due-notifications.ts:60-170`)**:
  - Fetches **all** published `Program` rows, all `ProgramDay` rows, all `ACTIVE` enrollments, and all `PushSubscription` rows in memory.
  - Inside nested loops (`for program -> for day -> for notificationSlot -> for due`), issues per-batch `prisma.userNotification.findMany` + `createMany` queries.
  - Triggered not only by cron (`vercel.json`) but also every ~20–60s from every open member `/dashboard` tab via `POST /api/notifications/tick`.
- **`/admin` Server Page (`src/app/admin/(dashboard)/[[...slug]]/page.tsx:85-180`)**:
  - Fetches up to `200` users (`take: 200`, silent truncation with no UI pagination) including nested `healthProfile` and ALL `dayProgress` records (potentially dragging megabytes of base64 photo strings into a single RSC render payload).
- **Safe Transaction Boundaries Verified**:
  - Account deletion (`account.ts`), enrollment creation (`account.ts`), and progress submission work within Prisma cascades/unique upserts (`[userId, programDayId]`).
