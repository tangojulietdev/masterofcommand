const CACHE = 'moc-v20';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isHTML = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');

  if (isHTML) {
    // NETWORK-FIRST for the app itself: updates always win; cache is offline fallback
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    // CACHE-FIRST for icons/manifest, refreshed in background
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request).then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
