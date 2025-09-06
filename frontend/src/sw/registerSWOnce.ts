export function registerSWOnce() {
  const ENABLE = import.meta.env.VITE_ENABLE_SW === '1'; // padrão: off
  if (!ENABLE || !('serviceWorker' in navigator)) return;
  if ((window as any).__sw_registered) return;
  (window as any).__sw_registered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => console.info('[SW] registered'))
      .catch(err => console.error('[SW] register error', err));
  });
}
export async function uninstallSWIfFlagged() {
  const DISABLE = import.meta.env.VITE_DISABLE_SW === '1';
  if (!DISABLE || !('serviceWorker' in navigator)) return;
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } catch {}
  try { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch {}
  console.info('[SW] uninstalled + caches cleared');
}
