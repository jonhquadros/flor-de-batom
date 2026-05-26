
// Service Worker básico para permitir a instalação do PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Apenas passa as requisições adiante (estratégia network-only)
  // Necessário para o navegador detectar que o site é um PWA instalável
  event.respondWith(fetch(event.request));
});
