// frontend/public/sw.js — SW "kill-switch" temporário
self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
    try {
      await self.registration.unregister();
    } catch {}
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      try { client.navigate(client.url); } catch {}
    }
  })());
});

// não intercepta nada
self.addEventListener('fetch', () => {});
