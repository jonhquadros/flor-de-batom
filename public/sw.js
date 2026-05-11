
// Service Worker básico para habilitar a instalação PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estratégia de rede primeiro para garantir dados atualizados
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
