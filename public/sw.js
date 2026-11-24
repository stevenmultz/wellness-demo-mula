// ZERA + Sanctuary Wellness PWA Service Worker (Cache + Offline Fallback, Instant Launch Shell)
const CACHE_NAME = "zera-wellness-pwa-v38";

const STATIC_ASSETS = [
  "/pwa-launch.html",
  "/offline.html",
  "/manifest.json",
  "/manifest.json?v=5",
  "/favicon.svg",
  "/icon-v2-192.png?v=5",
  "/icon-v2-512.png?v=5",
  "/icon-maskable-v2-512.png?v=5",
  "/apple-touch-icon-v2.png?v=5",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API routes, service worker script, and Next.js server actions
  if (
    request.method !== "GET" ||
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/api/") ||
    request.headers.has("next-action")
  ) {
    return;
  }

  // Instant 0ms Cache-First for static public PWA launch shell (white screen + zera.id logo)
  if (url.origin === self.location.origin && url.pathname === "/pwa-launch.html") {
    event.respondWith(
      caches.match("/pwa-launch.html").then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put("/pwa-launch.html", copy))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached || caches.match("/offline.html"));
        return cached || networkFetch;
      })
    );
    return;
  }

  // Direct Network-First for HTML page navigations (no double-redirect loading shell)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || (await caches.match("/offline.html")) || (await caches.match("/"));
      })
    );
    return;
  }

  // Instant Cache-First for splash & icons (background-updated when online)
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/splash/") ||
      url.pathname === "/icon-v2-192.png" ||
      url.pathname === "/icon-v2-512.png" ||
      url.pathname === "/icon-maskable-v2-512.png" ||
      url.pathname === "/apple-touch-icon-v2.png")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || networkFetch;
      })
    );
    return;
  }

  // Stale-while-revalidate for other static assets (exclude user /uploads/ media)
  if (
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/uploads/") &&
    (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2|woff|css|js)$/) ||
      url.pathname.startsWith("/_next/static/"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, responseToCache))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cached || Response.error());

        return cached || fetchPromise;
      })
    );
  }
});

// Web Push Notification Listener
self.addEventListener("push", (event) => {
  const defaults = {
    title: "zera.id",
    body: "Waktunya melanjutkan rutinitas mindful wellness hari ini.",
    tag: undefined,
    url: "/dashboard",
  };
  let data = { ...defaults };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = {
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : defaults.title,
          body: typeof parsed.body === "string" && parsed.body.trim() ? parsed.body : defaults.body,
          tag: typeof parsed.tag === "string" && parsed.tag.trim() ? parsed.tag : undefined,
          url: typeof parsed.url === "string" && parsed.url.startsWith("/") ? parsed.url : defaults.url,
        };
      }
    }
  } catch {
    if (event.data) {
      data.body = event.data.text() || defaults.body;
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-v2-192.png?v=5",
    badge: "/icon-v2-192.png?v=5",
    tag: data.tag || undefined,
    data: {
      url: data.url || "/dashboard",
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
