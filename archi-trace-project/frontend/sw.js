const CACHE_NAME = 'architrace-cache-v1';
const urlsToCache = [
  '/',
  '/static/templates/index.html',
  '/static/templates/tracer.html',
  '/static/templates/tutorials.html',
  '/static/templates/login.html',
  '/static/templates/signup.html',
  '/static/css/dashboard.css',
  '/static/css/style.css',
  '/static/css/login.css',
  '/static/css/signup.css',
  '/static/css/tutorials.css',
  '/static/js/dashboard.js',
  '/static/js/app.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});