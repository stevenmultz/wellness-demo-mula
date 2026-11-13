# PWA & OFFLINE AUDIT

## 1. Manifest & Installability (`public/manifest.json`)
- **Identity & Theme**: Configured with `start_url: "/dashboard"`, `scope: "/"`, `display: "standalone"`, `background_color` / `theme_color`, and complete PNG icon sizes (`192x192`, `512x512`, `apple-touch-icon.png`) plus SVG favicon.
- **Offline Fallback Page**: `public/offline.html` is pre-cached during SW `install` in `STATIC_ASSETS`.

---

## 2. Service Worker (`public/sw.js`) & Lifecycle Findings

1. **CRITICAL/HIGH Offline Navigation Infinite Reload Loop (`AUD-008` — FIXED in Stage 5)**:
   - *Before fix*: For HTML navigations slower than `60ms`, `sw.js` painted `buildInstantLoadingHtml(navId, originalUrl)` which fetched `/__bms_sw_wait?id=...`. When offline or if the network promise rejected, `/__bms_sw_wait` returned `{ ok: false }` (`HTTP 200`), causing the inline script to run `window.location.replace(fallbackUrl)` — triggering an **infinite navigation reload loop** instead of rendering `/offline.html`.
   - *Before fix*: `inflightNavMap` and `resolvedNavMap` lacked bounds/TTL eviction, and the static cache regex cached `/uploads/...` user images into the shared browser SW cache.
   - *Stage 5 Fix Applied*: Bumped `CACHE_NAME` to `"bms-wellness-pwa-v8"`, updated `/__bms_sw_wait` `.catch()` to return `{ ok: false, offline: true }` and redirect cleanly to `"/offline.html"`, added `pruneNavMaps()`, and excluded `/uploads/` from SW caching.
2. **SW Registration & Update Lifecycle (`AUD-025` — LOW, OPEN)**:
   - `src/components/providers/ServiceWorkerRegister.tsx` registers `/sw.js` silently on mount without listening for `updatefound` / `controllerchange` or notifying users to reload for new releases.
3. **Web Push Delivery (`AUD-018` — FIXED in Stage 5; `AUD-015` — OPEN)**:
   - `public/sw.js` registers `push` and `notificationclick` listeners properly, and `web-push.ts` classifies `404`/`410` expired push tokens (`isGone: true`) for DB pruning.
   - Added missing VAPID key configuration guard in `web-push.ts` (**Fixed Stage 5**).
   - `DashboardClient.tsx` still embeds a fallback VAPID public key string and calls `/api/cron/dispatch-notifications` without auth (`AUD-015` — OPEN).
4. **Checkout Offline Rejection Handling (`AUD-017` — FIXED in Stage 5)**:
   - Added `catch` error handling in `QrisCheckoutModal.tsx` (`handleModeChange`, `handleRegenerateQris`) so offline Server Action failures display user feedback instead of failing silently with unhandled promise rejections.
