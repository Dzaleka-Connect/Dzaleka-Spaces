const CACHE_NAME = "dzaleka-spaces-v4";
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/logo-mark-teal.svg",
  "/icon-maskable.svg",
  "/dzaleka-marketplace.jpeg",
  "/dzaleka-community-overview.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok)
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
            return response;
          })
      )
    );
  }
});
