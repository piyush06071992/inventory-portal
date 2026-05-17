// Minimal Service Worker for Business Saarthi PWA compliance
const CACHE_NAME = 'saarthi-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Directly fetches live contents from network
  e.respondWith(fetch(e.request));
});
