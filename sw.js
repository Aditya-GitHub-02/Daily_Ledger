// The Daily Ledger — minimal service worker (offline shell + PWA installability)
const CACHE = 'ledger-v6';
const ASSETS = ['./', './index.html', './support.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Supabase / cross-origin API calls — always hit the network.
  if (url.origin !== self.location.origin) return;
  // Network-first for the app shell so updates land; fall back to cache offline.
  // IMPORTANT: only fall back to index.html for PAGE navigations — never for
  // scripts/assets (returning HTML for a .js request breaks the whole app).
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
      return res;
    }).catch(() => caches.match(req).then((m) => {
      if (m) return m;
      if (req.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
