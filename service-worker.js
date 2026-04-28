const CACHE_NAME = 'immersive-diary-pwa-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/app-preview.png',
    './assets/noise-texture.png',
    './src/style.css',
    './src/style-enhancements.css',
    './src/custom-dialog.js',
    './src/modal-blur.js',
    './src/ui-enhancements.js',
    './src/utils.js',
    './src/runtime.js',
    './src/app.js',
    './src/webdav-settings.js',
    './src/webdav-sync.js',
    './src/pwa.js',
    './node_modules/quill/dist/quill.snow.css',
    './node_modules/quill/dist/quill.js',
    './node_modules/jszip/dist/jszip.min.js',
    './node_modules/file-saver/dist/FileSaver.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    return response;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    return cache.match('./index.html');
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                const responseCopy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
                return networkResponse;
            });
        })
    );
});
