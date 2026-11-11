// Bump CACHE_NAME with every deploy so installed copies pick up new files.
const CACHE_NAME = 'ref-notebook-v26';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './js/app.js', './js/db.js', './js/editor.js', './js/filing.js', './js/icons.js', './js/library.js',
  './js/navbar.js', './js/newboard.js', './js/options.js', './js/stickers.js', './js/spread.js', './js/textsize.js', './js/showboard.js', './js/pages.js', './js/pdf.js', './js/photos.js', './js/screens.js',
  './js/tagger.js', './js/tagger-worker.js', './js/templates.js', './js/ui.js', './js/undo.js', './js/util.js', './js/viewer.js',
  ...['orange', 'mango', 'berry', 'fern', 'ocean', 'ink'].flatMap((c) => [`./art/${c}-cover.webp`, `./art/${c}-block.webp`]), './fonts/mansalva-latin.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Network first, so a fresh deploy shows up right away; the cache answers offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/ml/')) return; // the big model files look after themselves
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
  );
});
