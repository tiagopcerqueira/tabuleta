/* ============================================================
   Prato do Dia — service worker
   Pré-carrega tudo para a app funcionar offline e poder ser
   instalada no ecrã inicial. Ao atualizar a app: incrementar
   o CACHE (e o ?v= no index.html) para os clientes receberem
   os ficheiros novos.
   ============================================================ */

const CACHE = "prato-do-dia-v4";

const ASSETS = [
  "./",
  "index.html",
  "styles.css?v=4",
  "app.js?v=4",
  "manifest.json",
  "assets/html2canvas.min.js",
  "assets/fonts/fraunces-roman.woff2",
  "assets/fonts/fraunces-italic.woff2",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((res) => {
          // Guarda respostas da mesma origem para servir offline
          if (res.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline e fora de cache: navegações caem na própria app
          if (event.request.mode === "navigate") return caches.match("./");
          return Response.error();
        });
    })
  );
});
