import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ClassDetails,
  ClassStudent,
  UpsertStudentGradeInput,
  getClassDetails,
  getStudentGrades,
  upsertStudentGrade,
} from '@/services/classes.service';
import type { StudentGrade } from '@/types/school';
import {
  StudentEssayStatus,
  StudentEssaySummary,
  issueFileToken,
  listStudentEssaysByStatus,
  peekEssayFile,
} from '@/services/essays.service';

type StudentProfileContextValue = {
  classId: string;
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

function formatScore(score: number): string {
  const rounded = roundToOneDecimal(score);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
  const [classDetail, setClassDetail] = useState<Pick<ClassDetails, 'id' | 'name' | 'subject'> | null>(null);

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
          setClassDetail({ id: detail.id, name: detail.name, subject: detail.subject });
          return;
        }
        setStudent(found);
        setClassDetail({ id: detail.id, name: detail.name, subject: detail.subject });
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

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? 'bg-ys-ink text-white' : 'bg-white text-ys-ink shadow-ys-sm'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl border border-dashed border-ys-line bg-white/60 p-6 text-sm text-ys-graphite">
        <Outlet context={contextValue} />
      </div>
    </div>
  );
}

export function StudentGradesTab() {
  const { classId, student } = useOutletContext<StudentProfileContextValue>();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [refreshToken, setRefreshToken] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalSeed, setModalSeed] = useState<GradeModalSeed | null>(null);
  const [saving, setSaving] = useState(false);

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
        setSelectedYear((prev) => {
          if (sorted.some((grade) => grade.year === prev)) return prev;
          if (sorted.length === 0) return new Date().getFullYear();
          const currentYear = new Date().getFullYear();
          if (sorted.some((grade) => grade.year === currentYear)) return currentYear;
          return Math.max(...sorted.map((grade) => grade.year));
        });
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
    set.add(selectedYear);
    if (set.size === 0) {
      set.add(new Date().getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [grades, selectedYear]);

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

  const selectedYearTotal = totalsByYear[selectedYear] ?? 0;
  const missingToTwenty = Math.max(0, roundToOneDecimal(20 - selectedYearTotal));
  const goalReached = missingToTwenty <= 0;

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

  const handleAddGradeClick = () => {
    const year = selectedYear;
    const term = getFirstAvailableTerm(gradeMatrix, year);
    openModal('create', { year, term });
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
      setSelectedYear(saved.year);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ys-ink">Notas bimestrais de {student.name}</h2>
          <p className="text-xs text-ys-graphite">Cada bimestre vale até 10 pontos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ys-graphite">
            Ano
            <select
              className="rounded-lg border border-ys-line px-3 py-1 text-sm text-ys-ink focus:border-ys-amber focus:outline-none"
              value={String(selectedYear)}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedYear(Number(event.target.value))}
              disabled={loading}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={handleAddGradeClick} disabled={loading}>
            Adicionar nota
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-ys-line bg-white px-4 py-6 text-sm text-ys-graphite">
          Carregando notas…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-36 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ys-graphite">
                  Ano
                </th>
                {TERM_VALUES.map((term) => (
                  <th
                    key={term}
                    className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ys-graphite"
                  >
                    {TERM_LABELS[term]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((year) => {
                const entries = gradeMatrix[year] || {};
                const rowHighlight = year === selectedYear ? 'bg-ys-bg/30' : '';
                return (
                  <tr key={year} className={rowHighlight}>
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        className={`rounded-lg px-2 py-1 text-sm font-semibold transition ${
                          year === selectedYear ? 'bg-ys-ink text-white' : 'text-ys-ink hover:bg-ys-bg'
                        }`}
                        onClick={() => setSelectedYear(year)}
                      >
                        {year}
                      </button>
                    </td>
                    {TERM_VALUES.map((term) => {
                      const grade = entries[term];
                      const hasGrade = Boolean(grade);
                      const buttonBase =
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ys-amber/40';
                      const buttonClasses = hasGrade
                        ? grade!.score >= 5
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                          : 'border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300'
                        : 'border border-dashed border-ys-line bg-white text-ys-graphite hover:border-ys-amber hover:text-ys-ink';

                      return (
                        <td key={term} className="px-3 py-3 align-top">
                          {hasGrade ? (
                            <button
                              type="button"
                              className={`${buttonBase} ${buttonClasses}`}
                              onClick={() => handleEditGrade(grade!)}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-lg font-semibold">{formatScore(grade!.score)}</span>
                                <span className="text-xs font-medium uppercase tracking-wide text-ys-graphite">
                                  {STATUS_LABELS[grade!.status]}
                                </span>
                              </div>
                              <span className="mt-2 block text-xs text-ys-graphite">Editar nota</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${buttonBase} ${buttonClasses}`}
                              onClick={() => handleCreateForCell(year, term)}
                            >
                              <span className="font-medium">Adicionar nota</span>
                              <span className="mt-1 block text-xs text-ys-graphite">{TERM_LABELS[term]}</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && grades.length === 0 && (
        <p className="text-xs text-ys-graphite">
          Nenhuma nota cadastrada ainda. Use “Adicionar nota” para registrar o primeiro bimestre.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ys-line bg-white px-4 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ys-graphite">
            Total anual ({selectedYear})
          </h3>
          <p className="mt-2 text-3xl font-semibold text-ys-ink">
            {selectedYearTotal.toFixed(1)} <span className="text-base font-medium text-ys-graphite">/ 40</span>
          </p>
        </div>
        <div
          className={`rounded-2xl px-4 py-4 ${
            goalReached
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-ys-line bg-white text-ys-ink'
          }`}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide">
            Quanto falta para 20
          </h3>
          <p className="mt-2 text-base">
            {goalReached
              ? 'Meta de 20 pontos atingida!'
              : `Faltam ${missingToTwenty.toFixed(1)} pontos para atingir 20.`}
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
  const { student } = useOutletContext<StudentProfileContextValue>();
  return <div>Anotações de {student.name} estarão disponíveis em breve.</div>;
}

export function StudentEmailTab() {
  const { student } = useOutletContext<StudentProfileContextValue>();
  return <div>Envio de e-mail para {student.name} será configurado nas próximas etapas.</div>;
}
