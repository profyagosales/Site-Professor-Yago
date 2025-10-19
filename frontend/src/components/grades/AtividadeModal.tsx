import { FormEvent, useEffect, useState } from 'react';
import type { GradeActivity } from '@/services/gradeActivities';

type AtividadeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { bimester: number; label: string; value: number; order?: number }) => Promise<void>;
  mode: 'create' | 'edit';
  initialData?: GradeActivity | null;
  currentTotal?: number;
  limit?: number;
};

export function AtividadeModal({ open, onClose, onSubmit, mode, initialData, currentTotal = 0, limit = 10 }: AtividadeModalProps) {
  const [bimester, setBimester] = useState<number>(initialData?.bimester ?? 1);
  const [label, setLabel] = useState(initialData?.label ?? '');
  const [value, setValue] = useState(initialData?.value ?? 0);
  const [order, setOrder] = useState<number | undefined>(initialData?.order);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBimester(initialData?.bimester ?? 1);
    setLabel(initialData?.label ?? '');
    setValue(initialData?.value ?? 0);
    setOrder(initialData?.order ?? undefined);
    setError(null);
  }, [open, initialData]);

  if (!open) return null;

  const totalAfterChange = currentTotal + value;
  const disableSubmit = value < 0 || totalAfterChange > limit || !label.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (disableSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ bimester, label: label.trim(), value, order });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar atividade', err);
      setError(err?.response?.data?.message ?? 'Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <header className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'Nova atividade avaliativa' : 'Editar atividade'}
          </h2>
          <p className="text-sm text-slate-500">Defina o bimestre, descrição e valor da atividade.</p>
        </header>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Bimestre
              <select
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={bimester}
                onChange={(event) => setBimester(Number(event.target.value))}
                required
              >
                {[1, 2, 3, 4].map((option) => (
                  <option key={option} value={option}>
                    {option}º bimestre
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Ordem (opcional)
              <input
                type="number"
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={order ?? ''}
                onChange={(event) => {
                  const next = event.target.value;
                  setOrder(next === '' ? undefined : Number(next));
                }}
                placeholder="0"
              />
            </label>
          </div>

          <label className="flex flex-col text-sm font-medium text-slate-700">
            Atividade
            <input
              type="text"
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-slate-700">
            Valor (0 – 10)
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              required
            />
            <span className="mt-1 text-xs text-slate-500">Soma do bimestre: {totalAfterChange.toFixed(2)} / {limit.toFixed(2)}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disableSubmit || saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Salvando…' : mode === 'create' ? 'Adicionar' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AtividadeModal;
