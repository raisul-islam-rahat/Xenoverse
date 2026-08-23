const CACHE_NAME = 'xenoverse-v3';

self.addEventListener('install', event => {
    console.log('SW installing');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Network normally.
});
