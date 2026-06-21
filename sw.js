const CACHE_NAME = "sit-mhan-v3";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./logo-transparent.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each file individually so that one missing/renamed file
      // can't fail the entire install (cache.addAll fails all-or-nothing).
      return Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("SW: failed to cache", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        // Offline fallback - return cached index.html
        return caches.match("./index.html");
      });
    })
  );
});