// V3 intentionally does not cache the app. This prevents stale V1/V2 HTML on iPhone Safari.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim().then(()=>self.registration.unregister())));
