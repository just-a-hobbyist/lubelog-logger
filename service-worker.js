const CACHE_NAME = 'lubelogger-pwa-cache-v1.0.6';

const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './js/main.js',
    './js/api.js',
    './js/ui.js',
    './js/eventlisteners.js',
    './js/state.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-1024x1024.png',
    './icons/icon-32x32.png',
    './icons/icon-maskable-512x512.png',
    './icons/android-chrome-192x192.png',
    './icons/android-chrome-512x512.png',
    './icons/favicon-16x16.png',
    './icons/favicon-32x32.png',
    './icons/favicon.ico',
    './icons/icon.svg',
    './img/back-btn.svg',
    './img/chevron-icon.svg',
    './img/close-btn.svg',
    './img/menu-btn.svg',
    './img/refresh-btn.svg',
    './version.json'
];

// --- Event Listeners ---

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                const cachePromises = urlsToCache.map(url => {
                    return fetch(url, { cache: 'reload' }) // Use cache: 'reload' to bypass browser cache
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to fetch ${url}: ${response.status}`);
                            }
                            return cache.put(url, response);
                        });
                });
                return Promise.all(cachePromises);
            })
            .catch((error) => {
                console.error('Service Worker: Caching failed', error);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
