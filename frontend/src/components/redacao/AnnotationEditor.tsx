import { useEffect, useMemo, useRef, useState } from 'react';
import type { Annotation } from '@/types/redacao';

type Props = {
  value: Annotation[];
  onChange: (next: Annotation[]) => void;
  focusIndex?: number | null;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  onRemove?: (index: number) => void;
  currentPage?: number; // 1-based, para filtrar por página atual
};

export default function AnnotationEditor({
  value,
  onChange,
  focusIndex,
  selectedIndex,
  onSelect,
  onRemove,
  currentPage,
}: Props) {
  const errorsCount = useMemo(
    () =>
      value.filter(
        a => a.color === 'green' && a.label?.toLowerCase().includes('erro')
      ).length,
    [value]
  );
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [onlyCurrentPage, setOnlyCurrentPage] = useState(false);
  const itemsRef = useRef<Array<HTMLLIElement | null>>([]);
  const filtered = useMemo(() => {
    if (!onlyCurrentPage || currentPage == null)
      return value.map((a, i) => ({ a, i }));
    return value
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => (a as any).bbox?.page === currentPage - 1);
  }, [onlyCurrentPage, currentPage, value]);

  useEffect(() => {
    if (focusIndex == null) return;
    const el = inputsRef.current[focusIndex];
    if (el) {
      // small delay to ensure element is mounted
      setTimeout(() => el.focus(), 0);
    }
  }, [focusIndex, value.length]);

  // Foco também ao mudar a seleção
  useEffect(() => {
    if (selectedIndex == null) return;
    const el = inputsRef.current[selectedIndex];
    if (el) setTimeout(() => el.focus(), 0);
    const li = itemsRef.current[selectedIndex];
    if (li) setTimeout(() => li.scrollIntoView({ block: 'nearest' }), 0);
  }, [selectedIndex, value.length]);

  function addError() {
    onChange([...value, { color: 'green', label: 'Erro', comment: '' }]);
  }
  function addNote() {
    onChange([...value, { color: 'blue', label: 'Obs', comment: '' }]);
  }
  function updateComment(idx: number, comment: string) {
    const next = value.slice();
    next[idx] = { ...next[idx], comment };
    onChange(next);
  }
  function toggleColor(idx: number) {
    const next = value.slice();
    const curr = next[idx];
    const toGreen = curr.color !== 'green';
    next[idx] = {
      ...curr,
      color: toGreen ? 'green' : 'blue',
      label: toGreen ? 'Erro' : 'Obs',
    } as any;
    onChange(next);
  }
  function removeAt(idx: number) {
    if (!window.confirm('Remover esta anotação?')) return;
    if (onRemove) {
      onRemove(idx);
      return;
    }
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }
  function clearAll() {
    if (value.length === 0) return;
    if (window.confirm('Remover todas as anotações?')) onChange([]);
  }

  return (
    <div className='rounded-lg border border-[#E5E7EB] p-3'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='text-sm text-[#111827]'>
          Anotações{' '}
          <span className='text-ys-ink-2'>(Erros contam para NE do PAS)</span>
          <span className='ml-2 text-xs text-ys-ink-2'>
            {onlyCurrentPage && currentPage != null
              ? `${filtered.length} nesta página`
              : `${value.length} no total`}
            {selectedIndex != null && value.length > 0
              ? ` • selecionada ${(selectedIndex || 0) + 1}`
              : ''}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {currentPage != null && (
            <label
              className='flex items-center gap-1 text-xs text-ys-ink-2'
              title='Mostrar apenas anotações desta página do PDF'
            >
              <input
                type='checkbox'
                checked={onlyCurrentPage}
                onChange={e => setOnlyCurrentPage(e.target.checked)}
              />
              pág. atual
            </label>
          )}
          <button
            type='button'
            title='Adicionar Erro (verde)'
            className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
            onClick={addError}
          >
            + Erro
          </button>
          <button
            type='button'
            title='Adicionar Observação (azul)'
            className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
            onClick={addNote}
          >
            + Obs
          </button>
          {value.length > 0 && (
            <button
              type='button'
              title='Remover todas as anotações'
              className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
              onClick={clearAll}
            >
              Limpar
            </button>
          )}
          {value.length > 0 && onlyCurrentPage && currentPage != null && (
            <button
              type='button'
              title='Remover apenas as anotações desta página'
              className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
              onClick={() => {
                if (!window.confirm('Remover anotações apenas desta página?'))
                  return;
                const pageIndex = currentPage - 1;
                onChange(
                  value.filter((a: any) => (a?.bbox?.page ?? -1) !== pageIndex)
                );
              }}
            >
              Limpar pág.
            </button>
          )}
          {filtered.length > 0 && onlyCurrentPage && (
            <>
              <button
                type='button'
                title='Marcar todas desta página como Erro (verde)'
                className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
                onClick={() => {
                  const next = value.slice();
                  filtered.forEach(({ i }) => {
                    next[i] = {
                      ...next[i],
                      color: 'green',
                      label: 'Erro',
                    } as any;
                  });
                  onChange(next);
                }}
              >
                Pág. → Erro
              </button>
              <button
                type='button'
                title='Marcar todas desta página como Observação (azul)'
                className='rounded-md border border-[#E5E7EB] px-2 py-1 text-sm'
                onClick={() => {
                  const next = value.slice();
                  filtered.forEach(({ i }) => {
                    next[i] = {
                      ...next[i],
                      color: 'blue',
                      label: 'Obs',
                    } as any;
                  });
                  onChange(next);
                }}
              >
                Pág. → Obs
              </button>
            </>
          )}
        </div>
      </div>
      {value.length === 0 ? (
        <p className='text-sm text-ys-ink-2'>Sem anotações</p>
      ) : (
        <ul className='space-y-2'>
          {filtered.map(({ a, i: idx }) => {
            const selected = selectedIndex === idx;
            const page = (a as any).bbox?.page;
            return (
              <li
                key={idx}
                ref={el => {
                  itemsRef.current[idx] = el;
                }}
                className={`flex items-start gap-2 rounded ${selected ? 'bg-yellow-50' : ''}`}
                onClick={() => onSelect?.(idx)}
              >
                <span
                  className={`mt-2 ml-1 inline-block h-3 w-3 rounded-full ${a.color === 'green' ? 'bg-green-500' : a.color === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`}
                ></span>
                <div className='flex-1 py-1 pr-2'>
                  <div className='flex items-center gap-2'>
                    <div className='text-xs text-ys-ink-2'>
                      {a.label}{' '}
                      {typeof page === 'number' && (
                        <span className='rounded bg-[#F3F4F6] px-1 py-0.5 text-[10px] text-[#374151]'>
                          p{page + 1}
                        </span>
                      )}
                    </div>
                    <button
                      type='button'
                      className='rounded border border-[#E5E7EB] px-1.5 py-0.5 text-[11px]'
                      onClick={e => {
                        e.stopPropagation();
                        toggleColor(idx);
                      }}
                    >
                      {a.color === 'green'
                        ? 'Marcar como Obs'
                        : 'Marcar como Erro'}
                    </button>
                  </div>
                  <input
                    value={a.comment || ''}
                    onChange={e => updateComment(idx, e.target.value)}
                    placeholder='comentário (opcional)'
                    className='mt-1 w-full rounded border border-[#E5E7EB] p-2 text-sm'
                    ref={el => {
                      inputsRef.current[idx] = el;
                    }}
                  />
                </div>
                <button
                  type='button'
                  title='Remover esta anotação'
                  className='mt-2 mr-1 rounded-md border border-[#E5E7EB] px-2 py-1 text-xs'
                  onClick={e => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                >
                  remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className='mt-2 text-xs text-ys-ink-2'>
        Erros (NE):{' '}
        <span className='font-medium text-[#111827]'>{errorsCount}</span>
      </div>
    </div>
  );
}
