import { useEffect, useState } from 'react';
import { fetchThemes, createThemeApi, updateThemeApi } from '@/services/essays.service';

type Props = { open: boolean; onClose: () => void };

export default function ThemesManager({ open, onClose }: Props) {
  const [type, setType] = useState<'ENEM'|'PAS'>('PAS');
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const data = await fetchThemes({ type });
        if (!alive) return;
        setThemes(Array.isArray(data) ? data : data?.data || []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.message || 'Erro ao carregar temas');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false };
  }, [open, type]);

  async function toggleActive(t: any) {
    try {
      await updateThemeApi(t._id || t.id, { active: !t.active });
      const data = await fetchThemes({ type });
      setThemes(Array.isArray(data) ? data : data?.data || []);
    } catch (e:any) { setErr(e?.response?.data?.message || 'Erro ao atualizar tema'); }
  }

  async function createTheme() {
    if (!name.trim()) return;
    try {
      setCreating(true);
      await createThemeApi({ name: name.trim(), type });
      setName('');
      const data = await fetchThemes({ type });
      setThemes(Array.isArray(data) ? data : data?.data || []);
    } catch (e:any) { setErr(e?.response?.data?.message || 'Erro ao criar tema'); }
    finally { setCreating(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-ys-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Temas de Redação</h3>
          <button className="text-ys-ink" onClick={onClose}>Fechar</button>
        </div>
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[#111827]">Tipo</label>
            <select value={type} onChange={e=> setType(e.target.value as any)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="PAS">PAS</option>
              <option value="ENEM">ENEM</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#111827]">Novo tema</label>
            <div className="flex gap-2">
              <input value={name} onChange={e=> setName(e.target.value)} placeholder="Descrição do tema" className="flex-1 rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50" onClick={createTheme} disabled={creating || !name.trim()}>Adicionar</button>
            </div>
          </div>
        </div>
        {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
        <div className="max-h-[320px] overflow-auto rounded-lg border border-[#E5E7EB]">
          {loading ? (
            <div className="p-4 text-sm text-ys-ink-2">Carregando…</div>
          ) : themes.length === 0 ? (
            <div className="p-4 text-sm text-ys-ink-2">Sem temas</div>
          ) : (
            <table className="w-full text-sm text-[#111827]">
              <thead className="bg-[#F3F4F6] text-left text-[#374151]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tema</th>
                  <th className="px-4 py-2 font-semibold">Ativo</th>
                  <th className="px-4 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {themes.map((t:any)=> (
                  <tr key={t._id || t.id}>
                    <td className="px-4 py-2">{t.name}</td>
                    <td className="px-4 py-2">{t.active ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-2">
                      <button className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 hover:bg-[#F3F4F6]" onClick={() => toggleActive(t)}>
                        {t.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
