/* frontend/public/sw.js — kill-switch temporário */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch {}
    try { await self.registration.unregister(); } catch {}
    // remove controle de abas e recarrega SEM SW
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) { try { c.navigate(c.url); } catch {} }
  })());
});
// não intercepta nada
self.addEventListener('fetch', () => {});
