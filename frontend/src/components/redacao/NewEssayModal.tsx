import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { listClasses, listStudents } from '@/services/classes';
import { fetchThemes, createEssay, type EssayTheme } from '@/services/essays.service';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
  defaultClassId?: string;
  onSuccess: () => void;
};

const CUSTOM_THEME_ID = '__custom__';

export default function NewEssayModal({ open, onClose, defaultStudentId, defaultClassId, onSuccess }: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | undefined>(defaultClassId);
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>(defaultStudentId);

  const [type, setType] = useState<'ENEM' | 'PAS'>('PAS');
  const [bimester, setBimester] = useState('');

  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [themeId, setThemeId] = useState<string>(CUSTOM_THEME_ID);
  const [customTheme, setCustomTheme] = useState('');

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresBimester = type === 'PAS';

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const cls = await listClasses();
        if (cancelled) return;
        setClasses(Array.isArray(cls) ? cls : []);
      } catch (err) {
        console.error('[new-essay] Falha ao carregar turmas', err);
        if (!cancelled) toast.error('Não foi possível carregar as turmas.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !classId) {
      setStudents([]);
      if (!defaultStudentId) {
        setStudentId(undefined);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        const res = await listStudents(classId);
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setStudents(list);
      } catch (err) {
        console.error('[new-essay] Falha ao carregar alunos', err);
        if (!cancelled) {
          toast.error('Não foi possível carregar os alunos da turma.');
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, classId, defaultStudentId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingThemes(true);
        const list = await fetchThemes({ type, active: true });
        if (cancelled) return;
        setThemes(list);
      } catch (err) {
        console.error('[new-essay] Falha ao carregar temas', err);
        if (!cancelled) toast.error('Não foi possível carregar os temas.');
        setThemes([]);
      } finally {
        if (!cancelled) setLoadingThemes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, type]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setStudentId(defaultStudentId);
      setClassId(defaultClassId);
      setType('PAS');
      setBimester('');
      setThemeId(CUSTOM_THEME_ID);
      setCustomTheme('');
      setError(null);
    }
  }, [open, defaultClassId, defaultStudentId]);

  const selectedTheme = useMemo(() => themes.find((t) => t.id === themeId), [themes, themeId]);

  const showCustomThemeInput = themeId === CUSTOM_THEME_ID;

  async function handleSubmit() {
    if (!file) {
      setError('Anexe o arquivo da redação.');
      return;
    }
    if (!studentId) {
      setError('Selecione um aluno.');
      return;
    }
    if (!classId) {
      setError('Selecione a turma.');
      return;
    }
    if (requiresBimester && !bimester) {
      setError('Selecione o bimestre.');
      return;
    }
    if (showCustomThemeInput && !customTheme.trim()) {
      setError('Descreva o tema da redação.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const form = new FormData();
      if (file) {
        form.append('file', file);
      }
      form.append('studentId', studentId);
      form.append('classId', classId);
      form.append('type', type);
      if (bimester) {
        form.append('bimester', bimester);
      }
      if (showCustomThemeInput) {
        form.append('customTheme', customTheme.trim());
      } else if (themeId && themeId !== CUSTOM_THEME_ID) {
        form.append('themeId', themeId);
      }
      await createEssay(form);
      toast.success('Redação enviada com sucesso.');
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao enviar redação.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">Nova Redação</h3>
          <Button variant="ghost" onClick={onClose} size="sm" type="button">
            Fechar
          </Button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[#111827]">Arquivo (PDF/Imagem)</label>
            <input
              ref={firstFieldRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Turma</label>
              <select
                value={classId || ''}
                onChange={(event) => {
                  const value = event.target.value || undefined;
                  setClassId(value);
                  setStudentId(undefined);
                }}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Selecione…</option>
                {classes.map((klass) => (
                  <option key={klass._id || klass.id} value={klass._id || klass.id}>
                    {klass.name || `${klass.series || ''}${klass.letter || ''}`.trim()} {klass.discipline ? `• ${klass.discipline}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827]">Aluno</label>
              <select
                value={studentId || ''}
                onChange={(event) => setStudentId(event.target.value || undefined)}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={!classId || loadingStudents}
              >
                <option value="">Selecione…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              {loadingStudents && <p className="mt-1 text-xs text-ys-ink-2">Carregando alunos…</p>}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Tipo</label>
              <select
                value={type}
                onChange={(event) => {
                  const nextType = event.target.value as 'ENEM' | 'PAS';
                  setType(nextType);
                  if (nextType === 'ENEM') {
                    setBimester('');
                  }
                  setThemeId(CUSTOM_THEME_ID);
                  setCustomTheme('');
                }}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="PAS">PAS</option>
                <option value="ENEM">ENEM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827]">Bimestre</label>
              <select
                value={bimester}
                onChange={(event) => setBimester(event.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={!requiresBimester}
              >
                <option value="">{requiresBimester ? 'Selecione…' : 'Opcional'}</option>
                <option value="1">1º</option>
                <option value="2">2º</option>
                <option value="3">3º</option>
                <option value="4">4º</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827]">Tema</label>
            <select
              value={themeId}
              onChange={(event) => setThemeId(event.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loadingThemes}
            >
              <option value={CUSTOM_THEME_ID}>Tema não encontrado (informar manualmente)</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.title}
                </option>
              ))}
            </select>
            {loadingThemes && <p className="mt-1 text-xs text-ys-ink-2">Carregando temas…</p>}
          </div>

          {showCustomThemeInput ? (
            <input
              value={customTheme}
              onChange={(event) => setCustomTheme(event.target.value)}
              placeholder="Descreva o tema solicitado ao aluno"
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          ) : selectedTheme?.description ? (
            <p className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm text-[#374151]">
              {selectedTheme.description}
            </p>
          ) : null}

          {!showCustomThemeInput && selectedTheme?.promptFileUrl && (
            <a
              href={selectedTheme.promptFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Ver proposta anexada
            </a>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
