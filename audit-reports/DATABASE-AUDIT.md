# DATABASE RELIABILITY & PERFORMANCE AUDIT

**Database Engine:** PostgreSQL 15+ (Hosted on Supabase)  
**Connection Mode:** Supabase PgBouncer Transaction Pooler (Port 6543) + Direct Connection (Port 5432)  
**ORM:** Prisma ORM 5.19  
**Data Integrity Score:** **94 / 100**  
**Query Performance Score:** **78 / 100** (N+1 query loop and pooler limit warnings)

---

## 1. Relational Schema & Integrity Architecture

The database architecture comprises 14 primary models organized across users, programs, taxonomy catalogs, enrollments, progress logs, and push subscriptions.

### 1.1 Table Inventory & Foreign Key Constraints
| Table Name | Primary Key | Foreign Keys | Cascading Behavior | Unique Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `cuid` (`id`) | None | N/A | `email` |
| `password_reset_tokens`| `cuid` (`id`) | `userId` -> `users.id` | `onDelete: Cascade` | `token` |
| `programs` | `cuid` (`id`) | `dailyCommitmentId` -> `master_daily_commitments.id` | `onDelete: SetNull` | `slug` |
| `program_days` | `cuid` (`id`) | `programId` -> `programs.id` | `onDelete: Cascade` | `[programId, dayNumber]` |
| `program_enrollments` | `cuid` (`id`) | `userId` -> `users.id`<br>`programId` -> `programs.id` | `onDelete: Cascade`<br>`onDelete: Cascade` | `[userId, programId]`, `paymentReference` |
| `program_day_progress`| `cuid` (`id`) | `userId` -> `users.id`<br>`programDayId` -> `program_days.id`| `onDelete: Cascade`<br>`onDelete: Cascade` | `[userId, programDayId]` |
| `master_categories` | `cuid` (`id`) | None | N/A | `name` |
| `master_coaches` | `cuid` (`id`) | None | N/A | None (`title` allows multi) |
| `master_target_audiences`| `cuid` (`id`)| None | N/A | `name` |
| `master_equipments` | `cuid` (`id`) | None | N/A | `name` |
| `master_daily_commitments`| `cuid` (`id`)| None | N/A | `name` |
| `program_categories` | Composite | `programId` -> `programs.id`<br>`categoryId` -> `master_categories.id`| `onDelete: Cascade`<br>`onDelete: Restrict` | `[programId, categoryId]` (PK) |
| `program_coaches` | Composite | `programId` -> `programs.id`<br>`coachId` -> `master_coaches.id` | `onDelete: Cascade`<br>`onDelete: Restrict` | `[programId, coachId]` (PK) |
| `program_audiences` | Composite | `programId` -> `programs.id`<br>`audienceId` -> `master_target_audiences.id`| `onDelete: Cascade`<br>`onDelete: Restrict` | `[programId, audienceId]` (PK) |
| `program_equipments`| Composite | `programId` -> `programs.id`<br>`equipmentId` -> `master_equipments.id`| `onDelete: Cascade`<br>`onDelete: Restrict` | `[programId, equipmentId]` (PK) |
| `push_subscriptions`| `cuid` (`id`) | `userId` -> `users.id` | `onDelete: Cascade` | `endpoint` |
| `user_notifications` | `cuid` (`id`) | `userId` -> `users.id` | `onDelete: Cascade` | `[userId, dedupeKey]` |
| `customer_health_profiles`| `cuid` (`id`)| `userId` -> `users.id` | `onDelete: Cascade` | `userId` |

---

## 2. Index Efficiency & Query Path Evaluation

### 2.1 Existing B-Tree Indexes
- `users`: `role`, `status`, `createdAt`, `email` (Unique B-tree).
- `programs`: Composite `[status, isPublished, startDate]`, Composite `[locationType, isPublished]`, `dailyCommitmentId`, `slug` (Unique B-tree).
- `program_days`: `programId`, Composite `[programId, dayNumber]` (Unique B-tree).
- `program_enrollments`: Composite `[programId, status]`, `status`, `createdAt`, Composite `[userId, programId]` (Unique B-tree).
- `program_day_progress`: `programDayId`, `isCompleted`, Composite `[userId, programDayId]` (Unique B-tree).
- `user_notifications`: Composite `[userId, createdAt]`, Composite `[userId, readAt]`, Composite `[userId, dedupeKey]` (Unique B-tree).

