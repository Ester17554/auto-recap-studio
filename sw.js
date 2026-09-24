// V6 intentionally does not cache app files to reduce stale-version problems on iPhone Safari.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim().then(()=>self.registration.unregister())));
