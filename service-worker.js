// A name for our cache
const CACHE_NAME = 'lubelogger-pwa-cache-v1.0.2';

// A list of all the essential files our app needs to run offline
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './scripts.js',
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
    './icons/add-fuel.svg',
    './icons/add-odo.svg',
];

// --- Event Listeners ---

// 1. Install Event: Fired when the service worker is first installed.
// We open our cache and add the core app files to it.
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Caching failed', error);
            })
    );
});

// 2. Fetch Event: Fired every time the app makes a network request (e.g., for a CSS file, an image, or an API call).
// We check if the requested item is in our cache. If so, we serve it from the cache. If not, we let it go to the network.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If we found a match in the cache, return it.
                if (response) {
                    return response;
                }
                // Otherwise, let the request go to the network as normal.
                return fetch(event.request);
            })
    );
});

// 3. Activate Event: Fired when the service worker is activated.
// This is a good place to clean up old caches from previous versions of the service worker.
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
