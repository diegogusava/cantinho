const CACHE = "cantinho-v5";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([
    "./", "index.html", "common.css", "common.js",
    "pintar.html"
  ])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then(async (response) => {
        if (response.ok) {
          try { await cache.put(event.request, response.clone()); } catch {}
        }
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
