# SOFTWARE ENGINEERING & RELIABILITY BUG FINDINGS

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Standard:** IEEE 1044 (Standard Classification for Software Anomalies), ISO/IEC 25010  

---

## 1. Summary of Bug Findings

| Bug ID | Title | Severity | Category | Status | Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Service Worker 60ms Timeout Infinite Navigation Reload Loop | **HIGH** | PWA / Reliability | **CONFIRMED** | Medium |
| **BUG-02** | Client-Triggered Global Platform Notification Dispatch | **HIGH** | Performance / Architecture | **CONFIRMED** | Medium |
| **BUG-03** | Serverless Local Disk Write Failure & 5MB Base64 DB Fallback | **HIGH** | Storage / Data Integrity | **CONFIRMED** | Medium |
| **BUG-04** | Monolithic Client Component Architecture (`AdminClient.tsx` 11,719 Lines)| **MEDIUM** | Code Quality / Bundle | **CONFIRMED** | High |
| **BUG-05** | Missing Dedicated Offline Fallback Page in Service Worker | **MEDIUM** | PWA / Offline UX | **CONFIRMED** | Low |
| **BUG-06** | `sharp` Misplaced in `devDependencies` Instead of Production Runtime | **MEDIUM** | Supply Chain / Ops | **CONFIRMED** | Low |
| **BUG-07** | PgBouncer Connection Pool Starvation with `connection_limit=1` | **HIGH** | Database / SRE | **CONFIRMED** | Medium |
| **BUG-08** | Monolithic SSR Serialization on `/dashboard` | **MEDIUM** | Performance / Latency | **CONFIRMED** | Medium |
| **BUG-09** | W3C Manifest Missing Explicit `"scope": "/"` | **LOW** | PWA Specification | **CONFIRMED** | Low |
| **BUG-10** | Obsolete SQLite Database File Left in Repository | **LOW** | Repository Hygiene | **CONFIRMED** | Low |

---

## 2. Detailed Bug Dossiers

### BUG-01: Service Worker 60ms Timeout Infinite Navigation Reload Loop
- **Severity:** **HIGH**
- **Category:** PWA / Reliability
- **Affected File:** `public/sw.js#L182-L226`
- **Technical Explanation:**
  When `request.mode === "navigate"`, the service worker sets a 60ms timer via `Promise.race([fetch(request), timeoutPromise])`.
  If the network request takes longer than 60ms, the service worker returns a synthetic HTML page (`buildInstantLoadingHtml`) which calls `fetch("/__bms_sw_wait?id=" + navId)` to receive the resolved response URL and perform `window.location.replace()`.
- **Failure Scenario:**
  On mobile networks or during serverless cold starts (where TTFB is typically 200–800ms), 100% of navigations exceed 60ms. If the browser terminates the idle background service worker, in-memory `inflightNavMap` is cleared. `/__bms_sw_wait` returns `{ ok: false }`, which triggers `window.location.replace(fallbackUrl)`, triggering the 60ms timeout again, producing an **infinite reload loop** or blank flickering screen.
- **Remediation:** Remove the 60ms synthetic race condition. Use standard network-first navigation with graceful fallback to a cached offline page.

---

### BUG-02: Client-Triggered Global Platform Notification Dispatch
- **Severity:** **HIGH**
- **Category:** Performance / Architecture
- **Affected Files:**
  - `src/app/api/notifications/tick/route.ts#L32`
  - `src/wellness/integrations/dispatch-due-notifications.ts#L60-L163`
- **Technical Explanation:**
  Every active member viewing `/dashboard` fires `POST /api/notifications/tick` once a minute. This endpoint calls `dispatchDueNotifications({ lookbackMinutes: 2 })`, which loads all published programs, all days, and all active enrollments across the **entire platform**, running multiple queries inside nested loops.
- **Impact:** With 50 concurrent active users, 200 redundant full-database dispatch runs execute per minute, causing connection pool exhaustion on Supabase and sending duplicate push notifications if race conditions occur.
- **Remediation:** Decouple `/api/notifications/tick` to only retrieve the calling user's unread inbox count. Restrict global dispatching strictly to `/api/cron/dispatch-notifications`.

---

### BUG-03: Serverless Local Disk Write Failure & 5MB Base64 DB Fallback
- **Severity:** **HIGH**
- **Category:** Storage / Data Integrity
- **Affected File:** `src/app/api/upload/route.ts#L63-L87`
- **Technical Explanation:**
  Workout check-in photos attempt to write to `public/uploads/workouts/` on the local filesystem. In serverless environments (Vercel Lambdas), the local filesystem is read-only. `fs.writeFileSync` throws, triggering the catch block which returns the full base64 data URL:
  ```typescript
  const fallbackDataUrl = `data:${verifiedMime};base64,${buffer.toString("base64")}`;
  ```
- **Impact:** Storing 5MB base64 strings in PostgreSQL columns (`ProgramDayProgress.photoBeforeUrl`) causes rapid table bloat (6.67 MB per photo), saturating database RAM, connection bandwidth, and increasing query latency.
- **Remediation:** Integrate Cloud Object Storage (S3 / R2 / Supabase Storage) and return permanent CDN URLs.

---

### BUG-04: Monolithic Client Component Architecture (`AdminClient.tsx`)
- **Severity:** **MEDIUM**
- **Category:** Code Quality / Bundle Size
- **Affected File:** `src/components/admin/AdminClient.tsx`
- **Technical Explanation:**
  `AdminClient.tsx` contains **11,719 lines of code** in a single file, managing program authoring, participant submissions, payment verification, and master directories.
- **Impact:** High maintenance overhead, slow compilation, large client chunk (58.6 kB route size, 183 kB First Load JS).
- **Remediation:** Split into modular sub-tab components loaded dynamically with `next/dynamic`.

---

### BUG-05: Missing Dedicated Offline Fallback Page in Service Worker
- **Severity:** **MEDIUM**
- **Category:** PWA / Offline UX
- **Affected File:** `public/sw.js#L222`, `public/manifest.json`
- **Technical Explanation:**
  When network navigation fails offline, `sw.js` attempts to return cached `/` (the public landing page). If Next.js static chunks are not cached, a broken white screen appears.
- **Remediation:** Add a standalone `public/offline.html` page and precache it during service worker installation.

---

### BUG-06: `sharp` Misplaced in `devDependencies` Instead of Production Runtime
- **Severity:** **MEDIUM**
- **Category:** Supply Chain / Ops
- **Affected File:** `package.json#L43`
- **Technical Explanation:**
  `sharp` is placed under `devDependencies`. When deployed in container environments with `npm install --production`, `sharp` is omitted, causing Next.js to log image optimization warnings and fall back to CPU-heavy unoptimized processing.
- **Remediation:** Move `"sharp": "^0.35.5"` to `"dependencies"` in `package.json`.

---

### BUG-07: PgBouncer Connection Pool Starvation with `connection_limit=1`
- **Severity:** **HIGH**
- **Category:** Database / SRE
- **Affected File:** `.env#L1`
- **Technical Explanation:**
  `connection_limit=1` restricts each Node.js process to a single active client connection. When concurrent interactive transactions (`prisma.$transaction`) occur, requests queue up, leading to connection acquisition timeouts.
- **Remediation:** Elevate `connection_limit` to 5–10 in production and ensure short transaction lifecycles.
