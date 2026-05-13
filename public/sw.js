/**
 * Flor de Batom - Service Worker Básico
 * Permite a instalação do app e cache de recursos essenciais.
 */

const CACHE_NAME = 'flor-de-batom-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://i.ibb.co/6J4J1LMd/florlogo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});