// V5 intentionally avoids caching to prevent stale app files on iPhone Safari.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim().then(()=>self.registration.unregister())));
