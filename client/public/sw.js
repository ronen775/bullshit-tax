self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Simple proxy-through
    e.respondWith(fetch(e.request));
});
