# PERFORMANCE & SCALABILITY AUDIT

## 1. Verified Next.js Production Build Metrics (`npm run build`)

| Route | Route JS Size | First Load JS | Mode |
|---|---:|---:|---|
| `/` | `10.1 kB` | `120 kB` | Dynamic (`ƒ`) |
| `/_not-found` | `873 B` | `88.1 kB` | Static (`○`) |
| `/admin/[[...slug]]` | `58.5 kB` | `184 kB` | Dynamic (`ƒ`) |
| `/admin/desktop-required` | `929 B` | `97.5 kB` | Static (`○`) |
| `/dashboard` | `63.4 kB` | `185 kB` | Dynamic (`ƒ`) |
| `/reset-password` | `3.37 kB` | `100 kB` | Static (`○`) |
| Shared All Routes | — | `87.3 kB` | — |
| Middleware | `32.4 kB` | — | Edge |

*Runtime Core Web Vitals (`FCP`, `LCP`, `INP`, `CLS`, `TTFB`) and API latency (`P50`/`P95`/`P99`) are `NO DATA` — no live RUM/APM monitoring or load testing was executed (`AUD-027`, `AUD-028`).*

---

## 2. Verified Bottlenecks & Resource Risks

1. **Notification Tick Amplification & N+1 Loops (`AUD-007` — HIGH, OPEN)**:
   - Every active member `/dashboard` tab periodically POSTs to `/api/notifications/tick`. Each tick calls `dispatchDueNotifications()`, which queries all published programs, days, active enrollments, and push subscriptions, then loops across programs -> days -> due slots issuing `userNotification.findMany` + `createMany` + Web Push sends. Under 500 concurrent active users, database and push fanout work multiplies ~500x per minute.
2. **Unbounded Admin RSC Payload (`AUD-007` — HIGH, OPEN)**:
   - `src/app/admin/(dashboard)/[[...slug]]/page.tsx` queries up to 200 users (silent cutoff) eagerly joining `healthProfile` and `dayProgress` rows — including potential multi-MB base64 data URI images (`AUD-002`) — into HTML/RSC flight payloads.
3. **31.2 MB Landing Hero Video & Unoptimized Mobile CSS (`AUD-021` — MEDIUM, OPEN)**:
   - `public/video.mp4` (~31.2 MB) is referenced directly by `LandingClient.tsx:285`, creating heavy mobile bandwidth consumption and LCP risk.
   - `src/app/globals.css` disables all `backdrop-filter` globally under `@media (max-width: 768px)`, and `/api/explore/programs` lacks `Cache-Control` headers and returns up to 100 items without pagination metadata.
4. **Monolithic Client Bundles (`AUD-012` — MEDIUM, OPEN)**:
   - `AdminClient.tsx` (`11,720` lines / `582.8 KB`), `MyPlanTab.tsx` (`2,495` lines), and `DailyCheckIn.tsx` (`2,472` lines) lack route/tab code-splitting via `next/dynamic`.
5. **Broken Image Reference Fixed (`AUD-023` — FIXED in Stage 5)**:
   - `ProfileTab.tsx:387` requested non-existent `/program-cover-cardio.webp` (404); updated to `/image.webp`.
