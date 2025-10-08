// Telemetria leve para eventos de PDF
// No-op por padrão: só envia se VITE_DEBUG_PDF_TELEMETRY=1

export type PdfEvent = 'pdf_load_success' | 'pdf_load_error';

export function emitPdfEvent(event: PdfEvent, payload?: Record<string, any>): void {
  try {
    if (import.meta.env.VITE_DEBUG_PDF_TELEMETRY !== '1') return;
    const body = { ts: new Date().toISOString(), event, ...(payload || {}) };
    const json = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        navigator.sendBeacon('/api/telemetry', blob);
        return;
      } catch { /* continua para fetch */ }
    }
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    // swallow
  }
}
