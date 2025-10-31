import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import studentsService from '@/services/students';
// @ts-expect-error serviço legado em JS sem tipagem
import gradesService from '@/services/grades';
import { toast } from 'react-toastify';
import { useAuth } from '@/components/AuthContext';
import { gradeEnem, listThemes } from '@/services/redaction';
import {
  getSubmission,
  issueFileToken,
  peekEssayFile,
} from '@/services/essays.service';

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
  correctedUrl?: string;
  originalUrl?: string;
  originalMimeType?: string;
}

const ANNUL_OPTS = [
  { key: 'fugaTema', label: 'Fuga ao tema' },
  { key: 'textoInsuficiente', label: 'Texto insuficiente' },
  { key: 'textoIlegivel', label: 'Texto ilegível' },
  { key: 'assinatura', label: 'Assinatura ou marca identificadora' },
] as const;

function Workspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [studentName, setStudentName] = useState('');
  const [themeName, setThemeName] = useState('');
  const [annul, setAnnul] = useState<Record<string, boolean>>({});
  const [competencias, setCompetencias] = useState<number[]>([0, 0, 0, 0, 0]);
  const [saving, setSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ contentType?: string; contentLength?: number } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const annulled = Object.values(annul).some(Boolean);
  const enemScore = annulled ? 0 : competencias.reduce((a, b) => a + b, 0);
  const weight = submission?.weightOnBimester || 0;
  const bimesterScore = Number(((enemScore / 1000) * weight).toFixed(2));
  const essayId = submission?._id || submission?.id;
  const fallbackFileUrl = useMemo(() => {
    if (!submission) return null;
    return (
      submission.correctedUrl ||
      submission.originalUrl ||
      submission.fileUrl ||
      null
    );
  }, [submission]);

  useEffect(() => {
    ANNUL_OPTS.forEach((o) => {
      if (!(o.key in annul)) setAnnul((prev) => ({ ...prev, [o.key]: false }));
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!id) return;
      try {
        const data = (await getSubmission(id, { signal: controller.signal })) as Submission;
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
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!essayId) {
      setFileUrl(null);
      setFileMeta(null);
      setFileError(null);
      return;
    }

    const controller = new AbortController();
    const loadFile = async () => {
      setFileLoading(true);
      setFileError(null);
      try {
        const token = await issueFileToken(essayId, { signal: controller.signal });
        const meta = await peekEssayFile(essayId, {
          token,
          signal: controller.signal,
        });
        setFileUrl(meta.url);
        setFileMeta({ contentType: meta.contentType, contentLength: meta.contentLength });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(err);
        setFileUrl(fallbackFileUrl);
        setFileMeta(null);
        setFileError('Não foi possível carregar o PDF com token temporário.');
      } finally {
        setFileLoading(false);
      }
    };

    loadFile();
    return () => controller.abort();
  }, [essayId, fallbackFileUrl]);

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
    <div className="pt-20 space-y-md page-wide md:-ml-1 w-full min-w-0 max-w-none">
      <h1 className="text-2xl font-bold">Correção de Redação</h1>
      <div className="space-y-xs w-full">
        <p><strong>Aluno:</strong> {studentName || submission?.studentId || '-'}</p>
        <p><strong>Modelo:</strong> {submission?.model || '-'}</p>
        <p><strong>Tema:</strong> {themeName || '-'}</p>
        <p><strong>Bimestre:</strong> {submission?.bimester ?? '-'}</p>
        <p><strong>Peso:</strong> {weight}</p>
        <p><strong>Professor:</strong> {user?.name || '-'}</p>
      </div>
      <div className="w-full h-96 border border-gray-200 rounded">
        {fileLoading && (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
            Carregando PDF…
          </div>
        )}
        {!fileLoading && fileUrl && (
          <embed
            src={fileUrl}
            type={fileMeta?.contentType || submission?.originalMimeType || 'application/pdf'}
            className="w-full h-full"
          />
        )}
        {!fileLoading && !fileUrl && (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 text-center px-md">
            {fileError || 'Nenhum arquivo disponível para esta redação.'}
          </div>
        )}
      </div>

      {submission?.model === 'ENEM' && (
        <div className="space-y-md w-full">
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

