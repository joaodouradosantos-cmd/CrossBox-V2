// service-worker.js (v2)

const CACHE_NAME = "crossbox-v2-cache";

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./imagens/crossbox_logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // Navegação – network first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Recursos estáticos – cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req)
          .then(res => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          })
          .catch(() => {});
        return cached;
      }

      return fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(
          () =>
            new Response("Offline e sem cache disponível.", {
              status: 503,
              statusText: "Offline"
            })
        );
    })
  );
});
