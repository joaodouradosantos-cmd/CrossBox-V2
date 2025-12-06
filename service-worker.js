const CACHE_NAME = "CrossBox-cache-v7";

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./imagens/crossbox_logo.png"
];

// INSTALAÇÃO — pré-cache básico e entra logo em ação
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// ATIVAÇÃO — limpa caches antigos e assume controlo das páginas abertas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegação (abrir app, mudar de dia, etc.) — NETWORK FIRST
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return response;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  // Outros recursos — CACHE FIRST com atualização em fundo
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(req, response));
        }).catch(() => {});
        return cached;
      }

      return fetch(req)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return response;
        })
        .catch(() => {
          return new Response("Offline e sem cache disponível.", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});

