// BMS Sanctuary Wellness PWA Service Worker (Instant Launch Loading Shell)
const CACHE_NAME = "bms-wellness-pwa-v8";

const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/image.webp",
];

// In-memory maps for 0ms navigation handoff during cold starts
const inflightNavMap = new Map();
const resolvedNavMap = new Map();
let navCounter = 0;

function pruneNavMaps() {
  const cutoff = Date.now() - 30000;
  for (const [key, val] of resolvedNavMap.entries()) {
    if (val.ts < cutoff) resolvedNavMap.delete(key);
  }
  if (inflightNavMap.size > 32) {
    inflightNavMap.clear();
  }
}

function buildInstantLoadingHtml(navId, originalUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#09090b" />
  <title>+ BMS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #09090b url('/image.webp') center/cover no-repeat;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-font-smoothing: antialiased;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(9, 9, 11, 0.88), rgba(9, 9, 11, 0.45), rgba(9, 9, 11, 0.78));
      pointer-events: none;
    }
    @keyframes bmsPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .bms-loader {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 2px;
      background: rgba(9, 9, 11, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      animation: bmsPulse 1.3s ease-in-out infinite;
    }
    .bms-plus {
      font-weight: 300;
      font-size: 18px;
      line-height: 1;
      color: #ffffff;
    }
    .bms-word {
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="bms-loader" role="status" aria-label="Loading">
    <span class="bms-plus">+</span>
    <span class="bms-word">BMS</span>
  </div>
  <script>
    (function() {
      var navId = ${JSON.stringify(navId)};
      var fallbackUrl = ${JSON.stringify(originalUrl)};
      fetch("/__bms_sw_wait?id=" + encodeURIComponent(navId), { credentials: "same-origin", cache: "no-store" })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data.ok && data.targetUrl) {
            window.location.replace(data.targetUrl);
          } else if (data && data.offline) {
            window.location.replace("/offline.html");
          } else {
            window.location.replace(fallbackUrl);
          }
        })
        .catch(function() {
          window.location.replace("/offline.html");
        });
    })();
  </script>
</body>
</html>`;
}

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

  // Internal SW endpoint that resolves once the background navigation fetch completes
  if (url.pathname === "/__bms_sw_wait") {
    const id = url.searchParams.get("id");
    const pending = id ? inflightNavMap.get(id) : null;
    if (!pending) {
      event.respondWith(
        new Response(JSON.stringify({ ok: false }), {
          headers: { "Content-Type": "application/json" },
        })
      );
      return;
    }

    event.respondWith(
      pending
        .then((response) => {
          inflightNavMap.delete(id);
          pruneNavMaps();
          const targetUrl = response.url || pending.originalUrl;
          resolvedNavMap.set(targetUrl, {
            response: response.clone(),
            ts: Date.now(),
          });
          return new Response(JSON.stringify({ ok: true, targetUrl }), {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        })
        .catch(() => {
          inflightNavMap.delete(id);
          return new Response(JSON.stringify({ ok: false, offline: true }), {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        })
    );
    return;
  }

  // Skip non-GET and chrome-extension / server action / api requests
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || request.headers.has("next-action")) {
    return;
  }

  // Instant Loading Shell for HTML navigations:
  // Paints the + BMS loading screen within 60ms if the server is cold-starting
  if (request.mode === "navigate") {
    const preResolved = resolvedNavMap.get(request.url);
    if (preResolved && Date.now() - preResolved.ts < 20000) {
      resolvedNavMap.delete(request.url);
      event.respondWith(Promise.resolve(preResolved.response));
      return;
    }

    event.respondWith(
      (async () => {
        const navId = String(++navCounter) + "-" + Date.now();
        const networkPromise = fetch(request);
        networkPromise.originalUrl = request.url;

        let timerId;
        const timeoutPromise = new Promise((resolve) => {
          timerId = setTimeout(() => resolve("TIMEOUT"), 60);
        });

        try {
          const winner = await Promise.race([networkPromise, timeoutPromise]);
          clearTimeout(timerId);

          if (winner !== "TIMEOUT") {
            return winner;
          }

          // Server took > 60ms (cold start / slow network):
          // Immediately paint the + BMS loading page while keeping networkPromise running in background!
          inflightNavMap.set(navId, networkPromise);
          return new Response(buildInstantLoadingHtml(navId, request.url), {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          });
        } catch {
          clearTimeout(timerId);
          const cached = await caches.match(request);
          return cached || (await caches.match("/offline.html")) || (await caches.match("/"));
        }
      })()
    );
    return;
  }

  // Stale-while-revalidate for public static assets (exclude user /uploads/ media)
  if (
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
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});

// Web Push Notification Listener
self.addEventListener("push", (event) => {
  let data = { title: "BMS Sanctuary", body: "Waktunya melanjutkan rutinitas mindful wellness hari ini." };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
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
