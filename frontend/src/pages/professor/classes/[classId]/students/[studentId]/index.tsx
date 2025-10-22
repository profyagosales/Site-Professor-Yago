import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { getActivityEntries, getGradeScheme, upsertActivityEntriesBulk } from '@/services/grades.service';
import {
  ClassDetails,
  ClassStudent,
  UpsertStudentGradeInput,
  addStudentNote,
  deleteStudentNote,
  getClassDetails,
  getStudentGrades,
  listStudentNotes,
  sendStudentEmail,
  upsertStudentGrade,
  updateStudentNote,
} from '@/services/classes.service';
import type { StudentGrade, StudentNote } from '@/types/school';
import {
  StudentEssayStatus,
  StudentEssaySummary,
  issueFileToken,
  listStudentEssaysByStatus,
  peekEssayFile,
} from '@/services/essays.service';

type StudentProfileContextValue = {
  classId: string;
  classDetail: Pick<ClassDetails, 'id' | 'name' | 'subject' | 'year'> | null;
  className?: string;
  student: ClassStudent;
};

type TabDefinition = {
  key: 'grades' | 'essays' | 'notes' | 'email';
  label: string;
  to: string;
  end?: boolean;
};

function resolvePhotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  const normalized = photo.trim();
  if (!normalized) return null;
  if (normalized.startsWith('data:')) return normalized;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('blob:')) return normalized;
  return `data:image/jpeg;base64,${normalized}`;
}

type GradeStatus = StudentGrade['status'];
type Term = StudentGrade['term'];

type GradeModalSeed = {
  year: number;
  term: Term;
  score?: number;
  status?: GradeStatus;
};

const TERM_VALUES: Term[] = [1, 2, 3, 4];

const TERM_LABELS: Record<Term, string> = {
  1: '1º bimestre',
  2: '2º bimestre',
  3: '3º bimestre',
  4: '4º bimestre',
};

const STATUS_LABELS: Record<GradeStatus, string> = {
  FREQUENTE: 'Frequente',
  INFREQUENTE: 'Infrequente',
  TRANSFERIDO: 'Transferido',
  ABANDONO: 'Abandono',
};

const STATUS_OPTIONS: Array<{ value: GradeStatus; label: string }> = [
  { value: 'FREQUENTE', label: 'Frequente' },
  { value: 'INFREQUENTE', label: 'Infrequente' },
  { value: 'TRANSFERIDO', label: 'Transferido' },
  { value: 'ABANDONO', label: 'Abandono' },
];

function sortGrades(grades: StudentGrade[]): StudentGrade[] {
  return [...grades].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.term - b.term;
  });
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso || '-';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatEssayScore(essay: StudentEssaySummary): string | null {
  if (typeof essay.scaledScore === 'number') {
    const formatted = essay.scaledScore % 1 === 0 ? essay.scaledScore.toFixed(0) : essay.scaledScore.toFixed(1);
    const denominator =
      typeof essay.bimestreWeight === 'number' && essay.bimestreWeight > 0
        ? essay.bimestreWeight
        : essay.scaledScore <= 10
          ? 10
          : undefined;
    return denominator ? `${formatted} / ${denominator}` : formatted;
  }

  if (typeof essay.bimestralComputedScore === 'number') {
    const formatted =
      essay.bimestralComputedScore % 1 === 0
        ? essay.bimestralComputedScore.toFixed(0)
        : essay.bimestralComputedScore.toFixed(1);
    return `${formatted} / 10`;
  }

  if (typeof essay.rawScore === 'number') {
    if (essay.type === 'ENEM' && essay.rawScore > 10) {
      return `${Math.round(essay.rawScore)} / 1000`;
    }
    const formatted = essay.rawScore % 1 === 0 ? essay.rawScore.toFixed(0) : essay.rawScore.toFixed(1);
    return `${formatted}${essay.rawScore <= 10 ? ' / 10' : ''}`;
  }

  return null;
}

function sortNotes(list: StudentNote[]): StudentNote[] {
  return [...list].sort((a, b) => {
    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return bDate - aDate;
  });
}

