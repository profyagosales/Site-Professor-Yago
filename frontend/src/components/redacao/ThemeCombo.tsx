import { useEffect, useState } from 'react';
import { Themes } from '@/services/api';

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
        const list = await Themes.list(query);
        setOptions(Array.isArray(list) ? list : []);
      } catch { setOptions([]); }
    }, 250);
    setTimer(t);
    return () => clearTimeout(t);
  }, [query]);

  async function handleCreate() {
    if (!allowCreate) return;
    const name = query.trim();
    if (!name) return;
    const created = await Themes.create(name);
    onChange(created);
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
