import React from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function sizeOf(o: unknown) {
  try { return new Blob([JSON.stringify(o)]).size; } catch { return 0; }
}

export const TelemetryConsole: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/telemetry/latest?limit=100`, { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setItems(j.items || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white/60">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold">Telemetry (últimos eventos)</h3>
        <button className="px-2 py-1 text-sm border rounded hover:bg-gray-50" onClick={refresh} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">Horário</th>
              <th className="px-2 py-1">Evento</th>
              <th className="px-2 py-1">Mensagem</th>
              <th className="px-2 py-1">Tamanho</th>
              <th className="px-2 py-1">UA</th>
              <th className="px-2 py-1">IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="odd:bg-gray-50">
                <td className="px-2 py-1 whitespace-nowrap">{new Date(it.createdAt).toLocaleString()}</td>
                <td className="px-2 py-1">{it.event}</td>
                <td className="px-2 py-1 max-w-[28ch] truncate" title={it.message || ''}>{it.message || '-'}</td>
                <td className="px-2 py-1">{sizeOf(it.payload)} B</td>
                <td className="px-2 py-1 max-w-[20ch] truncate" title={it.ua || ''}>{it.ua || '-'}</td>
                <td className="px-2 py-1">{it.ip || '-'}</td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td className="px-2 py-2 text-gray-500" colSpan={6}>Sem eventos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TelemetryConsole;
