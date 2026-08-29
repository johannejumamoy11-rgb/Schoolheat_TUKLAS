/* ===== SCHOOLHEAT SERVICE WORKER v2.0 ===== */
const CACHE_NAME = 'schoolheat-v2-2026';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/assets/school-bg-mobile.jpg',
  '/assets/school-logo.png',
  '/assets/app-logo.png',
  '/assets/campus-map.jpg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.url.includes('googleapis') || request.url.includes('gstatic') || request.url.includes('chart.js')) {
    e.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return resp;
      });
    })
  );
});
