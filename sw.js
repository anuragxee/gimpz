/* ============================================================
   GIMPZ — Service Worker (PWA offline support + caching)
   ============================================================ */
var CACHE_NAME = 'gimpz-v1';
var CACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './assets/favicon.svg',
  './assets/products/placeholder.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_URLS).catch(function () { /* ignore individual failures */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Only cache same-origin requests (skip Supabase, fonts, GA)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetchPromise = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return cached || caches.match('./index.html');
      });
      return cached || fetchPromise;
    })
  );
});
