/* ============================================================
   Tabuleta — service worker

   A versão abaixo é escrita por `npm run release`, a partir do package.json.
   Não editar à mão: antes, a mesma versão estava repetida em cinco sítios e
   bastava esquecer um para servir ficheiros de versões diferentes ao mesmo
   utilizador — um sintoma difícil de diagnosticar à distância.
   ============================================================ */

const VERSION = "11.1.1"; /* gerado */
const CACHE = `tabuleta-v${VERSION}`;

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "assets/html2canvas.min.js?v=11.1.1",
  "styles/app.css?v=11.1.1",
  "styles/base.css?v=11.1.1",
  "styles/menu.css?v=11.1.1",
  "styles/templates.css?v=11.1.1",
  "src/main.js?v=11.1.1",
  "src/app/dom.js",
  "src/app/editor-view.js",
  "src/app/exporter.js",
  "src/app/logo.js",
  "src/app/menu-view.js",
  "src/app/modal.js",
  "src/app/store.js",
  "src/app/theme.js",
  "src/app/toast.js",
  "src/core/backup.js",
  "src/core/date.js",
  "src/core/day.js",
  "src/core/filename.js",
  "src/core/fit.js",
  "src/core/history.js",
  "src/core/menu-html.js",
  "src/core/settings.js",
  "src/core/templates.js",
  "src/core/text.js",
  "src/data/keys.js",
  "src/data/migrations.js",
  "src/data/repository.js",
  "src/data/storage.js",
  "assets/fonts/fraunces-roman.woff2",
  "assets/fonts/fraunces-italic.woff2",
  "assets/fonts/archivo.woff2",
  "assets/fonts/oswald.woff2",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
];

/**
 * Pré-carrega ficheiro a ficheiro em vez de tudo de uma vez.
 *
 * `cache.addAll` é atómico: basta um dos ficheiros falhar para a instalação
 * inteira falhar e a app ficar sem funcionamento offline. Com trinta e seis
 * ficheiros, vale mais instalar com um em falta — que a primeira utilização
 * online resolve — do que não instalar de todo.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          ASSETS.map((asset) =>
            cache.add(asset).catch(() => {
              /* um ficheiro em falta não impede a instalação */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function cachePut(request, response) {
  if (response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

/**
 * Duas estratégias, consoante o que se pede.
 *
 * O documento (a navegação) vai primeiro à rede, e só cai na cache se não
 * houver ligação. É o que garante que uma versão nova publicada chega mesmo a
 * quem tem a app instalada: o index.html não leva versão no endereço, por isso
 * servi-lo sempre da cache deixaria o utilizador preso à versão instalada,
 * a apontar para módulos que já mudaram.
 *
 * Todo o resto vem da cache primeiro — é conteúdo versionado ou imutável, e é
 * isto que faz a app abrir de imediato e funcionar sem ligação.
 */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => cachePut(event.request, response))
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((response) => cachePut(event.request, response))
        .catch(() => Response.error());
    })
  );
});
