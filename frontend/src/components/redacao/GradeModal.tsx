import { useEffect, useMemo, useState } from 'react';
import { gradeEssay, saveAnnotations, renderCorrection } from '@/services/essays.service';
import AnnotationEditor from './AnnotationEditor';
import type { Annotation } from '@/types/redacao';

type Props = {
  open: boolean;
  onClose: () => void;
  essay: { id: string; fileUrl?: string; type?: 'ENEM'|'PAS' } | null;
  onGraded?: () => void;
};

export default function GradeModal({ open, onClose, essay, onGraded }: Props) {
  const [essayType, setEssayType] = useState<'ENEM'|'PAS'>('PAS');
  const [weight, setWeight] = useState('1');
  const [annul, setAnnul] = useState(false);
  // ENEM
  const [c1, setC1] = useState('0');
  const [c2, setC2] = useState('0');
  const [c3, setC3] = useState('0');
  const [c4, setC4] = useState('0');
  const [c5, setC5] = useState('0');
  // PAS
  const [NC, setNC] = useState('0');
  const [NL, setNL] = useState('1');
  const [NE, setNE] = useState('0');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [comments, setComments] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alsoRenderPdf, setAlsoRenderPdf] = useState(true);
  const [alsoSendEmail, setAlsoSendEmail] = useState(false);

  // Prefill essay type when opening
  useEffect(() => {
    if (open && essay?.type) setEssayType(essay.type);
  }, [open, essay?.type]);

  // Keep NE in sync with annotations (count greens labelled Erro)
  useEffect(() => {
    const greens = annotations.filter(a => a.color === 'green' && a.label?.toLowerCase().includes('erro')).length;
    setNE(String(greens));
  }, [annotations]);

  const validENEM = useMemo(() => [0,40,80,120,160,200], []);
  const enemTotal = useMemo(() => {
    const arr = [c1,c2,c3,c4,c5].map(Number);
    return arr.reduce((a,b)=> a + (isNaN(b)?0:b), 0);
  }, [c1,c2,c3,c4,c5]);

  function clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }
  function r2(n: number) { return Math.round(n * 100) / 100; }
  function r1(n: number) { return Math.round(n * 10) / 10; }
  const pasPreview = useMemo(() => {
    const nc = Number(NC); const nl = Math.max(1, Number(NL)); const ne = Math.max(0, Number(NE));
    if ([nc,nl,ne].some(v => Number.isNaN(v))) return { raw: 0, scaled: 0 };
    const raw = r2(clamp(nc - (2 * ne) / nl, 0, 10));
    const w = Number(weight); const scaled = r1(Math.min(w, w * (raw / 10)));
    return { raw, scaled };
  }, [NC, NL, NE, weight]);

  // Early return AFTER all hooks are registered to respect hooks rules
  if (!open || !essay) return null;

  async function submit() {
    const w = Number(weight);
    if (isNaN(w) || w < 0 || w > 10) { setErr('Peso bimestral inválido (0 a 10)'); return; }
    if (essayType === 'ENEM' && !annul) {
      const arr = [c1,c2,c3,c4,c5].map(Number);
      if (arr.some(n => !validENEM.includes(n))) { setErr('Competências do ENEM devem ser 0,40,80,120,160 ou 200'); return; }
      setErr(null);
      try {
        setLoading(true);
        const gradeRes = await gradeEssay(essay.id, {
          essayType,
          weight: w,
          annul,
          enemCompetencies: { c1: Number(c1), c2: Number(c2), c3: Number(c3), c4: Number(c4), c5: Number(c5) },
          comments,
        });
        if (alsoRenderPdf) {
          await renderCorrection(essay.id, { sendEmail: alsoSendEmail });
        }
        onClose();
        onGraded?.();
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao salvar correção');
      } finally { setLoading(false); }
      return;
    }
    if (essayType === 'PAS') {
      const nc = Number(NC); const nl = Number(NL);
      if (isNaN(nc) || nc < 0 || nc > 10 || isNaN(nl) || nl < 1) { setErr('PAS: NC 0..10 e NL >= 1'); return; }
      setErr(null);
      try {
        setLoading(true);
        // Salvar anotações antes de lançar a nota (NE é derivado de anotações verdes)
        await saveAnnotations(essay.id, annotations);
        const gradeRes = await gradeEssay(essay.id, { essayType, weight: w, annul, pas: { NC: nc, NL: nl }, comments });
        if (alsoRenderPdf) {
          await renderCorrection(essay.id, { sendEmail: alsoSendEmail });
        }
        onClose();
        onGraded?.();
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao salvar correção');
      } finally { setLoading(false); }
      return;
    }
    // ENEM anulado
    setErr(null);
    try { setLoading(true);
      await gradeEssay(essay.id, { essayType: 'ENEM', weight: w, annul: true, comments });
      if (alsoRenderPdf) {
        await renderCorrection(essay.id, { sendEmail: alsoSendEmail });
      }
      onClose(); onGraded?.();
    } catch (e:any) { setErr(e?.response?.data?.message || 'Erro ao salvar correção'); } finally { setLoading(false); }
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
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#111827]">Tipo</label>
                <select value={essayType} onChange={e=> setEssayType(e.target.value as any)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="PAS">PAS</option>
                  <option value="ENEM">ENEM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827]">Peso bimestral (0–10)</label>
                <input type="number" min={0} max={10} value={weight} onChange={e=> setWeight(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            {essayType === 'ENEM' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#111827]">Competências ENEM</label>
                <div className="grid grid-cols-5 gap-2">
                  {[{v:c1,s:setC1},{v:c2,s:setC2},{v:c3,s:setC3},{v:c4,s:setC4},{v:c5,s:setC5}].map((o,i)=> (
                    <select key={i} value={o.v} onChange={e=> o.s(e.target.value)} className="rounded border border-[#E5E7EB] p-2">
                      {[0,40,80,120,160,200].map(n=> <option key={n} value={n}>{n}</option>)}
                    </select>
                  ))}
                </div>
                <p className="text-sm text-ys-ink-2">Total ENEM: <span className="font-medium text-[#111827]">{enemTotal}</span> / 1000 {annul && '(anulada)'}</p>
                <label className="inline-flex items-center gap-2 text-sm text-[#111827]"><input type="checkbox" checked={annul} onChange={e=> setAnnul(e.target.checked)} /> Anular</label>
              </div>
            )}
            {essayType === 'PAS' && (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NC (0–10)</label>
                  <input type="number" min={0} max={10} value={NC} onChange={e=> setNC(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NL (≥1)</label>
                  <input type="number" min={1} value={NL} onChange={e=> setNL(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NE (erros)</label>
                    <input type="number" min={0} value={NE} onChange={e=> {
                      const v = Math.max(0, Number(e.target.value));
                      if (Number.isNaN(v)) { setNE('0'); return; }
                      // adjust green annotations to match NE
                      const currentGreens = annotations.filter(a => a.color === 'green' && a.label?.toLowerCase().includes('erro'));
                      const others = annotations.filter(a => !(a.color === 'green' && a.label?.toLowerCase().includes('erro')));
                      if (v > currentGreens.length) {
                        const toAdd = v - currentGreens.length;
                        const added = Array.from({ length: toAdd }).map(() => ({ color: 'green', label: 'Erro', comment: '' } as Annotation));
                        setAnnotations([...others, ...currentGreens, ...added]);
                      } else if (v < currentGreens.length) {
                        const newGreens = currentGreens.slice(0, v);
                        setAnnotations([...others, ...newGreens]);
                      }
                      setNE(String(v));
                    }} className="w-full rounded-lg border border-[#E5E7EB] p-2" />
                </div>
                <div className="md:col-span-2">
                  {!annul ? (
                    <p className="text-sm text-ys-ink-2">
                      Prévia PAS: nota <span className="font-medium text-[#111827]">{pasPreview.raw}</span>/10 •
                      {' '}bimestral <span className="font-medium text-[#111827]">{pasPreview.scaled}</span> / {weight}
                    </p>
                  ) : (
                    <p className="text-sm text-ys-ink-2">Anulada</p>
                  )}
                </div>
                  <div className="md:col-span-2">
                    <AnnotationEditor value={annotations} onChange={setAnnotations} />
                  </div>
              </div>
            )}
            <label className="block text-sm font-medium text-[#111827]">Comentários</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="h-28 w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Feedback opcional"
            />
            <div className="flex items-center gap-4 text-sm text-[#111827]">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={alsoRenderPdf} onChange={e=> setAlsoRenderPdf(e.target.checked)} /> Gerar PDF</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={alsoSendEmail} onChange={e=> setAlsoSendEmail(e.target.checked)} disabled={!alsoRenderPdf} /> Enviar por e-mail</label>
            </div>
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
                <span className="text-muted-foreground/70 select-none" title="Visualização inline">Visualização inline</span>
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
