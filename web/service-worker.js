const CACHE_PREFIX = "aig-studio-runtime-";
const CACHE_NAME = CACHE_PREFIX + "374-live-rgb-runtime-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./aigii-skin.css", "./aigii-overlay.js"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Prefer fresh HTML; offline restores only the last known working page.
    event.respondWith(
      fetch(request).then(async response => {
        if (response && response.ok && url.pathname !== "/gallery.html") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", response.clone());
        }
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(url.pathname.endsWith("/gallery.html") ? "./gallery.html" : "./index.html")) ||
          new Response("網站離線快取尚未就緒", {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      })
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }))
  );
});
