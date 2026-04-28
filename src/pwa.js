(function () {
    'use strict';

    const runtime = window.appRuntime || {};
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const isSecureContextLike = window.isSecureContext || localHosts.has(window.location.hostname);

    if (!('serviceWorker' in navigator) || runtime.isElectron || !isSecureContextLike) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('PWA service worker registered:', registration.scope);
            })
            .catch((error) => {
                console.warn('PWA service worker registration failed:', error);
            });
    });
})();
