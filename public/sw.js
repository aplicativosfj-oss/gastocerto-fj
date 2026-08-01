const CACHE_NAME = "gastocerto-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png"
];

// Instalação e caching de assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Limpeza de caches antigos
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
    })
  );
  self.clients.claim();
});

// Estratégia de Fetch: Network First, falling back to cache
self.addEventListener("fetch", (event) => {
  // Ignorar requests de extensões ou esquemas não suportados
  if (!event.request.url.startsWith("http")) return;

  // Ignorar requests de API do Supabase (dinâmicos) para não quebrar auth
  // No entanto, poderíamos fazer stale-while-revalidate para algumas leituras se necessário
  if (event.request.url.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar a resposta para guardar no cache se for um asset estático
        if (event.request.method === "GET" && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tenta o cache
        return caches.match(event.request);
      })
  );
});
