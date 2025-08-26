import { useMemo } from 'react';
import type { Annotation } from '@/types/redacao';

type Props = {
  value: Annotation[];
  onChange: (next: Annotation[]) => void;
};

export default function AnnotationEditor({ value, onChange }: Props) {
  const errorsCount = useMemo(() => value.filter(a => a.color === 'green' && a.label?.toLowerCase().includes('erro')).length, [value]);

  function addError() {
    onChange([ ...value, { color: 'green', label: 'Erro', comment: '' } ]);
  }
  function addNote() {
    onChange([ ...value, { color: 'blue', label: 'Obs', comment: '' } ]);
  }
  function updateComment(idx: number, comment: string) {
    const next = value.slice();
    next[idx] = { ...next[idx], comment };
    onChange(next);
  }
  function removeAt(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }
  function clearAll() {
    onChange([]);
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-[#111827]">Anotações <span className="text-ys-ink-2">(Erros contam para NE do PAS)</span></div>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border border-[#E5E7EB] px-2 py-1 text-sm" onClick={addError}>+ Erro</button>
          <button type="button" className="rounded-md border border-[#E5E7EB] px-2 py-1 text-sm" onClick={addNote}>+ Obs</button>
          {value.length > 0 && (
            <button type="button" className="rounded-md border border-[#E5E7EB] px-2 py-1 text-sm" onClick={clearAll}>Limpar</button>
          )}
        </div>
      </div>
      {value.length === 0 ? (
        <p className="text-sm text-ys-ink-2">Sem anotações</p>
      ) : (
        <ul className="space-y-2">
          {value.map((a, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className={`mt-2 inline-block h-3 w-3 rounded-full ${a.color === 'green' ? 'bg-green-500' : a.color === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
              <div className="flex-1">
                <div className="text-xs text-ys-ink-2">{a.label}</div>
                <input
                  value={a.comment || ''}
                  onChange={(e) => updateComment(idx, e.target.value)}
                  placeholder="comentário (opcional)"
                  className="mt-1 w-full rounded border border-[#E5E7EB] p-2 text-sm"
                />
              </div>
              <button type="button" className="mt-2 rounded-md border border-[#E5E7EB] px-2 py-1 text-xs" onClick={() => removeAt(idx)}>remover</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 text-xs text-ys-ink-2">Erros (NE): <span className="font-medium text-[#111827]">{errorsCount}</span></div>
    </div>
  );
}
