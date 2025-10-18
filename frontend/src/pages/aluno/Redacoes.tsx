import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { StudentLayoutContextValue } from '@/layouts/StudentLayout';
import {
  listStudentEssays,
  uploadStudentEssay,
  updateStudentEssay,
  deleteStudentEssay,
} from '@/services/student';
import { fetchThemes } from '@/services/essays.service';

const BIMESTERS = [1, 2, 3, 4] as const;
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

type EssayTheme = {
  id: string;
  name: string;
  type: 'ENEM' | 'PAS';
  resources: Array<{ label: string; url: string }>;
};

type StudentEssay = {
  id: string;
  type: 'ENEM' | 'PAS';
  bimester: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  status: 'PENDING' | 'GRADED';
  themeId: string | null;
  themeName: string | null;
  customTheme: string | null;
  originalUrl: string | null;
  correctedUrl: string | null;
  score: number | null;
};

function currentBimester(): number {
  const month = new Date().getMonth();
  const estimate = Math.floor(month / 2) + 1;
  if (estimate < 1) return 1;
  if (estimate > 4) return 4;
  return estimate;
}

function formatDateTime(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_TIME.format(date);
}

function formatShortDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_SHORT.format(date);
}

function normalizeTheme(raw: any): EssayTheme | null {
  if (!raw) return null;
  const id = raw.id ?? raw._id ?? raw.uuid;
  if (!id) return null;
  const typeRaw = (raw.type ?? raw.tipo ?? 'ENEM').toString().toUpperCase();
  const type: 'ENEM' | 'PAS' = typeRaw === 'PAS' ? 'PAS' : 'ENEM';
  const name = raw.name ?? raw.nome ?? `Tema ${String(id).slice(-4)}`;

  const resourceCandidates = raw.resources
    ?? raw.materials
    ?? raw.attachments
    ?? raw.links
    ?? [];
  const resources: Array<{ label: string; url: string }> = Array.isArray(resourceCandidates)
    ? resourceCandidates
        .map((entry: any, index: number) => {
          const url = entry?.url ?? entry?.href ?? null;
          if (!url || typeof url !== 'string') return null;
          const label = entry?.label ?? entry?.name ?? `Material ${index + 1}`;
          return { label, url };
        })
        .filter((item): item is { label: string; url: string } => item !== null)
    : [];

  return {
    id: String(id),
    name: String(name),
    type,
    resources,
  };
}

