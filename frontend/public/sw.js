// frontend/public/sw.js — kill-switch temporário (1 deploy basta)
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
    // força abas a re-navegar SEM SW ativo
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) { try { c.navigate(c.url); } catch {} }
  })());
});

// não intercepta nada
self.addEventListener('fetch', () => {});

