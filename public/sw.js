const CACHE_NAME = 'myworld-cozy-v7';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((windowClients) => {
          windowClients.forEach((client) => {
            if ('navigate' in client) {
              client.navigate(client.url).catch(() => {});
            }
          });
        })
      )
  );
});

// Network-first únicamente para navegación del mismo origen; nunca bloquear ni servir HTML antiguo en producción
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});
