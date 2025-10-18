import { useEffect, useState } from 'react';
import api from '@/services/api';

interface Theme { id?: string; name: string }
interface Props {
  value?: Theme;
  onChange: (v: Theme) => void;
  allowCreate?: boolean;
}

export default function ThemeCombo({ value, onChange, allowCreate }: Props) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Theme[]>([]);
  const [timer, setTimer] = useState<any>(null);

  useEffect(() => {
    if (!query) { setOptions([]); return; }
    if (timer) clearTimeout(timer);
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/essays/themes', { params: { type: undefined, active: true } });
        const payload = (res?.data?.data ?? res?.data ?? res) as any;
        const normalized = Array.isArray(payload)
          ? payload.map((theme) => ({ id: theme.id || theme._id, name: theme.title || theme.name }))
          : [];
        setOptions(normalized);
      } catch {
        setOptions([]);
      }
    }, 250);
    setTimer(t);
    return () => clearTimeout(t);
  }, [query]);

  async function handleCreate() {
    if (!allowCreate) return;
    const name = query.trim();
    if (!name) return;
  const form = new FormData();
  form.append('title', name);
  form.append('type', 'PAS');
  const res = await api.post('/essays/themes', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  const created = (res?.data?.data ?? res?.data ?? res) as any;
  onChange({ id: created?.id, name: created?.title || name });
    setQuery('');
    setOptions([]);
  }

  return (
    <div className="space-y-1">
      <input
        value={value ? value.name : query}
        onChange={(e) => { setQuery(e.target.value); if (value) onChange({ name: e.target.value }); }}
        className="w-full rounded border p-2"
        placeholder="Buscar tema..."
      />
      {query && options.length === 0 && allowCreate && (
        <button type="button" className="text-sm text-blue-600" onClick={handleCreate}>
          + Criar tema '{query}'
        </button>
      )}
      {options.map((o) => (
        <div key={o.id}>
          <button type="button" className="text-left w-full" onClick={() => { onChange(o); setQuery(''); }}>
            {o.name}
          </button>
        </div>
      ))}
    </div>
  );
}
