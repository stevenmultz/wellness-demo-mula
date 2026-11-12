# PROGRESSIVE WEB APP (PWA) & SERVICE WORKER AUDIT

**Project:** `wellness-pwa` (+ BMS — Longevity & Movement Sanctuary)  
**Standard:** W3C Progressive Web App Specification, Google Lighthouse PWA Criteria  
**PWA Readiness Score:** **76 / 100** (Installable, but Service Worker Navigation & Offline Fallback need remediation)  

---

## 1. W3C Manifest Validation (`public/manifest.json`)

| Manifest Property | Configured Value | W3C Standard Requirement | Evaluation |
| :--- | :--- | :--- | :--- |
| `name` | `+ BMS — Longevity & Movement Sanctuary` | Non-empty string | **PASS** |
| `short_name` | `+ BMS` | Short name for home screen | **PASS** |
| `start_url` | `/dashboard` | Absolute or relative URL | **PASS** |
| `scope` | *Omitted* | Explicit scope recommended | **WARNING (PWA-02):** Should explicitly declare `"scope": "/"` |
| `display` | `standalone` | `standalone` or `fullscreen` | **PASS** |
| `orientation` | `portrait-primary` | Specific orientation | **PASS** |
| `background_color` | `#000000` | Valid hex color | **PASS** |
| `theme_color` | `#000000` | Valid hex color | **PASS** |
| `icons` | 180x180, 192x192, 512x512 | PNG icons with `purpose: "any"` and `purpose: "maskable"` | **PASS** |

---

## 2. Service Worker Architecture (`public/sw.js`)

### 2.1 Lifecycle Management
- **Installation:**
  ```javascript
  self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
    self.skipWaiting();
  });
  ```
  Forces immediate activation upon new version deployment. (Clean)
- **Activation:**
  ```javascript
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
      )
    );
    self.clients.claim();
  });
  ```
  Deletes stale cache buckets and claims unmanaged clients immediately. (Clean)

### 2.2 Navigation Interception Risk Analysis (HIGH — PWA-01)
- **Current Logic:**
  ```javascript
  if (request.mode === "navigate") {
    // ...
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve("TIMEOUT"), 60));
    const winner = await Promise.race([networkPromise, timeoutPromise]);
    if (winner !== "TIMEOUT") return winner;

    // Server took > 60ms: return synthetic loading HTML and fetch /__bms_sw_wait in background
    inflightNavMap.set(navId, networkPromise);
    return new Response(buildInstantLoadingHtml(navId, request.url), ...);
  }
  ```
- **Identified Failure Mode:**
  1. The 60ms threshold is extremely aggressive. On standard mobile cellular connections (4G/5G) or during serverless cold starts (200ms–800ms TTFB), **100% of navigations trip this 60ms timeout**.
  2. The browser renders the synthetic `buildInstantLoadingHtml` page.
  3. The synthetic page executes JavaScript to query `/__bms_sw_wait?id=navId`.
  4. If mobile OS memory pressure terminates the background Service Worker thread before the fetch completes, in-memory `inflightNavMap` is cleared.
  5. `/__bms_sw_wait` returns `{ ok: false }`, falling back to `window.location.replace(fallbackUrl)`.
  6. The browser initiates a new navigation, triggering the 60ms race again -> **Infinite Screen Flickering / Reload Loop**.
- **Remediation:** Remove the in-memory synthetic 60ms navigation race. Implement standard Network-First navigation with fallback to a cached offline page.

### 2.3 Offline Availability & Static Asset Caching (MEDIUM — PWA-02)
- **Deficiency:**
  - `STATIC_ASSETS` contains only: `["/", "/manifest.json", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/image.webp"]`.
  - There is no dedicated offline HTML fallback page (e.g. `public/offline.html`).
  - If a user opens `/dashboard` while offline and the network fails, the service worker returns cached `/` (the public landing page) without styles or scripts, causing a broken white screen.
- **Remediation:**
  1. Create a dedicated self-contained `public/offline.html` with inline styling and offline retry button.
  2. Precache `/offline.html` during the Service Worker `install` event.
  3. When `fetch(request)` fails during navigation, return `/offline.html`.

---

## 3. Web Push Notifications & iOS Compatibility

### 3.1 Push Lifecycle Implementation
- **Notification Reception (`push` event):**
  - Parses JSON payload or fallback text.
  - Sets vibration pattern `[100, 50, 100]` and icons.
  - Calls `self.registration.showNotification()`.
- **Notification Interaction (`notificationclick` event):**
  - Closes notification banner.
  - Searches for existing client windows matching `targetUrl` and focuses them; otherwise opens a new window (`clients.openWindow`).

### 3.2 Apple iOS PWA Considerations
- In `src/components/dashboard/tabs/usePushNotifications.ts#L20-L27`:
  - Properly detects iOS Safari and verifies `display-mode: standalone`.
  - Accurately guides users on iOS:
    *"On iPhone, notifications only work after you add this app to your Home Screen (Share → Add to Home Screen), then open it from there."*
  - Conforms to Apple Web Push requirements introduced in iOS 16.4+.
