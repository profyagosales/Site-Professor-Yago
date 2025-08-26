import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEssayById, gradeEssay, saveAnnotations, renderCorrection } from '@/services/essays.service';
import AnnotationEditor from '@/components/redacao/AnnotationEditor';
import type { Annotation } from '@/types/redacao';
import { toast } from 'react-toastify';

export default function GradeWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [essay, setEssay] = useState<any | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [comments, setComments] = useState('');
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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await fetchEssayById(id);
        if (!alive) return;
        setEssay(data);
        if (data?.annotations) setAnnotations(data.annotations);
        if (data?.comments) setComments(data.comments);
        if (data?.bimestreWeight) setWeight(String(data.bimestreWeight));
        if (data?.type === 'ENEM' && data?.enemCompetencies) {
          setC1(String(data.enemCompetencies.c1 || 0));
          setC2(String(data.enemCompetencies.c2 || 0));
          setC3(String(data.enemCompetencies.c3 || 0));
          setC4(String(data.enemCompetencies.c4 || 0));
          setC5(String(data.enemCompetencies.c5 || 0));
        }
        if (data?.type === 'PAS' && data?.pasBreakdown) {
          setNC(String(data.pasBreakdown.NC || 0));
          setNL(String(data.pasBreakdown.NL || 1));
        }
        setAnnul(Boolean(data?.annulmentReason));
      } catch (e:any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar redação');
      } finally { setLoading(false); }
    })();
    return () => { alive = false };
  }, [id]);

  const enemTotal = useMemo(() => [c1,c2,c3,c4,c5].map(Number).reduce((a,b)=>a+(isNaN(b)?0:b),0), [c1,c2,c3,c4,c5]);
  const pasPreview = useMemo(() => {
    const nc = Number(NC); const nl = Math.max(1, Number(NL));
    if ([nc,nl].some(Number.isNaN)) return { raw: 0, scaled: 0 };
    const ne = annotations.filter(a => a.color === 'green' && (a.label||'').toLowerCase().includes('erro')).length;
    const clamp = (n:number,min:number,max:number)=>Math.min(Math.max(n,min),max);
    const raw = Math.round((clamp(nc - (2*ne)/nl, 0, 10)) * 100) / 100;
    const w = Number(weight)||1; const scaled = Math.round((Math.min(w, w * (raw/10))) * 10) / 10;
    return { raw, scaled };
  }, [NC, NL, annotations, weight]);

  async function submit(finalizePdf=false, sendEmail=false) {
    if (!essay) return;
    try {
      setLoading(true);
      await saveAnnotations(essay._id || essay.id, annotations);
      if (essay.type === 'ENEM') {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'ENEM',
          weight: Number(weight)||1,
          annul,
          enemCompetencies: { c1: Number(c1), c2: Number(c2), c3: Number(c3), c4: Number(c4), c5: Number(c5) },
          comments,
        });
      } else {
        await gradeEssay(essay._id || essay.id, {
          essayType: 'PAS',
          weight: Number(weight)||1,
          annul,
          pas: { NC: Number(NC), NL: Number(NL) },
          comments,
        });
      }
      if (finalizePdf) {
        await renderCorrection(essay._id || essay.id, { sendEmail });
      }
      toast.success('Correção salva');
      navigate('/professor/redacao');
    } catch (e:any) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar');
    } finally { setLoading(false); }
  }

  if (loading && !essay) return <div className="p-6">Carregando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!essay) return null;

  const isPdf = (essay.originalUrl || essay.fileUrl || '').toLowerCase().includes('.pdf');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Correção — {essay.type}</h2>
          <p className="text-sm text-ys-ink-2">Aluno: {essay.student?.name || essay.studentId?.name || '-'}</p>
          <p className="text-sm text-ys-ink-2">Tema: {essay.customTheme || essay.theme?.name || '-'}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-[#E5E7EB] px-3 py-1.5" onClick={()=>navigate('/professor/redacao')}>Voltar</button>
          <button className="rounded-lg border border-[#E5E7EB] px-3 py-1.5" disabled={loading} onClick={()=>submit(false,false)}>Salvar</button>
          <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-white" disabled={loading} onClick={()=>submit(true,false)}>Salvar + PDF</button>
          <button className="rounded-lg bg-orange-600 px-3 py-1.5 text-white" disabled={loading} onClick={()=>submit(true,true)}>Salvar + PDF + E-mail</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="min-h-[420px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
          {isPdf ? (
            <embed src={essay.originalUrl || essay.fileUrl} type="application/pdf" className="h-[420px] w-full" />
          ) : (
            <a className="block p-4 text-orange-600 underline" href={essay.originalUrl || essay.fileUrl} target="_blank" rel="noreferrer">Abrir arquivo</a>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Peso</label>
              <input value={weight} onChange={(e)=>setWeight(e.target.value)} type="number" min={0} max={10} className="w-full rounded border p-2" />
            </div>
            <label className="inline-flex items-center gap-2 mt-6 text-sm text-[#111827]"><input type="checkbox" checked={annul} onChange={(e)=>setAnnul(e.target.checked)} /> Anular</label>
          </div>

          {essay.type === 'ENEM' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#111827]">Competências ENEM</label>
              <div className="grid grid-cols-5 gap-2">
                {[{v:c1,s:setC1},{v:c2,s:setC2},{v:c3,s:setC3},{v:c4,s:setC4},{v:c5,s:setC5}].map((o,i)=> (
                  <select key={i} value={o.v} onChange={e=> o.s(e.target.value)} className="rounded border p-2">
                    {[0,40,80,120,160,200].map(n=> <option key={n} value={n}>{n}</option>)}
                  </select>
                ))}
              </div>
              <p className="text-sm text-ys-ink-2">Total ENEM: <span className="font-medium text-[#111827]">{enemTotal}</span> / 1000 {annul && '(anulada)'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NC (0–10)</label>
                  <input type="number" min={0} max={10} value={NC} onChange={e=> setNC(e.target.value)} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827]">NL (≥1)</label>
                  <input type="number" min={1} value={NL} onChange={e=> setNL(e.target.value)} className="w-full rounded border p-2" />
                </div>
              </div>
              <p className="text-sm text-ys-ink-2">Prévia PAS: nota <span className="font-medium text-[#111827]">{pasPreview.raw}</span>/10 • bimestral <span className="font-medium text-[#111827]">{pasPreview.scaled}</span> / {weight}</p>
            </div>
          )}

          <label className="block text-sm font-medium text-[#111827]">Comentários</label>
          <textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="h-28 w-full rounded border p-2" placeholder="Feedback opcional" />

          <AnnotationEditor value={annotations} onChange={setAnnotations} />
        </div>
      </div>
    </div>
  );
}