### 2.2 Missing Index Recommendations (Performance Optimization)
1. **`users(token_version)`:** When `getWellnessSession()` validates user sessions on high-frequency requests, it filters on `where: { id: payload.userId }` which utilizes the primary key index. No additional index needed.
2. **`program_enrollments(invoice_expires_at)`:**
   - Query: `where: { status: "PENDING", invoiceExpiresAt: { gt: now } }`
   - Purpose: Used in `wellnessEnrollProgram` to count active checkout holds against `maxQuota`.
   - Recommendation: Add index `@@index([status, invoiceExpiresAt])` on `program_enrollments` to avoid scanning all pending enrollments when user volume increases.

---

## 3. N+1 Query & Database Bottleneck Analysis

### 3.1 Global Notification Dispatch N+1 Loop (HIGH — DB-01)
- **File:** `src/wellness/integrations/dispatch-due-notifications.ts#L60-L163`
- **Root Cause:**
  1. Loads all programs with nested days, enrollments, and push subscriptions in an initial eager query.
  2. Inside a 4-level nested loop (`program` -> `day` -> `slot` -> `due notification`):
     - Executes `prisma.userNotification.findMany({ where: { dedupeKey, userId: { in: enrolledUserIds } } })`
     - Executes `createUserNotifications()`
     - Executes serial HTTP calls to push notification services
- **Impact:** With 5 programs and 21 days, a single run executes dozens of database queries and external HTTP calls sequentially inside the loop, blocking the connection pool.

### 3.2 Member Dashboard Monolithic Over-Fetching (HIGH — DB-02)
- **File:** `src/app/dashboard/page.tsx#L52-L79`
- **Root Cause:**
  ```typescript
  prisma.program.findMany({
    where: { ... },
    include: {
      days: {
        include: {
          progress: { where: { userId: session.userId } }
        }
      }
    }
  });
  ```
- **Impact:** Retrieves the entire 21–90 day syllabus and progress history for every published program on every page visit, rather than querying only the active enrolled program or paginating curriculum days.

---

## 4. Connection Pooling & Transaction Atomicity

### 4.1 PgBouncer Starvation Risk with `connection_limit=1` (HIGH — DB-03)
- **Configuration:** `.env#L1` specifies:
  `DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1"`
- **Technical Risk:**
  - Supabase Transaction Pooler (PgBouncer) holds a client connection exclusively for the entire duration of an interactive transaction (`prisma.$transaction(async (tx) => ...)`).
  - Setting `connection_limit=1` restricts each Node.js process to a single active client connection.
  - When two users execute transactions concurrently (e.g., simultaneous QRIS checkout and payment confirmation), one must wait for the other to release the connection.
  - If a transaction performs external I/O or takes longer than expected, concurrent requests fail with:
    `PrismaClientKnownRequestError: Timed out fetching a new connection from the pool`.
- **Mitigation:**
  - Increase `connection_limit` to at least 5–10 per Node.js server container.
  - Keep interactive transaction scopes minimal (no external HTTP calls or heavy computations inside `tx`).

### 4.2 Atomicity & Race Condition Protections (VERIFIED POSITIVE)
The codebase correctly wraps sensitive mutations in database transactions:
1. **Participant Quota Enforcement:** `wellnessEnrollProgram` and `wellnessConfirmQrisPayment` atomically count active participants and update enrollment inside `prisma.$transaction`, preventing race-condition overselling of cohort seats.
2. **Password Change & Token Invalidation:** `wellnessChangePassword` atomically updates `passwordHash`, increments `tokenVersion`, and marks all existing reset tokens as used in a single transaction.
3. **Master Taxonomy Renaming:** `wellnessUpdateMasterCoach`, `wellnessUpdateMasterCategory`, etc. update related cache strings on programs within a transaction to maintain denormalized consistency.
