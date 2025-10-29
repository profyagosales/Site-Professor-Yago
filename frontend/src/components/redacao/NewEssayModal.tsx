import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { listClasses, listStudents } from '@/services/classes';
import {
  fetchThemes,
  createEssay,
  updateEssay,
  type EssayTheme,
} from '@/services/essays.service';
import { sanitizeFileName } from '@/shared/files';
import { toApiModel, type UiModel } from '@/shared/enemModel';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultStudentId?: string;
  defaultClassId?: string;
  mode?: 'create' | 'edit';
  essayId?: string | null;
  initialEssay?: any | null;
};

const CUSTOM_THEME_ID = '__custom__';

function debugLogFormData(form: FormData) {
  console.groupCollapsed('[essay-upload] formData');
  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      console.log(`${key} => File(${value.name}, ${value.type || 'unknown'}, ${value.size} bytes)`);
    } else {
      console.log(`${key} =>`, value);
    }
  }
  console.groupEnd();
}

export default function NewEssayModal({
  open,
  onClose,
  onSuccess,
  defaultStudentId,
  defaultClassId,
  mode = 'create',
  essayId,
  initialEssay,
}: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | undefined>(defaultClassId);
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>(defaultStudentId);

  const [type, setType] = useState<UiModel>('PAS');
  const [bimester, setBimester] = useState('');

  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [themeId, setThemeId] = useState<string>(CUSTOM_THEME_ID);
  const [customTheme, setCustomTheme] = useState('');

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleCopyRequestId = useCallback(async () => {
    if (!requestId) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        toast.warn('Copie manualmente o protocolo: ' + requestId);
        return;
      }
      await navigator.clipboard.writeText(requestId);
      toast.info('Protocolo copiado para a área de transferência.');
    } catch (copyErr) {
      console.warn('[essay-modal] Falha ao copiar requestId', copyErr);
    }
  }, [requestId]);

  const isEditMode = mode === 'edit' && Boolean(essayId);
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
        console.error('[essay-modal] Falha ao carregar turmas', err);
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
        console.error('[essay-modal] Falha ao carregar alunos', err);
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
        console.error('[essay-modal] Falha ao carregar temas', err);
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
      setErrorDetails(null);
      setRequestId(null);
    }
  }, [open, defaultClassId, defaultStudentId]);

  useEffect(() => {
    if (!open || !isEditMode || !initialEssay) return;

    const initialClassId =
      initialEssay.classId?._id ||
      initialEssay.classId?.id ||
      initialEssay.classId ||
      initialEssay.class?.id ||
      initialEssay.class ||
      defaultClassId;
    const initialStudentId =
      initialEssay.student?.id ||
      initialEssay.studentId?._id ||
      initialEssay.studentId?.id ||
      initialEssay.studentId ||
      defaultStudentId;

    setClassId(initialClassId || undefined);
    setStudentId(initialStudentId || undefined);

    if (initialEssay.type === 'ENEM' || initialEssay.type === 'PAS') {
      setType(initialEssay.type as UiModel);
    } else {
      setType('PAS');
    }

    const bimesterValue =
      initialEssay.term ?? initialEssay.bimester ?? initialEssay.bimestre ?? initialEssay.bimesterNumber ?? '';
    setBimester(bimesterValue != null && bimesterValue !== '' ? String(bimesterValue) : '');

    if (initialEssay.customTheme && initialEssay.customTheme.trim()) {
      setThemeId(CUSTOM_THEME_ID);
      setCustomTheme(initialEssay.customTheme.trim());
    } else if (initialEssay.themeId?._id || initialEssay.themeId?.id || initialEssay.themeId) {
      const themeValue = initialEssay.themeId._id || initialEssay.themeId.id || initialEssay.themeId;
      setThemeId(themeValue);
      setCustomTheme('');
    } else {
      setThemeId(CUSTOM_THEME_ID);
      setCustomTheme(initialEssay.theme || initialEssay.topic || '');
    }

    setFile(null);
    setError(null);
  }, [open, isEditMode, initialEssay, defaultClassId, defaultStudentId]);

  const selectedTheme = useMemo(() => themes.find((t) => t.id === themeId), [themes, themeId]);
  const showCustomThemeInput = themeId === CUSTOM_THEME_ID;
  const modalTitle = isEditMode ? 'Editar Redação' : 'Nova Redação';
  const primaryButtonLabel = isEditMode ? 'Salvar alterações' : 'Enviar';

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!isEditMode && !file) {
      setError('Anexe o arquivo da redação.');
      setErrorDetails(null);
      setRequestId(null);
      return;
    }
    if (!studentId) {
      setError('Selecione um aluno.');
      setErrorDetails(null);
      setRequestId(null);
      return;
    }
    if (!classId) {
      setError('Selecione a turma.');
      setErrorDetails(null);
      setRequestId(null);
      return;
    }
    if (requiresBimester && !bimester) {
      setError('Selecione o bimestre.');
      setErrorDetails(null);
      setRequestId(null);
      return;
    }
    if (showCustomThemeInput && !customTheme.trim()) {
      setError('Descreva o tema da redação.');
      setErrorDetails(null);
      setRequestId(null);
      return;
    }

    if (file) {
      const maxBytes = 15 * 1024 * 1024;
      if (file.size > maxBytes) {
        const message = 'Arquivo excede 15MB.';
        setError(message);
        setErrorDetails(null);
        setRequestId(null);
        toast.error(message);
        return;
      }
      const allowedMime = /^(application\/pdf|image\/(png|jpe?g))$/i;
      const extension = file.name?.split('.').pop()?.toLowerCase() ?? '';
      if (
        !allowedMime.test(file.type || '') &&
        !['pdf', 'png', 'jpg', 'jpeg'].includes(extension)
      ) {
        const message = 'Formato não suportado. Envie PDF, PNG ou JPG.';
        setError(message);
        setErrorDetails(null);
        setRequestId(null);
        toast.error(message);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setErrorDetails(null);
      setRequestId(null);

      const form = new FormData();
      if (file) {
        const safeName = sanitizeFileName(file.name || 'arquivo.pdf');
        const safeFile = new File([file], safeName, { type: file.type, lastModified: file.lastModified });
        form.append('file', safeFile);
      }

      form.append('studentId', studentId);
      form.append('classId', classId);

      const apiModel = toApiModel(type);
      form.append('model', apiModel);
      form.append('type', type);

      if (bimester) {
        const normalizedBimester = String(bimester).trim();
        form.append('bimester', normalizedBimester);
        form.append('bimestre', normalizedBimester);
      }

      const themeLabel = showCustomThemeInput
        ? customTheme.trim()
        : (selectedTheme?.title ?? selectedTheme?.name ?? selectedTheme?.description ?? themeId ?? '').trim();

      if (!themeLabel) {
        const message = 'Informe o tema da redação.';
        setError(message);
        setErrorDetails(null);
        setRequestId(null);
        setIsSubmitting(false);
        return;
      }

      form.append('tema', themeLabel);

      if (showCustomThemeInput) {
        form.append('customTheme', themeLabel);
      } else if (themeId && themeId !== CUSTOM_THEME_ID) {
        form.append('themeId', themeId);
      }

      debugLogFormData(form);

      if (isEditMode && essayId) {
        await updateEssay(essayId, form);
        toast.success('Redação atualizada com sucesso.');
      } else {
        await createEssay(form);
        toast.success('Redação enviada com sucesso.');
      }

      onSuccess();
      onClose();
      setErrorDetails(null);
      setRequestId(null);
    } catch (err: any) {
      const fallbackMessage = isEditMode ? 'Erro ao atualizar redação.' : 'Erro ao enviar redação.';
      const resolvedMessage =
        (err?.message && typeof err.message === 'string' && err.message.trim()) ||
        err?.response?.data?.message ||
        fallbackMessage;

      const uploadMatch = /^\[upload-failed\s+(\d+)\]\s*(.*?)(?:\s*\(req:([^)]+)\))?\s*$/.exec(resolvedMessage);
      const messageBody = uploadMatch?.[2]?.trim() || resolvedMessage;
      const req = uploadMatch?.[3]?.trim() || null;

      let baseMessage = messageBody;
      let technicalDetails: string | null = null;

      const detailMatch = /Detalhes:\s*(.*)$/i.exec(messageBody);
      if (detailMatch) {
        baseMessage = messageBody.replace(detailMatch[0], '').trim();
        technicalDetails = detailMatch[1]?.trim() || null;
      }

      setError(baseMessage || fallbackMessage);
      setErrorDetails(technicalDetails && technicalDetails !== 'erro desconhecido' ? technicalDetails : null);
      setRequestId(req);

      toast.error(resolvedMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">{modalTitle}</h3>
          <Button variant="ghost" onClick={onClose} size="sm" type="button">
            Fechar
          </Button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-[#111827]">
              Arquivo (PDF/Imagem) {isEditMode ? '— opcional' : ''}
            </label>
            <input
              ref={firstFieldRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {isEditMode && (
              <p className="mt-1 text-xs text-slate-500">
                Selecione um arquivo apenas se desejar substituir o original enviado pelo aluno.
              </p>
            )}
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
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Modelo</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as UiModel)}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="PAS">PAS/UnB</option>
                <option value="ENEM">ENEM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Bimestre
                {type === 'ENEM' && <span className="ml-1 text-xs font-normal text-slate-500">(opcional)</span>}
              </label>
              <select
                value={bimester}
                onChange={(event) => setBimester(event.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Selecione…</option>
                <option value="1">1º</option>
                <option value="2">2º</option>
                <option value="3">3º</option>
                <option value="4">4º</option>
              </select>
              {type === 'ENEM' && (
                <p className="mt-1 text-xs text-slate-500">Defina apenas se precisar organizar os envios por bimestre.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#111827]">Tema</label>
              <select
                value={showCustomThemeInput ? CUSTOM_THEME_ID : themeId}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === CUSTOM_THEME_ID) {
                    setThemeId(CUSTOM_THEME_ID);
                  } else {
                    setThemeId(value);
                    setCustomTheme('');
                  }
                }}
                className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loadingThemes}
              >
                <option value={CUSTOM_THEME_ID}>Tema personalizado…</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.title}
                  </option>
                ))}
              </select>
              {selectedTheme && (
                <p className="mt-1 text-xs text-slate-500">
                  Tipo: {selectedTheme.type === 'PAS' ? 'PAS/UnB' : 'ENEM'} • {selectedTheme.description || 'sem descrição'}
                </p>
              )}
            </div>
            {showCustomThemeInput && (
              <div>
                <label className="block text-sm font-medium text-[#111827]">Descrição do tema</label>
                <textarea
                  value={customTheme}
                  onChange={(event) => setCustomTheme(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <p className="font-medium">{error}</p>
            {requestId && (
              <button
                type="button"
                onClick={handleCopyRequestId}
                className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200"
              >
                Protocolo: <span className="font-mono text-[11px]">{requestId}</span>
                <span aria-hidden="true">(copiar)</span>
              </button>
            )}
            {errorDetails && (
              <details className="text-xs">
                <summary className="cursor-pointer select-none text-red-700 underline">Detalhes técnicos</summary>
                <pre className="mt-1 whitespace-pre-wrap break-words text-red-700">{errorDetails}</pre>
              </details>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!isEditMode && !file)}
            type="button"
          >
            {isSubmitting ? 'Salvando…' : primaryButtonLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
