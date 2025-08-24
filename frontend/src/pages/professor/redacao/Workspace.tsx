import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSubmission, gradeEnem, listThemes } from '@/services/redaction';
import studentsService from '@/services/students';
import gradesService from '@/services/grades';
import { toast } from 'react-toastify';

interface Submission {
  id?: string;
  _id?: string;
  studentId?: string;
  classId?: string;
  model?: 'ENEM' | 'PAS';
  themeId?: string;
  themeText?: string;
  bimester?: number;
  weightOnBimester?: number;
  fileUrl?: string;
  evaluationId?: string;
}

const ANNUL_OPTS = [
  { key: 'fugaTema', label: 'Fuga ao tema' },
  { key: 'textoInsuficiente', label: 'Texto insuficiente' },
  { key: 'textoIlegivel', label: 'Texto ilegível' },
  { key: 'assinatura', label: 'Assinatura ou marca identificadora' },
] as const;

function Workspace() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [studentName, setStudentName] = useState('');
  const [themeName, setThemeName] = useState('');
  const [annul, setAnnul] = useState<Record<string, boolean>>({});
  const [competencias, setCompetencias] = useState<number[]>([0, 0, 0, 0, 0]);
  const [saving, setSaving] = useState(false);

  const annulled = Object.values(annul).some(Boolean);
  const enemScore = annulled ? 0 : competencias.reduce((a, b) => a + b, 0);
  const weight = submission?.weightOnBimester || 0;
  const bimesterScore = Number(((enemScore / 1000) * weight).toFixed(2));

  useEffect(() => {
    ANNUL_OPTS.forEach((o) => {
      if (!(o.key in annul)) setAnnul((prev) => ({ ...prev, [o.key]: false }));
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await getSubmission(id);
        const data: Submission = (res as any).data || (res as any);
        setSubmission(data);
        if (data.classId && data.studentId) {
          try {
            const stRes = await studentsService.list(data.classId);
            const arr: any[] = (stRes as any).data || (stRes as any) || [];
            const stu = arr.find((s) => (s._id || s.id) === data.studentId);
            if (stu?.name) setStudentName(stu.name);
          } catch {
            /* ignore */
          }
        }
        if (data.themeText) setThemeName(data.themeText);
        else if (data.themeId) {
          try {
            const thRes = await listThemes();
            const arr: any[] = (thRes as any).data || (thRes as any) || [];
            const th = arr.find((t) => (t._id || t.id) === data.themeId);
            if (th?.name) setThemeName(th.name);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [id]);

  const handleScoreChange = (idx: number, value: number) => {
    setCompetencias((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const handleSave = async (finalize = false) => {
    if (!id) return;
    setSaving(true);
    try {
      await gradeEnem(id, { enemScore });
      if (finalize && submission?.studentId && submission?.evaluationId) {
        try {
          await gradesService.postGrade({
            studentId: submission.studentId,
            evaluationId: submission.evaluationId,
            score: bimesterScore,
          });
        } catch (err) {
          console.error(err);
        }
      }
      toast.success(finalize ? 'Correção finalizada' : 'Rascunho salvo');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-20 p-md space-y-md">
      <h1 className="text-2xl font-bold">Correção de Redação</h1>
      <div className="space-y-xs">
        <p><strong>Aluno:</strong> {studentName || submission?.studentId || '-'}</p>
        <p><strong>Modelo:</strong> {submission?.model || '-'}</p>
        <p><strong>Tema:</strong> {themeName || '-'}</p>
        <p><strong>Bimestre:</strong> {submission?.bimester ?? '-'}</p>
        <p><strong>Peso:</strong> {weight}</p>
      </div>
      {submission?.fileUrl && (
        <div className="w-full h-96">
          <embed src={submission.fileUrl} type="application/pdf" className="w-full h-full" />
        </div>
      )}

      {submission?.model === 'ENEM' && (
        <div className="space-y-md">
          <div className="space-y-sm">
            <h2 className="font-semibold">Formas elementares de anulação</h2>
            {ANNUL_OPTS.map((opt) => (
              <label key={opt.key} className="block">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={annul[opt.key] || false}
                  onChange={() =>
                    setAnnul({ ...annul, [opt.key]: !annul[opt.key] })
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="space-y-sm">
            <h2 className="font-semibold">Competências</h2>
            {competencias.map((c, idx) => (
              <div key={idx} className="flex items-center gap-sm">
                <span className="w-32">Competência {idx + 1}</span>
                <select
                  value={c}
                  disabled={annulled}
                  onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                  className="border p-sm rounded"
                >
                  {[0, 40, 80, 120, 160, 200].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="font-medium">Nota final: {enemScore}</p>
            <p className="font-medium">Peso no bimestre: {weight}</p>
            <p className="font-medium">Nota convertida: {bimesterScore.toFixed(2)}</p>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="ys-btn-ghost"
              disabled={saving}
              onClick={() => handleSave(false)}
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              className="ys-btn-primary"
              disabled={saving}
              onClick={() => handleSave(true)}
            >
              Finalizar correção
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workspace;