function formatScore(score: number): string {
  const rounded = roundToOneDecimal(score);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPointsValue(points: number): string {
  return Number(points ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function getFirstAvailableTerm(
  matrix: Record<number, Partial<Record<Term, StudentGrade>>>,
  year: number
): Term {
  const entries = matrix[year];
  for (const term of TERM_VALUES) {
    if (!entries || !entries[term]) {
      return term;
    }
  }
  return 1;
}

export default function StudentProfilePage() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<ClassStudent | null>(null);
  const [classDetail, setClassDetail] = useState<Pick<ClassDetails, 'id' | 'name' | 'subject' | 'year'> | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchStudent() {
      if (!classId || !studentId) {
        setError('Turma ou aluno inválido.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await getClassDetails(classId);
        if (ignore) return;
        if (!detail) {
          setError('Turma não encontrada.');
          setStudent(null);
          setClassDetail(null);
          return;
        }
        const found = detail.students.find((item) => item.id === studentId);
        if (!found) {
          setError('Aluno não encontrado nesta turma.');
          setStudent(null);
          setClassDetail({ id: detail.id, name: detail.name, subject: detail.subject, year: detail.year });
          return;
        }
        setStudent(found);
        setClassDetail({ id: detail.id, name: detail.name, subject: detail.subject, year: detail.year });
      } catch (err) {
        if (ignore) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados do aluno.';
        setError(message);
        setStudent(null);
        setClassDetail(null);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchStudent();
    return () => {
      ignore = true;
    };
  }, [classId, studentId]);

  const tabs = useMemo<TabDefinition[]>(
    () => [
      { key: 'grades', label: 'Notas', to: '.', end: true },
      { key: 'essays', label: 'Redações', to: 'essays' },
      { key: 'notes', label: 'Anotações', to: 'notes' },
      { key: 'email', label: 'Enviar e-mail', to: 'email' },
    ],
    []
  );

  const handleBack = () => {
    if (!classId) {
      navigate('/professor/classes');
      return;
    }
    navigate(`/professor/classes/${classId}`, { state: { initialTab: 'students' } });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Voltar para a turma
        </Button>
        <section className="rounded-2xl border border-ys-line bg-white p-6 shadow-ys-sm text-sm text-ys-graphite">
          Carregando dados do aluno…
        </section>
      </div>
    );
  }

  if (error || !student || !classId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Voltar para a turma
        </Button>
        <section className="rounded-2xl border border-ys-line bg-white p-6 shadow-ys-sm text-sm text-red-600">
          {error ?? 'Não foi possível carregar os dados do aluno.'}
        </section>
      </div>
    );
  }

  const photoUrl = resolvePhotoUrl(student.photo);
  const contextValue: StudentProfileContextValue = {
    classId,
    classDetail,
    className: classDetail?.name,
    student,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Voltar para a turma
        </Button>
        {classDetail?.name && (
          <span className="text-sm text-ys-graphite">Turma: {classDetail.name}</span>
        )}
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-ys-line bg-white p-6 shadow-ys-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt={student.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ys-bg text-lg font-semibold text-ys-graphite">
              {student.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-ys-ink">{student.name}</h1>
            <p className="text-sm text-ys-graphite">{student.email ?? 'Sem e-mail cadastrado'}</p>
            {student.phone && <p className="text-sm text-ys-graphite">Telefone: {student.phone}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-ys-line px-4 py-2 text-sm text-ys-ink">
          Número de chamada: <strong>{student.rollNumber ?? '—'}</strong>
        </div>
      </section>

      <Tabs items={tabs.map((tab) => ({ key: tab.key, label: tab.label, to: tab.to, end: tab.end }))} />

      <div className="rounded-2xl border border-dashed border-ys-line bg-white/60 p-6 text-sm text-ys-graphite">
        <Outlet context={contextValue} />
      </div>
    </div>
  );
}

export function StudentGradesTab() {
  const { classId, student, classDetail } = useOutletContext<StudentProfileContextValue>();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalSeed, setModalSeed] = useState<GradeModalSeed | null>(null);
  const [saving, setSaving] = useState(false);
  const legacyGradesDisabled = true;
  const [termForActivities, setTermForActivities] = useState<Term>(1);
  const [activityEntries, setActivityEntries] = useState<
    Array<{ activityId: string; activityLabel: string; maxPoints: number; score: number | '' }>
  >([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGrades() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentGrades(classId, student.id);
        if (cancelled) return;
        const sorted = sortGrades(data);
        setGrades(sorted);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar notas.';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGrades();
    return () => {
      cancelled = true;
    };
  }, [classId, student.id, refreshToken]);

  const gradeMatrix = useMemo(() => {
    const matrix: Record<number, Partial<Record<Term, StudentGrade>>> = {};
    grades.forEach((grade) => {
      if (!matrix[grade.year]) {
        matrix[grade.year] = {};
      }
      matrix[grade.year][grade.term] = grade;
    });
    return matrix;
  }, [grades]);

  const years = useMemo(() => {
    const set = new Set<number>();
    grades.forEach((grade) => set.add(grade.year));
    if (classDetail?.year) {
      set.add(classDetail.year);
    }
    if (set.size === 0) {
      set.add(new Date().getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [grades, classDetail?.year]);

  const activeYear = useMemo(() => {
    if (grades.length === 0) {
      return classDetail?.year ?? new Date().getFullYear();
    }
    return Math.max(...grades.map((grade) => grade.year));
  }, [grades, classDetail?.year]);

  const totalsByYear = useMemo(() => {
    const totals: Record<number, number> = {};
    Object.entries(gradeMatrix).forEach(([yearKey, entries]) => {
      const year = Number(yearKey);
      const sum = Object.values(entries)
        .filter((grade): grade is StudentGrade => Boolean(grade))
        .reduce((acc, grade) => acc + grade.score, 0);
      totals[year] = roundToOneDecimal(sum);
    });
    return totals;
  }, [gradeMatrix]);

  const activeYearTotal = totalsByYear[activeYear] ?? 0;
  const missingToTwenty = Math.max(0, roundToOneDecimal(20 - activeYearTotal));
  const goalReached = missingToTwenty <= 0;

  useEffect(() => {
    let cancelled = false;
    async function loadActivities() {
      if (!classId) return;
      setActLoading(true);
      setActError(null);
      try {
        const queryYear = activeYear ?? new Date().getFullYear();
        const [activities, entriesPayload] = await Promise.all([
          getGradeScheme({ classId, term: termForActivities, year: queryYear }),
          getActivityEntries({ classId, term: termForActivities, year: queryYear }).catch((err) => {
            console.warn('[StudentGradesTab] Falha ao carregar lançamentos de atividades', err);
            return null;
          }),
        ]);
        if (cancelled) return;
        const rows = Array.isArray((entriesPayload as any)?.rows) ? (entriesPayload as any).rows : [];
        const targetRow =
          rows.find((row: any) => {
            const rowId = row?.studentId ?? row?.student?._id ?? row?.student?.id;
            return rowId === student.id;
          }) ?? null;
        const mapped =
          activities.length > 0
            ? activities.map((activity) => {
                const foundEntry =
                  targetRow?.entries?.find((entry: any) => entry.activityId === activity.id) ?? null;
                const numericScore =
                  foundEntry && Number.isFinite(Number(foundEntry.score))
                    ? Number.parseFloat(foundEntry.score)
                    : NaN;
                return {
                  activityId: activity.id,
                  activityLabel: activity.label,
                  maxPoints: activity.maxPoints,
                  score: Number.isFinite(numericScore) ? roundToOneDecimal(numericScore) : ('' as const),
                };
              })
            : [];
        setActivityEntries(mapped);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Não foi possível carregar atividades.';
        setActError(msg);
        setActivityEntries([]);
      } finally {
        if (!cancelled) {
          setActLoading(false);
        }
      }
    }
    loadActivities();
    return () => {
      cancelled = true;
    };
  }, [activeYear, classId, student.id, termForActivities]);

  const activityTotal = useMemo(() => {
    const sum = activityEntries.reduce(
      (acc, entry) => acc + (typeof entry.score === 'number' ? entry.score : 0),
      0,
    );
    return Math.min(10, roundToOneDecimal(sum));
  }, [activityEntries]);

  const handleRetry = () => {
    setFeedback(null);
    setRefreshToken((token) => token + 1);
  };

  const openModal = (mode: 'create' | 'edit', seed: GradeModalSeed) => {
    setModalMode(mode);
    setModalSeed(seed);
    setModalOpen(true);
    setFeedback(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalSeed(null);
    setModalMode('create');
  };

  const handleCreateForCell = (year: number, term: Term) => {
    openModal('create', { year, term });
  };

  const handleEditGrade = (grade: StudentGrade) => {
    openModal('edit', {
      year: grade.year,
      term: grade.term,
      score: grade.score,
      status: grade.status,
    });
  };

  const handleGradeSubmit = async (input: UpsertStudentGradeInput) => {
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await upsertStudentGrade(classId, student.id, input);
      setGrades((prev) => {
        const filtered = prev.filter((grade) => !(grade.year === saved.year && grade.term === saved.term));
        return sortGrades([...filtered, saved]);
      });
      setFeedback('Nota salva com sucesso.');
      closeModal();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>
        <Button variant="ghost" onClick={handleRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm text-ys-ink">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ys-ink">Notas bimestrais de {student.name}</h2>
          <p className="text-xs text-ys-graphite">Cada bimestre vale até 10 pontos.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ys-line bg-white/80 px-4 py-2 text-xs font-semibold text-ys-ink">
          <span>Ano letivo</span>
          <span className="rounded-full bg-ys-bg px-2 py-0.5 text-ys-ink">{activeYear}</span>
        </div>
      </div>

      <section className="rounded-3xl border border-ys-line bg-white p-5 shadow-ys-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ys-ink">Notas por atividade</h3>
            <p className="text-xs text-ys-graphite">Lançamentos individuais das atividades do bimestre.</p>
          </div>
          <div className="inline-flex rounded-full border border-ys-line bg-ys-bg/70 p-1 text-xs font-semibold text-ys-ink">
            {TERM_VALUES.map((term) => {
              const active = termForActivities === term;
              return (
                <button
                  key={term}
                  type="button"
                  className={`rounded-full px-3 py-1.5 transition ${
                    active ? 'bg-white text-ys-ink shadow-ys-sm' : 'text-ys-graphite hover:text-ys-ink'
                  }`}
                  onClick={() => setTermForActivities(term)}
                >
                  {TERM_LABELS[term]}
                </button>
              );
            })}
          </div>
        </div>
        {actError && <p className="mt-3 text-sm text-rose-600">{actError}</p>}
        {actLoading ? (
          <p className="mt-4 text-sm text-ys-graphite">Carregando atividades…</p>
        ) : activityEntries.length === 0 ? (
          <p className="mt-4 text-sm text-ys-graphite">Sem atividades configuradas para o bimestre.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {activityEntries.map((entry) => (
              <div
                key={entry.activityId}
                className="rounded-2xl border border-ys-line/80 bg-white/90 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-ys-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ys-ink">{entry.activityLabel}</p>
                    <p className="text-xs text-ys-graphite">
                      Vale até {formatPointsValue(entry.maxPoints)} pontos.
                    </p>
                  </div>
                  <span className="rounded-full bg-ys-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ys-ink">
                    {TERM_LABELS[termForActivities]}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={entry.maxPoints}
                    step={0.1}
                    className="h-10 w-full rounded-xl border border-ys-line px-3 py-2 text-sm text-ys-ink focus:border-ys-amber focus:outline-none focus:ring-1 focus:ring-ys-amber"
                    value={entry.score === '' ? '' : entry.score}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setActivityEntries((prev) =>
                        prev.map((it) => {
                          if (it.activityId !== entry.activityId) return it;
                          if (raw === '') {
                            return { ...it, score: '' };
                          }
                          const parsed = Number.parseFloat(raw.replace(',', '.'));
                          if (!Number.isFinite(parsed)) {
                            return { ...it, score: '' };
                          }
                          const clamped = Math.max(0, Math.min(entry.maxPoints, roundToOneDecimal(parsed)));
                          return { ...it, score: clamped };
                        })
                      );
                    }}
                  />
                  <span className="text-xs font-medium text-ys-graphite">
                    / {formatPointsValue(entry.maxPoints)}
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    disabled={typeof entry.score !== 'number'}
                    onClick={async () => {
                      if (typeof entry.score !== 'number') return;
                      setActError(null);
                      try {
                        await upsertActivityEntriesBulk({
                          classId,
                          term: termForActivities,
                          activityId: entry.activityId,
                          items: [{ studentId: student.id, score: entry.score }],
                        });
                        setFeedback('Nota da atividade atualizada.');
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Falha ao salvar nota.';
                        setActError(msg);
                      }
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-ys-graphite">
          Total do bimestre (cap 10):{' '}
          <span className="font-semibold text-ys-ink">{activityTotal.toFixed(1)}</span>
        </p>
      </section>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-ys-line bg-white px-6 py-8 text-sm text-ys-graphite shadow-ys-sm">
          Carregando notas…
        </div>
      ) : (
        <section className="rounded-3xl border border-ys-line bg-white shadow-ys-sm">
          <header className="flex items-center justify-between gap-3 border-b border-ys-line/70 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ys-graphite">Histórico de notas</h3>
            <span className="text-xs text-ys-graphite">
              {years.length > 1 ? `${years.length} anos disponíveis` : 'Ano atual'}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-ys-ink">
              <thead className="bg-ys-bg/80 text-xs font-semibold uppercase tracking-wide text-ys-graphite">
                <tr>
                  <th className="w-36 px-5 py-3 text-left">Ano</th>
                  {TERM_VALUES.map((term) => (
                    <th key={term} className="px-5 py-3 text-center">
                      {TERM_LABELS[term]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((year) => {
                  const entries = gradeMatrix[year] || {};
                  const rowTint = year === activeYear ? 'bg-ys-bg/40' : '';
                  return (
                    <tr key={year} className={rowTint}>
                      <td className="px-5 py-4 align-middle">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            year === activeYear ? 'bg-ys-ink text-white' : 'bg-ys-bg text-ys-ink'
                          }`}
                        >
                          <span>{year}</span>
                          {year === activeYear ? (
                            <span className="text-[10px] uppercase tracking-wider text-white/80">Atual</span>
                          ) : null}
                        </div>
                      </td>
                      {TERM_VALUES.map((term) => {
                        const grade = entries[term];
                        const hasGrade = Boolean(grade);
                        const tone =
                          hasGrade && grade!
                            ? grade!.score >= 5
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-600'
                            : 'border-dashed border-ys-line bg-white/70 text-ys-graphite';
                        return (
                          <td key={term} className="px-5 py-4 align-top">
                            <div className={`rounded-2xl border px-4 py-3 shadow-sm ${tone}`}>
                              {hasGrade ? (
                                <>
                                  <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-lg font-semibold leading-tight">
                                      {formatScore(grade!.score)}
                                    </span>
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-ys-graphite">
                                      {STATUS_LABELS[grade!.status]}
                                    </span>
                                  </div>
                                  <span className="mt-2 block text-xs font-medium uppercase tracking-wide text-ys-graphite">
                                    {TERM_LABELS[term]}
                                  </span>
                                  {!legacyGradesDisabled ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-3 h-8 rounded-xl px-2 text-xs font-semibold"
                                      onClick={() => handleEditGrade(grade!)}
                                    >
                                      Editar nota
                                    </Button>
                                  ) : null}
                                </>
                              ) : (
                                <div className="flex h-full flex-col justify-between text-xs text-ys-graphite">
                                  <div>
                                    <span className="font-semibold">Sem lançamento</span>
                                    <span className="mt-1 block text-[11px] uppercase tracking-wide">
                                      {TERM_LABELS[term]}
                                    </span>
                                  </div>
                                  {!legacyGradesDisabled ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-3 h-8 w-fit rounded-xl px-3 text-xs font-semibold"
                                      onClick={() => handleCreateForCell(year, term)}
                                    >
                                      Adicionar nota
                                    </Button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && grades.length === 0 && (
        <p className="text-xs text-ys-graphite">Nenhuma nota cadastrada para este aluno até o momento.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-ys-line bg-white px-5 py-5 shadow-ys-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ys-graphite">
            Total anual ({activeYear})
          </h3>
          <p className="mt-2 text-3xl font-semibold text-ys-ink">
            {activeYearTotal.toFixed(1)} <span className="text-base font-medium text-ys-graphite">/ 40</span>
          </p>
        </div>
        <div
          className={`rounded-3xl px-5 py-5 shadow-ys-sm ${
            goalReached
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-ys-line bg-white text-ys-ink'
          }`}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ys-graphite">
            Quanto falta para 20
          </h3>
          <p className="mt-2 text-base leading-relaxed">
            {goalReached
              ? 'Meta de 20 pontos atingida!'
              : `Ainda faltam ${missingToTwenty.toFixed(1)} pontos para alcançar 20.`}
          </p>
        </div>
      </div>

      <GradeModal
        open={modalOpen}
        mode={modalMode}
        initialData={modalSeed}
        loading={saving}
        onClose={closeModal}
        onSubmit={handleGradeSubmit}
      />
    </div>
  );
}

type GradeModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialData: GradeModalSeed | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpsertStudentGradeInput) => Promise<void>;
};

type GradeFormState = {
  year: string;
  term: Term;
  score: string;
  status: GradeStatus;
};

function GradeModal({ open, mode, initialData, loading, onClose, onSubmit }: GradeModalProps) {
  const [form, setForm] = useState<GradeFormState>({
    year: String(new Date().getFullYear()),
    term: 1,
    score: '',
    status: 'FREQUENTE',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      year: String(initialData?.year ?? new Date().getFullYear()),
      term: initialData?.term ?? 1,
      score:
        initialData?.score !== undefined && initialData?.score !== null
          ? String(initialData.score)
          : '',
      status: initialData?.status ?? 'FREQUENTE',
    });
    setError(null);
  }, [open, initialData]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedYear = Number(form.year.trim());
    if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 3000) {
      setError('Informe um ano válido.');
      return;
    }

    const parsedScore = Number(form.score);
    if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) {
      setError('A nota deve estar entre 0 e 10.');
      return;
    }

    try {
      await onSubmit({
        year: parsedYear,
        term: form.term,
        score: parsedScore,
        status: form.status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a nota.';
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-ys-lg">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 text-sm text-ys-ink">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ys-ink">
              {mode === 'create' ? 'Adicionar nota' : 'Editar nota'}
            </h2>
            <button
              type="button"
              className="text-ys-graphite hover:text-ys-ink"
              onClick={onClose}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Ano</span>
              <input
                type="number"
                min={1900}
                max={3000}
                className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
                value={form.year}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, year: event.target.value }))
                }
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Bimestre</span>
              <select
                className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
                value={form.term}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setForm((prev) => ({ ...prev, term: Number(event.target.value) as Term }))
                }
              >
                {TERM_VALUES.map((term) => (
                  <option key={term} value={term}>
                    {TERM_LABELS[term]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Nota</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
                value={form.score}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, score: event.target.value }))
                }
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Situação</span>
              <select
                className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
                value={form.status}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as GradeStatus }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar nota'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentEssaysTab() {
  const { classId, student } = useOutletContext<StudentProfileContextValue>();
  const [pendingEssays, setPendingEssays] = useState<StudentEssaySummary[]>([]);
  const [correctedEssays, setCorrectedEssays] = useState<StudentEssaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StudentEssayStatus>('PENDING');
  const [reloadTick, setReloadTick] = useState(0);
  const [viewerState, setViewerState] = useState<{
    essay: StudentEssaySummary | null;
    url: string | null;
    loading: boolean;
    error: string | null;
  }>({ essay: null, url: null, loading: false, error: null });
  const viewerAbortRef = useRef<AbortController | null>(null);
  const viewerCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [pending, corrected] = await Promise.all([
          listStudentEssaysByStatus({
            studentId: student.id,
            status: 'PENDING',
            classId,
            limit: 100,
          }),
          listStudentEssaysByStatus({
            studentId: student.id,
            status: 'GRADED',
            classId,
            limit: 100,
          }),
        ]);
        if (cancelled) return;
        setPendingEssays(pending);
        setCorrectedEssays(corrected);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar redações.';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [classId, student.id, reloadTick]);

  useEffect(() => () => {
    if (viewerAbortRef.current) {
      viewerAbortRef.current.abort();
      viewerAbortRef.current = null;
    }
  }, []);

  const closeViewer = () => {
    if (viewerAbortRef.current) {
      viewerAbortRef.current.abort();
      viewerAbortRef.current = null;
    }
    setViewerState({ essay: null, url: null, loading: false, error: null });
  };

  const handleReload = () => {
    viewerCacheRef.current = {};
    closeViewer();
    setReloadTick((tick) => tick + 1);
  };

  const handleViewCorrection = async (essay: StudentEssaySummary) => {
    if (!essay.correctedFileAvailable) {
      return;
    }

    const cachedUrl = viewerCacheRef.current[essay.id];
    if (cachedUrl) {
      setViewerState({ essay, url: cachedUrl, loading: false, error: null });
      return;
    }

    if (viewerAbortRef.current) {
      viewerAbortRef.current.abort();
    }

    const controller = new AbortController();
    viewerAbortRef.current = controller;
    setViewerState({ essay, url: null, loading: true, error: null });

    try {
      const token = await issueFileToken(essay.id, { signal: controller.signal });
      const peek = await peekEssayFile(essay.id, { token, signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      viewerCacheRef.current[essay.id] = peek.url;
      setViewerState({ essay, url: peek.url, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Não foi possível abrir a correção.';
      setViewerState({ essay, url: null, loading: false, error: message });
    }
  };

  const activeList = activeStatus === 'PENDING' ? pendingEssays : correctedEssays;

  const essayTabs: Array<{ key: StudentEssayStatus; label: string }> = [
    { key: 'PENDING', label: 'Enviadas para correção' },
    { key: 'GRADED', label: 'Corrigidas' },
  ];

  return (
    <div className="space-y-5 text-sm text-ys-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ys-ink">Redações de {student.name}</h2>
          <p className="text-xs text-ys-graphite">
            Acompanhe envios e correções com acesso direto ao PDF corrigido.
          </p>
        </div>
        <Button variant="ghost" onClick={handleReload} disabled={loading}>
          Recarregar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {essayTabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatus(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? 'bg-ys-ink text-white shadow-ys-sm' : 'bg-white text-ys-ink shadow-ys-sm hover:bg-ys-bg'
              }`}
            >
              {tab.label}
              {tab.key === 'PENDING' && pendingEssays.length > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {pendingEssays.length}
                </span>
              )}
              {tab.key === 'GRADED' && correctedEssays.length > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {correctedEssays.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
          <div className="mt-2">
            <Button variant="ghost" onClick={handleReload}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-ys-line bg-white px-4 py-6 text-sm text-ys-graphite">
          Carregando redações…
        </div>
      ) : activeList.length === 0 ? (
        <p className="text-xs text-ys-graphite">
          Nenhuma redação {activeStatus === 'PENDING' ? 'aguardando correção' : 'corrigida'} até o momento.
        </p>
      ) : (
        <ul className="space-y-3">
          {activeList.map((essay) => {
            const scoreLabel = formatEssayScore(essay);
            const submittedLabel = formatDateTime(essay.submittedAt);
            return (
              <li key={essay.id} className="rounded-2xl border border-ys-line bg-white px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-ys-ink">{essay.theme}</h3>
                    <p className="text-xs text-ys-graphite">
                      {essay.type ?? 'Tipo não informado'} · {submittedLabel}
                      {typeof essay.bimester === 'number' && essay.bimester >= 1 && essay.bimester <= 4 && (
                        <span> · {essay.bimester}º bimestre</span>
                      )}
                    </p>
                    {activeStatus === 'GRADED' && scoreLabel && (
                      <p className="text-sm font-semibold text-ys-ink">Nota final: {scoreLabel}</p>
                    )}
                    {activeStatus === 'GRADED' && !essay.correctedFileAvailable && (
                      <p className="text-xs text-ys-graphite">Correção ainda não disponível para visualização.</p>
                    )}
                  </div>
                  {activeStatus === 'GRADED' && (
                    <Button
                      variant="ghost"
                      onClick={() => handleViewCorrection(essay)}
                      disabled={
                        !essay.correctedFileAvailable ||
                        (viewerState.loading && viewerState.essay?.id === essay.id)
                      }
                    >
                      {viewerState.loading && viewerState.essay?.id === essay.id
                        ? 'Abrindo correção…'
                        : 'Ver correção'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewerState.essay && (
        <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ys-ink">
                Correção: {viewerState.essay.theme}
              </h3>
              <p className="text-xs text-ys-graphite">
                {viewerState.essay.type ?? 'Tipo não informado'} ·
                {' '}
                {formatDateTime(viewerState.essay.updatedAt ?? viewerState.essay.submittedAt)}
              </p>
            </div>
            <Button variant="ghost" onClick={closeViewer}>
              Fechar
            </Button>
          </div>

          {viewerState.loading && (
            <div className="mt-4 rounded-xl border border-dashed border-ys-line bg-ys-bg/30 px-4 py-6 text-center text-sm text-ys-graphite">
              Preparando PDF corrigido…
            </div>
          )}

          {viewerState.error && !viewerState.loading && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {viewerState.error}
            </div>
          )}

          {viewerState.url && !viewerState.loading && !viewerState.error && (
            <div className="mt-4 h-[600px] w-full overflow-hidden rounded-xl border border-ys-line">
              <iframe
                src={viewerState.url}
                title={`Correção da redação ${viewerState.essay.theme}`}
                className="h-full w-full"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function StudentNotesTab() {
  const { classId, student } = useOutletContext<StudentProfileContextValue>();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentNote, setCurrentNote] = useState<StudentNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      setLoading(true);
      setError(null);
      try {
        const data = await listStudentNotes(student.id, classId);
        if (cancelled) return;
        setNotes(sortNotes(data));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar anotações.';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [classId, student.id, reloadToken]);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentNote(null);
    setModalOpen(true);
    setFeedback(null);
    setError(null);
  };

  const openEditModal = (note: StudentNote) => {
    setModalMode('edit');
    setCurrentNote(note);
    setModalOpen(true);
    setFeedback(null);
    setError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setCurrentNote(null);
  };

  const handleReload = () => {
    setFeedback(null);
    setError(null);
    setReloadToken((token) => token + 1);
  };

  const handleSubmit = async (payload: { body: string; visibleToStudent: boolean }) => {
    setSaving(true);
    try {
      let saved: StudentNote;
      if (modalMode === 'create') {
        saved = await addStudentNote(student.id, classId, payload);
        setNotes((prev) => sortNotes([...prev, saved]));
        setFeedback('Anotação criada com sucesso.');
      } else if (currentNote) {
        saved = await updateStudentNote(student.id, classId, currentNote._id, payload);
        setNotes((prev) => sortNotes(prev.map((note) => (note._id === saved._id ? saved : note))));
        setFeedback('Anotação atualizada com sucesso.');
      } else {
        return;
      }
      setError(null);
      setModalOpen(false);
      setCurrentNote(null);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: StudentNote) => {
    if (!window.confirm('Tem certeza que deseja remover esta anotação?')) {
      return;
    }
    setDeletingId(note._id);
    setFeedback(null);
    setError(null);
    try {
      await deleteStudentNote(student.id, classId, note._id);
      setNotes((prev) => prev.filter((item) => item._id !== note._id));
      setFeedback('Anotação removida.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover anotação.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (error && notes.length === 0 && !loading) {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>
        <Button variant="ghost" onClick={handleReload}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm text-ys-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ys-ink">Anotações de {student.name}</h2>
          <p className="text-xs text-ys-graphite">
            Registre recados rápidos e defina se o aluno poderá visualizar cada anotação.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={handleReload} disabled={loading}>
            Recarregar
          </Button>
          <Button onClick={openCreateModal} disabled={loading}>
            Nova anotação
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {feedback}
        </div>
      )}

      {error && notes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-ys-line bg-white px-4 py-6 text-sm text-ys-graphite">
          Carregando anotações…
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-ys-graphite">
          Nenhuma anotação cadastrada ainda. Utilize “Nova anotação” para registrar a primeira mensagem.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const createdLabel = formatDateTime(note.createdAt);
            const updatedLabel = note.updatedAt && note.updatedAt !== note.createdAt ? formatDateTime(note.updatedAt) : null;
            const isDeleting = deletingId === note._id;
            return (
              <li key={note._id} className="rounded-2xl border border-ys-line bg-white px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    {note.visibleToStudent && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Visível para o aluno
                      </span>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ys-ink">{note.body}</p>
                    <p className="text-xs text-ys-graphite">
                      Criada em {createdLabel}
                      {updatedLabel ? ` · Atualizada em ${updatedLabel}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full px-3 py-2 text-xs font-semibold text-ys-ink transition hover:bg-ys-bg"
                      onClick={() => openEditModal(note)}
                      disabled={isDeleting}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      onClick={() => handleDelete(note)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Removendo…' : 'Remover'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NoteModal
        open={modalOpen}
        mode={modalMode}
        initialData={currentNote}
        loading={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

type NoteModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialData: StudentNote | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { body: string; visibleToStudent: boolean }) => Promise<void>;
};

type NoteFormState = {
  body: string;
  visibleToStudent: boolean;
};

function NoteModal({ open, mode, initialData, loading, onClose, onSubmit }: NoteModalProps) {
  const [form, setForm] = useState<NoteFormState>({ body: '', visibleToStudent: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      body: initialData?.body ?? '',
      visibleToStudent: initialData?.visibleToStudent ?? false,
    });
    setError(null);
  }, [open, initialData]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmedBody = form.body.trim();
    if (!trimmedBody) {
      setError('Escreva alguma informação na anotação.');
      return;
    }

    try {
      await onSubmit({ body: trimmedBody, visibleToStudent: form.visibleToStudent });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a anotação.';
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-ys-lg">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 text-sm text-ys-ink">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ys-ink">
              {mode === 'create' ? 'Nova anotação' : 'Editar anotação'}
            </h2>
            <button
              type="button"
              className="text-ys-graphite transition hover:text-ys-ink"
              onClick={onClose}
              disabled={loading}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-ys-ink">Conteúdo</span>
            <textarea
              className="min-h-[160px] rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              value={form.body}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setForm((prev) => ({ ...prev, body: event.target.value }))
              }
              placeholder="Escreva aqui a observação sobre o aluno..."
              disabled={loading}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ys-line text-ys-ink focus:ring-ys-amber"
              checked={form.visibleToStudent}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, visibleToStudent: event.target.checked }))
              }
              disabled={loading}
            />
            Tornar anotação visível para o aluno
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar anotação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StudentEmailTab() {
  const { classId, student } = useOutletContext<StudentProfileContextValue>();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const studentEmail = typeof student.email === 'string' ? student.email.trim() : '';
  const canSend = Boolean(studentEmail);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      setError('Não é possível enviar e-mail: aluno sem endereço cadastrado.');
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      setError('Informe um assunto para o e-mail.');
      return;
    }

    if (!trimmedMessage) {
      setError('Escreva a mensagem que será enviada.');
      return;
    }

    let scheduleIso: string | undefined;
    if (scheduleAt) {
      const parsed = new Date(scheduleAt);
      if (Number.isNaN(parsed.getTime())) {
        setError('Informe uma data e hora válidas para o agendamento.');
        return;
      }
      scheduleIso = parsed.toISOString();
    }

    setSending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await sendStudentEmail(classId, student.id, {
        subject: trimmedSubject,
        text: trimmedMessage,
        scheduleAt: scheduleIso,
      });
      const successMessage =
        typeof response?.message === 'string'
          ? response.message
          : scheduleIso
            ? 'Agendamento ainda não disponível; e-mail enviado agora mesmo.'
            : 'E-mail enviado com sucesso.';
      setFeedback(successMessage);
      setSubject('');
      setMessage('');
      setScheduleAt('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.';
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleSubjectChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSubject(event.target.value);
    if (error) setError(null);
    if (feedback) setFeedback(null);
  };

  const handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    if (error) setError(null);
    if (feedback) setFeedback(null);
  };

  const handleScheduleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setScheduleAt(event.target.value);
    if (error) setError(null);
    if (feedback) setFeedback(null);
  };

  return (
    <div className="space-y-5 text-sm text-ys-ink">
      <section className="space-y-4 rounded-2xl border border-ys-line bg-white p-6 shadow-ys-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ys-ink">Enviar e-mail para {student.name}</h2>
          <p className="text-xs text-ys-graphite">
            O endereço do aluno é preenchido automaticamente. Use este formulário para enviar comunicados rápidos.
          </p>
        </div>

        {!canSend && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Este aluno não possui e-mail cadastrado. Atualize o cadastro para liberar o envio.
          </div>
        )}

        {feedback && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            {feedback}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Para</span>
              <input
                type="email"
                className="rounded-xl border border-ys-line bg-ys-bg px-3 py-2 text-ys-graphite"
                value={canSend ? studentEmail : 'Sem e-mail cadastrado'}
                disabled
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Agendar envio (opcional)</span>
              <input
                type="datetime-local"
                className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
                value={scheduleAt}
                onChange={handleScheduleChange}
                disabled={sending}
              />
              <span className="text-xs text-ys-graphite">
                Ainda sem fila de agendamento: se informado, enviaremos imediatamente.
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ys-ink">Assunto</span>
            <input
              type="text"
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              value={subject}
              onChange={handleSubjectChange}
              disabled={sending || !canSend}
              placeholder="Ex.: Feedback sobre o desempenho"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ys-ink">Mensagem</span>
            <textarea
              className="min-h-[200px] rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              value={message}
              onChange={handleMessageChange}
              disabled={sending || !canSend}
              placeholder="Escreva a mensagem que será enviada ao aluno..."
            />
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={sending || !canSend}>
              {sending ? 'Enviando…' : 'Enviar e-mail'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
