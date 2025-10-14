import { ChangeEvent, useEffect, useId, useMemo, useState } from 'react';
import type { TeacherLite } from '@/types/school';
import { searchTeachers } from '@/services/classes.service';

type Props = {
  label?: string;
  value: TeacherLite | null;
  onSelect: (teacher: TeacherLite | null) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
};

export function TeacherSearchInput({
  label = 'Professor responsável',
  value,
  onSelect,
  placeholder = 'Digite o e-mail do professor',
  helperText,
  disabled = false,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<TeacherLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value?.email) {
      setQuery(value.email);
      return;
    }
    if (!value) {
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    let active = true;
    if (!query || query.trim().length < 2) {
      setOptions([]);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const results = await searchTeachers(query.trim(), 8);
        if (!active) return;
        setOptions(results);
        if (!results.length) {
          setError('Nenhum professor encontrado com esse e-mail.');
        }
      } catch (err) {
        if (!active) return;
        console.error('Teacher search failed', err);
        setError('Não foi possível buscar professores agora.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const optionLabels = useMemo(() => {
    return options.map((teacher) => teacher.email).filter((email): email is string => typeof email === 'string');
  }, [options]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    if (!nextValue.trim()) {
      setOptions([]);
      setError(null);
      onSelect(null);
      return;
    }

    const match = options.find((teacher) => teacher.email?.toLowerCase() === nextValue.trim().toLowerCase());
    if (match && match.id !== value?.id) {
      onSelect(match);
    }
  };

  const handleClear = () => {
    setQuery('');
    setOptions([]);
    setError(null);
    onSelect(null);
  };

  const helper = helperText || 'Selecione um professor pelo e-mail. Apenas docentes cadastrados podem ser responsáveis.';

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-ys-ink">{label}</span>
      <div className="relative">
        <input
          type="search"
          list={listId}
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-ys-line px-3 py-2 pr-10 focus:border-ys-amber focus:outline-none disabled:bg-ys-bg disabled:text-ys-graphite"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-2 flex items-center text-ys-graphite hover:text-ys-ink"
            aria-label="Remover professor responsável"
          >
            ✕
          </button>
        )}
        <datalist id={listId}>
          {optionLabels.map((email) => (
            <option key={email} value={email} />
          ))}
        </datalist>
      </div>
      <span className="text-xs text-ys-graphite">
        {loading ? 'Buscando professores…' : error || helper}
      </span>
      {value && (
        <div className="rounded-lg border border-ys-line bg-ys-bg px-3 py-2 text-xs text-ys-ink">
          <div className="font-semibold">{value.name}</div>
          <div>{value.email}</div>
          {value.phone && <div className="text-ys-graphite">{value.phone}</div>}
        </div>
      )}
    </label>
  );
}