function normalizeEssay(raw: any): StudentEssay | null {
  if (!raw) return null;
  const id = raw.id ?? raw._id ?? raw.uuid;
  if (!id) return null;
  const typeRaw = (raw.type ?? raw.tipo ?? 'ENEM').toString().toUpperCase();
  const statusRaw = (raw.status ?? raw.situacao ?? 'PENDING').toString().toUpperCase();
  const score = raw.rawScore ?? raw.score ?? raw.nota ?? raw.finalScore ?? raw.correction?.finalScore ?? null;
  const themeId = raw.themeId ?? raw.temaId ?? null;
  const themeName = raw.customTheme ?? raw.themeName ?? raw.tema ?? raw.theme?.name ?? null;
  const gradedAt =
    raw.gradedAt ??
    raw.correctedAt ??
    raw.corrigidoEm ??
    raw.feedbackAt ??
    raw.correctionReleasedAt ??
    raw.updatedAt ??
    null;

  return {
    id: String(id),
    type: typeRaw === 'PAS' ? 'PAS' : 'ENEM',
    status: statusRaw === 'GRADED' ? 'GRADED' : 'PENDING',
    bimester: typeof raw.bimester === 'number' ? raw.bimester : typeof raw.bimestre === 'number' ? raw.bimestre : null,
    submittedAt: raw.submittedAt ?? raw.enviadoEm ?? raw.createdAt ?? null,
    gradedAt,
    themeId: themeId ? String(themeId) : null,
    themeName: themeName ? String(themeName) : null,
    customTheme: raw.customTheme ?? null,
    originalUrl: raw.originalUrl ?? raw.fileUrl ?? raw.file ?? null,
    correctedUrl: raw.correctedUrl ?? raw.feedbackUrl ?? raw.correctionPdf ?? null,
    score: typeof score === 'number' ? score : score ? Number(score) : null,
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function TypeBadge({ value }: { value: 'ENEM' | 'PAS' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        value === 'ENEM' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
      }`}
    >
      {value === 'ENEM' ? 'ENEM' : 'PAS/UnB'}
    </span>
  );
}

export default function StudentEssaysPage() {
  const { profile } = useOutletContext<StudentLayoutContextValue>();
  const studentId = profile?.id ?? null;

  const [selectedType, setSelectedType] = useState<'ENEM' | 'PAS'>('ENEM');
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesError, setThemesError] = useState<string | null>(null);

  const [essays, setEssays] = useState<StudentEssay[]>([]);
  const [essaysLoading, setEssaysLoading] = useState(false);
  const [essaysError, setEssaysError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEssay, setEditingEssay] = useState<StudentEssay | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState({
    type: 'ENEM' as 'ENEM' | 'PAS',
    themeId: '',
    customTheme: '',
    bimester: String(currentBimester()),
    file: null as File | null,
  });

  useEffect(() => {
    let cancelled = false;
    setThemesLoading(true);
    setThemesError(null);

    const loadThemes = async () => {
      try {
        const response = await fetchThemes({ type: selectedType, active: true });
        if (cancelled) return;
        const payloadSource: unknown[] = Array.isArray(response?.items)
          ? response.items as unknown[]
          : Array.isArray(response?.data)
            ? response.data as unknown[]
            : Array.isArray(response?.themes)
              ? response.themes as unknown[]
              : Array.isArray(response)
                ? response as unknown[]
                : [];
        const normalized = payloadSource
          .map((item: unknown) => normalizeTheme(item))
          .filter((item): item is EssayTheme => item !== null);
        setThemes(normalized);
      } catch (error) {
        console.error('[aluno/redacoes] Falha ao carregar temas', error);
        if (!cancelled) {
          setThemesError('Não foi possível carregar os temas disponíveis.');
          setThemes([]);
        }
      } finally {
        if (!cancelled) setThemesLoading(false);
      }
    };

    void loadThemes();
    return () => {
      cancelled = true;
    };
  }, [selectedType]);

  const reloadEssays = useCallback(async () => {
    if (!studentId) return;
    setEssaysLoading(true);
    setEssaysError(null);
    try {
      const response = await listStudentEssays(studentId);
      const normalized = (Array.isArray(response) ? response : [])
        .map((entry) => normalizeEssay(entry))
        .filter((entry): entry is StudentEssay => entry !== null);
      setEssays(normalized);
    } catch (error) {
      console.error('[aluno/redacoes] Falha ao carregar redações', error);
      setEssaysError('Não foi possível carregar suas redações.');
    } finally {
      setEssaysLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    void reloadEssays();
  }, [studentId, reloadEssays]);

  const pendingEssays = useMemo(() => essays.filter((essay) => essay.status !== 'GRADED'), [essays]);
  const gradedEssays = useMemo(() => essays.filter((essay) => essay.status === 'GRADED'), [essays]);

  const resetForm = () => {
    setFormState({
      type: 'ENEM',
      themeId: '',
      customTheme: '',
      bimester: String(currentBimester()),
      file: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEssay(null);
    resetForm();
  };

  const openModal = (options?: { theme?: EssayTheme; essay?: StudentEssay }) => {
    const theme = options?.theme ?? null;
    const essay = options?.essay ?? null;
    const effectiveType = essay?.type ?? theme?.type ?? selectedType;
    const themeIdFromEssay = essay?.themeId ? String(essay.themeId) : '';
    const isCustom = Boolean(essay?.customTheme && !themeIdFromEssay);
    if (selectedType !== effectiveType) {
      setSelectedType(effectiveType);
    }
    setEditingEssay(essay ?? null);
    setFormState({
      type: effectiveType,
      themeId: isCustom ? '__custom__' : themeIdFromEssay || theme?.id || '',
      customTheme: essay?.customTheme ?? '',
      bimester: essay?.bimester ? String(essay.bimester) : String(currentBimester()),
      file: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentId) return;

    const { type, themeId, customTheme, bimester, file } = formState;
    const bimesterNumber = Number(bimester);

    if (!type) {
      toast.error('Selecione o tipo de prova.');
      return;
    }
    if (!themeId && !customTheme.trim()) {
      toast.error('Selecione um tema ou informe um tema personalizado.');
      return;
    }
    if (!Number.isFinite(bimesterNumber) || bimesterNumber < 1 || bimesterNumber > 4) {
      toast.error('Selecione o bimestre.');
      return;
    }
    if (!editingEssay && !file) {
      toast.error('Anexe o arquivo da redação.');
      return;
    }
    if (file && file.size > 15 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 15MB.');
      return;
    }

    const formData = new FormData();
    formData.set('studentId', studentId);
    formData.set('type', type);
    formData.set('bimester', String(bimesterNumber));
    if (themeId && themeId !== '__custom__') {
      formData.set('themeId', themeId);
    } else if (customTheme.trim()) {
      formData.set('customTheme', customTheme.trim());
    }
    if (file) {
      formData.set('file', file);
    }

    try {
      if (editingEssay) {
        await updateStudentEssay(editingEssay.id, formData);
        toast.success('Redação atualizada com sucesso.');
      } else {
        await uploadStudentEssay(formData);
        toast.success('Redação enviada com sucesso.');
      }
      closeModal();
      await reloadEssays();
    } catch (error: any) {
      console.error('[aluno/redacoes] Falha ao salvar redação', error);
      const message = error?.response?.data?.message ?? 'Erro ao salvar a redação.';
      toast.error(message);
    }
  };

  const handleDelete = async (essay: StudentEssay) => {
    if (essay.status === 'GRADED') {
      toast.error('Redações corrigidas não podem ser excluídas.');
      return;
    }
    const confirmed = window.confirm('Deseja excluir esta redação?');
    if (!confirmed) return;
    try {
      await deleteStudentEssay(essay.id, studentId ? { studentId } : undefined);
      toast.success('Redação excluída.');
      await reloadEssays();
    } catch (error: any) {
      console.error('[aluno/redacoes] Falha ao excluir redação', error);
      const message = error?.response?.data?.message ?? 'Erro ao excluir a redação.';
      toast.error(message);
    }
  };

  const activeThemes = useMemo(
    () => themes.filter((theme) => theme.type === selectedType),
    [themes, selectedType],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-800">Minhas redações</h1>
        <p className="text-sm text-slate-500">
          {profile?.className ? `Envios e correções — ${profile.className}` : 'Acompanhe o status das suas redações'}
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Temas disponíveis</CardTitle>
            <CardSub>Selecione o tipo de prova e escolha um tema para enviar sua redação</CardSub>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(['ENEM', 'PAS'] as const).map((typeOption) => (
              <button
                key={typeOption}
                type="button"
                onClick={() => setSelectedType(typeOption)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedType === typeOption
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {typeOption === 'ENEM' ? 'ENEM' : 'PAS/UnB'}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardBody>
            {themesLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando temas…</div>
            ) : themesError ? (
              <EmptyState message={themesError ?? 'Não foi possível carregar os temas disponíveis.'} />
            ) : activeThemes.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{theme.name}</p>
                        <p className="text-xs text-slate-500">{selectedType === 'ENEM' ? 'Tema ENEM' : 'Tema PAS/UnB'}</p>
                      </div>
                      <TypeBadge value={theme.type} />
                    </div>
                    {theme.resources.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Textos motivadores</p>
                        <div className="flex flex-wrap gap-2">
                          {theme.resources.map((resource, index) => (
                            <a
                              key={`${theme.id}-resource-${index}`}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                            >
                              {resource.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Este tema não possui materiais extras.</p>
                    )}
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button size="sm" onClick={() => openModal({ theme })}>
                        Enviar redação
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhum tema disponível para este tipo no momento." />
            )}
          </CardBody>
        </Card>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => openModal()}>Enviar nova redação</Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <CardTitle>Redações enviadas</CardTitle>
              <CardSub>Revise envios pendentes para acompanhar a correção</CardSub>
            </div>

            {essaysLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando redações…</div>
            ) : essaysError ? (
              <EmptyState message={essaysError ?? 'Não foi possível carregar suas redações.'} />
            ) : pendingEssays.length ? (
              <div className="space-y-4">
                {pendingEssays.map((essay) => (
                  <div key={essay.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{essay.themeName ?? 'Tema não informado'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <TypeBadge value={essay.type} />
                          <span>{essay.bimester ? `${essay.bimester}º bimestre` : 'Bimestre não informado'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Enviada em {formatDateTime(essay.submittedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {essay.originalUrl && (
                        <a
                          href={essay.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                        >
                          Abrir arquivo enviado
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button size="sm" onClick={() => openModal({ essay })}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(essay)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma redação pendente de correção." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <CardTitle>Redações corrigidas</CardTitle>
              <CardSub>Confira notas, comentários e arquivos corrigidos</CardSub>
            </div>

            {essaysLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando redações…</div>
            ) : essaysError ? (
              <EmptyState message={essaysError ?? 'Não foi possível carregar suas redações.'} />
            ) : gradedEssays.length ? (
              <div className="space-y-4">
                {gradedEssays.map((essay) => (
                  <div key={essay.id} className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">{essay.themeName ?? 'Tema não informado'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-emerald-700/80">
                          <TypeBadge value={essay.type} />
                          <span>{essay.bimester ? `${essay.bimester}º bimestre` : 'Bimestre não informado'}</span>
                        </div>
                        <p className="text-xs text-emerald-700/80 mt-1">
                          Corrigida em {formatShortDate(essay.gradedAt ?? essay.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">Nota final</p>
                        <p className="text-2xl font-bold text-emerald-800">
                          {essay.score !== null
                            ? essay.score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {essay.originalUrl && (
                        <a
                          href={essay.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400"
                        >
                          Versão enviada
                        </a>
                      )}
                      {essay.correctedUrl && (
                        <a
                          href={essay.correctedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400"
                        >
                          PDF corrigido
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhuma redação corrigida ainda." />
            )}
          </CardBody>
        </Card>
      </section>

      <Modal open={modalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {editingEssay ? 'Editar redação' : 'Enviar redação'}
              </h2>
              <p className="text-sm text-slate-500">Preencha as informações e anexe o arquivo para enviar ao professor</p>
            </div>
            <button type="button" onClick={closeModal} className="text-slate-400 transition hover:text-slate-600">
              ✕
            </button>
          </div>

          {profile ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex justify-between"><span>Aluno</span><span className="font-semibold text-slate-700">{profile.name ?? '—'}</span></div>
              <div className="flex justify-between"><span>Turma</span><span className="font-semibold text-slate-700">{profile.className ?? 'Turma não informada'}</span></div>
              <div className="flex justify-between"><span>E-mail</span><span className="font-semibold text-slate-700">{profile.email ?? '—'}</span></div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Tipo
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.type}
                onChange={(event) => {
                  const nextType = event.target.value as 'ENEM' | 'PAS';
                  setFormState((prev) => {
                    const isCustomTheme = prev.themeId === '__custom__';
                    const themeExistsOnType = prev.themeId && prev.themeId !== '__custom__'
                      ? themes.some((theme) => theme.id === prev.themeId && theme.type === nextType)
                      : false;
                    return {
                      ...prev,
                      type: nextType,
                      themeId: themeExistsOnType || isCustomTheme ? prev.themeId : '',
                      customTheme: isCustomTheme ? prev.customTheme : '',
                    };
                  });
                }}
              >
                <option value="ENEM">ENEM</option>
                <option value="PAS">PAS/UnB</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Bimestre
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.bimester}
                onChange={(event) => setFormState((prev) => ({ ...prev, bimester: event.target.value }))}
              >
                <option value="">Selecione…</option>
                {BIMESTERS.map((value) => (
                  <option key={value} value={String(value)}>{value}º</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Tema
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={formState.themeId}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({
                    ...prev,
                    themeId: value,
                    customTheme: value === '__custom__' ? prev.customTheme : '',
                  }));
                }}
              >
                <option value="">Selecione…</option>
                {themes
                  .filter((theme) => theme.type === formState.type)
                  .map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                <option value="__custom__">Tema personalizado</option>
              </select>
            </label>
            {formState.themeId === '__custom__' && (
              <label className="text-sm font-semibold text-slate-700">
                Descreva o tema
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={formState.customTheme}
                  onChange={(event) => setFormState((prev) => ({ ...prev, customTheme: event.target.value }))}
                  placeholder="Título da proposta"
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="essay-file">
              Arquivo da redação (PDF ou imagem)
            </label>
            <input
              id="essay-file"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              capture="environment"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0] ?? null;
                setFormState((prev) => ({ ...prev, file: selected }));
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">Tamanho máximo: 15MB. Você pode fotografar a redação pelo celular.</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit">{editingEssay ? 'Salvar alterações' : 'Enviar redação'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
