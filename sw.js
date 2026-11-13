// Bump CACHE_NAME with every deploy so installed copies pick up new files.
const CACHE_NAME = 'ref-notebook-v47';
// The same notebook can live twice on one website (inside the Documenting
// Fictions suite and as its own app), and both workers see every cache there:
// each name carries the folder this copy lives in, and each copy only ever
// clears its own (and its own old ones from before names carried a folder).
const HERE = new URL(self.registration.scope).pathname;
const CACHE = `${CACHE_NAME} ${HERE}`;
const PREFIX = 'ref-notebook-v';
const mine = (k) => k !== CACHE && (k.endsWith(` ${HERE}`) || (k.startsWith(PREFIX) && !k.includes(' ')));
const ASSETS = [
  './', './index.html', './manifest.json',
  ...['base', 'spread', 'cover', 'screen', 'navbar', 'buttons', 'lists', 'folder', 'newboard', 'board', 'board-page', 'viewer', 'sheet', 'options', 'forms', 'toast', 'showboard', 'header-band'].map((n) => `./styles/${n}.css`),
  './data/shared/basics.js', './data/shared/files.js', './data/shared/overthoughts.js', './data/shared/the-eye.js', './data/shared/journal-move.js', './data/shared/json-backup.js',
  './data/shared/zip-format.js', './data/shared/zip-backup.js', './data/shared/zip-restore.js', './data/shared/links.js', './data/shared/df-data.js',
  './app.js',
  ...['board', 'board-text', 'board-tools', 'board-touch', 'boards', 'cover', 'cover-spin', 'folder', 'folders', 'intro', 'newboard', 'options', 'showboard', 'viewer', 'welcome'].map((n) => `./pages/${n}.js`),
  ...['board-page', 'dialogs', 'filing', 'icons', 'keyboard-fit', 'navbar', 'no-zoom', 'pull-shut', 'screen-fit', 'sheet', 'spread', 'stickers', 'textsize', 'toast', 'undo', 'util'].map((n) => `./components/${n}.js`),
  ...['db', 'library', 'pdf', 'photos', 'sendshoot', 'tagger', 'tagger-worker', 'templates'].map((n) => `./data/${n}.js`),
  ...['orange', 'mango', 'berry', 'fern', 'ocean', 'ink'].flatMap((c) => [`./art/${c}-cover.webp`, `./art/${c}-block.webp`]), './fonts/klee-one-latin.woff', './fonts/kaisei-decol-500-latin.woff2', './fonts/figtree-latin.woff2', './fonts/archivo-black-latin.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(mine).map((k) => caches.delete(k)))));
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
          caches.open(CACHE).then((cache) => cache.put(req, copy));
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
