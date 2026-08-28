const CACHE_NAME = 'schoolheat-v2';
const ASSETS = [
  './', './index.html', './style.css', './script.js', './manifest.json',
  './assets/school-bg.jpg', './assets/school-logo.png', './assets/campus-map.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
