// frontend/src/sw/registerSWOnce.ts
// Registrador "seguro": só registra SW se VITE_ENABLE_SW === '1'.
// Também garante que só registra UMA vez.

export function registerSWOnce() {
  const ENABLE = import.meta.env.VITE_ENABLE_SW === '1';
  if (!ENABLE) return;                                  // 🔒 padrão: não registrar
  if (!('serviceWorker' in navigator)) return;
  if ((window as any).__sw_registered) return;
  (window as any).__sw_registered = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => console.info('[SW] registered'))
      .catch(err => console.error('[SW] register error', err));
  });
}

/**
 * Desinstala qualquer SW e limpa caches quando VITE_DISABLE_SW === '1'.
 * Útil para "virar a chave" e limpar clientes presos em SW antigo.
 */
export async function uninstallSWIfFlagged() {
  const DISABLE = import.meta.env.VITE_DISABLE_SW === '1';
  if (!DISABLE || !('serviceWorker' in navigator)) return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  } catch (e) {
    console.warn('[SW] unregister error', e);
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('[SW] cache clear error', e);
  }

  console.info('[SW] uninstalled and caches cleared');
}

