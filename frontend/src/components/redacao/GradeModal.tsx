import { useState } from 'react';
import { gradeEssay } from '@/services/essays.service';

type Props = {
  open: boolean;
  onClose: () => void;
  essay: { id: string; fileUrl?: string } | null;
  onGraded?: () => void;
};

export default function GradeModal({ open, onClose, essay, onGraded }: Props) {
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open || !essay) return null;

  async function submit() {
    const n = Number(score);
    if (isNaN(n) || n < 0 || n > 100) {
      setErr('Informe uma nota entre 0 e 100');
      return;
    }
    setErr(null);
    try {
      setLoading(true);
      await gradeEssay(essay.id, { score: n, comments });
      onClose();
      onGraded?.();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erro ao salvar correção');
    } finally {
      setLoading(false);
    }
  }

  const isPdf = essay.fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-ys-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Corrigir redação</h3>
          <button className="text-ys-ink" onClick={onClose}>Fechar</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#111827]">Nota (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Ex.: 85"
            />
            <label className="block text-sm font-medium text-[#111827]">Comentários</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="h-28 w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Feedback opcional"
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button className="rounded-lg border border-[#E5E7EB] px-4 py-2" onClick={onClose}>Cancelar</button>
              <button
                className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-50"
                onClick={submit}
                disabled={loading}
              >{loading ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
          <div className="min-h-[320px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
            {essay.fileUrl ? (
              isPdf ? (
                <embed src={essay.fileUrl} type="application/pdf" className="h-[320px] w-full" />
              ) : (
                <a className="block p-4 text-orange-600 underline" href={essay.fileUrl} target="_blank" rel="noreferrer">Abrir arquivo</a>
              )
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-sm text-ys-ink-2">Sem arquivo</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
