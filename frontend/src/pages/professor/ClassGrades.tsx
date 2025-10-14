import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ClassGradeSnapshot,
  ClassGradesResponse,
  ClassGradesStudent,
  exportClassGradesPdf,
  getClassGrades,
} from '@/services/classes.service';

const DEFAULT_TERMS: number[] = [1, 2, 3, 4];

const TERM_OPTIONS = [
  { value: 1, label: '1º bimestre' },
  { value: 2, label: '2º bimestre' },
  { value: 3, label: '3º bimestre' },
  { value: 4, label: '4º bimestre' },
];

type FiltersState = {
  year: number;
  sum: boolean;
};

function resolvePhotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  const trimmed = photo.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('blob:')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function formatScoreValue(score?: number | null): string | null {
  if (score === null || score === undefined) return null;
  if (!Number.isFinite(score)) return null;
  return Number(score).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function computeTotal(student: ClassGradesStudent, terms: number[]): number | null {
  const values = terms
    .map((term) => student.grades[String(term)])
    .filter((entry): entry is ClassGradeSnapshot => Boolean(entry) && Number.isFinite(entry.score));
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, entry) => sum + entry.score, 0);
}

export default function ClassGradesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState<FiltersState>(() => ({
    year: currentYear,
    sum: false,
  }));
  const [classInfo, setClassInfo] = useState<ClassGradesResponse['class'] | null>(null);
  const [students, setStudents] = useState<ClassGradesStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const hasSyncedYearRef = useRef(false);
  const [selectedTerms, setSelectedTerms] = useState<number[]>(() => [...DEFAULT_TERMS]);

  const loadGrades = useCallback(async () => {
    if (!id || selectedTerms.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getClassGrades(id, { year: filters.year, terms: selectedTerms });
      setClassInfo(data.class);
      setStudents(data.students);
  const serverTerms = (data.terms.length ? data.terms : DEFAULT_TERMS).slice().sort((a, b) => a - b);
      setSelectedTerms((prev) => {
        const intersection = prev.filter((term) => serverTerms.includes(term));
        const next = intersection.length ? intersection : serverTerms;
        if (prev.length === next.length && prev.every((term, index) => term === next[index])) {
          return prev;
        }
        return [...next];
      });
      if (!hasSyncedYearRef.current) {
        hasSyncedYearRef.current = true;
        setFilters((prev) => {
          if (data.year && data.year !== prev.year) {
            return { ...prev, year: data.year };
          }
          return prev;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar as notas da turma.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, filters.year, selectedTerms]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  const termsToDisplay = useMemo(() => {
    return selectedTerms.length ? selectedTerms : [...DEFAULT_TERMS];
  }, [selectedTerms]);

  const availableYears = useMemo(() => {
    const candidates = new Set<number>();
    for (let offset = 0; offset < 5; offset += 1) {
      candidates.add(currentYear - offset);
    }
    if (typeof classInfo?.year === 'number') {
      candidates.add(classInfo.year);
    }
    candidates.add(filters.year);
    return Array.from(candidates).sort((a, b) => b - a);
  }, [classInfo?.year, filters.year, currentYear]);

  const pageTitle = useMemo(() => {
    if (!classInfo) return 'Notas da turma';
    const rawName = typeof classInfo.name === 'string' ? classInfo.name.trim() : '';
    const fallback = [classInfo.series, classInfo.letter].filter(Boolean).join('');
    let baseLabel: string;
    if (rawName) {
      baseLabel = rawName.toLowerCase().startsWith('turma') ? rawName : `Turma ${rawName}`;
    } else if (fallback) {
      baseLabel = `Turma ${fallback}`;
    } else {
      baseLabel = 'Turma';
    }
    const discipline = typeof classInfo.discipline === 'string' ? classInfo.discipline.trim() : '';
    const subject = typeof classInfo.subject === 'string' ? classInfo.subject.trim() : '';
    const subjectLabel = discipline || subject;
    return subjectLabel ? `${baseLabel} • ${subjectLabel}` : baseLabel;
  }, [classInfo]);

  const fileSlug = useMemo(() => {
    return pageTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'turma';
  }, [pageTitle]);

  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextYear = Number(event.target.value);
    if (!Number.isFinite(nextYear)) return;
    setFilters((prev) => ({ ...prev, year: nextYear }));
  };

  const toggleTerm = (term: number) => {
    setSelectedTerms((prev) => {
      const exists = prev.includes(term);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((value) => value !== term);
      }
      const next = [...prev, term];
      next.sort((a, b) => a - b);
      return next;
    });
  };

  const handleSumToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, sum: event.target.checked }));
  };

  const handleExportPdf = useCallback(async () => {
    if (!id) return;
    if (selectedTerms.length === 0) return;
    setPdfLoading(true);
    try {
      const blob = await exportClassGradesPdf(id, {
        year: filters.year,
        terms: selectedTerms,
        includeTotal: filters.sum,
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${fileSlug || 'turma'}-notas-${filters.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível exportar o PDF.';
      setError(message);
    } finally {
      setPdfLoading(false);
    }
  }, [id, filters.year, filters.sum, selectedTerms, fileSlug]);

  const disableExport = pdfLoading || loading || students.length === 0 || selectedTerms.length === 0;

  const handleBack = useCallback(() => {
    if (!id) {
      navigate('/professor/classes');
      return;
    }
    navigate(`/professor/classes/${id}`);
  }, [id, navigate]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={handleBack}>
          ← Voltar para a turma
        </Button>
        {classInfo?.name && (
          <span className="text-sm text-ys-graphite">Turma: {classInfo.name}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ys-ink">{pageTitle}</h1>
          <p className="text-sm text-ys-graphite">Ano letivo selecionado: {filters.year}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ys-line pb-2">
        <button
          type="button"
          onClick={() => navigate(`/professor/classes/${id}`)}
          className="text-ys-graphite hover:text-ys-ink rounded-t-xl px-4 py-2 text-sm font-semibold"
        >
          Resumo
        </button>
        <button
          type="button"
          onClick={() => navigate(`/professor/classes/${id}`, { state: { initialTab: 'students' } })}
          className="text-ys-graphite hover:text-ys-ink rounded-t-xl px-4 py-2 text-sm font-semibold"
        >
          Alunos
        </button>
        <button
          type="button"
          className="rounded-t-xl border border-ys-line border-b-white bg-white px-4 py-2 text-sm font-semibold text-ys-ink shadow-ys-sm"
        >
          Notas
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ys-ink">Filtros</h2>
            <p className="text-xs text-ys-graphite">A tabela é atualizada automaticamente ao alterar os filtros.</p>
          </div>
          <Button onClick={handleExportPdf} disabled={disableExport}>
            {pdfLoading ? 'Gerando PDF…' : 'Exportar PDF'}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ys-ink">Ano</span>
            <select
              className="rounded-xl border border-ys-line px-3 py-2 focus:border-ys-amber focus:outline-none"
              value={filters.year}
              onChange={handleYearChange}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-ys-line p-3">
            <span className="text-sm font-medium text-ys-ink">Bimestres</span>
            <p className="mb-2 text-xs text-ys-graphite">Selecione um ou mais bimestres.</p>
            <div className="flex flex-wrap gap-3">
              {TERM_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTerms.includes(option.value)}
                    onChange={() => toggleTerm(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-ys-line p-3 text-sm">
            <input type="checkbox" checked={filters.sum} onChange={handleSumToggle} />
            <span className="text-ys-ink">Exibir coluna Total (soma)</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ys-ink">Notas da turma</h2>
          <span className="text-xs text-ys-graphite">Ordenação por número de chamada</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-ys-graphite">Carregando notas…</p>
        ) : students.length === 0 ? (
          <p className="mt-4 text-sm text-ys-graphite">Nenhum aluno encontrado para os filtros selecionados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ys-graphite">
                  <th className="px-3 py-2">Foto</th>
                  <th className="px-3 py-2 text-center">Nº</th>
                  <th className="px-3 py-2">Aluno</th>
                  {termsToDisplay.map((term) => (
                    <th key={`head-${term}`} className="px-3 py-2 text-center">
                      {term}º bim.
                    </th>
                  ))}
                  {filters.sum && (
                    <th className="px-3 py-2 text-center">Total</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const photoUrl = resolvePhotoUrl(student.photoUrl);
                  const totalScore = computeTotal(student, termsToDisplay);
                  const totalText = totalScore !== null ? formatScoreValue(totalScore) : null;
                  return (
                    <tr key={student.id} className="border-b border-ys-line last:border-b-0">
                      <td className="px-3 py-3">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={student.name || 'Foto do aluno'}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ys-bg text-[0.65rem] font-semibold uppercase text-ys-graphite">
                            Sem foto
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-ys-ink">
                        {student.roll ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ys-ink">{student.name || 'Sem nome'}</div>
                        {student.email && <div className="text-xs text-ys-graphite">{student.email}</div>}
                      </td>
                      {termsToDisplay.map((term) => {
                        const grade = student.grades[String(term)];
                        const gradeText = grade ? formatScoreValue(grade.score) : null;
                        return (
                          <td key={`${student.id}-${term}`} className="px-3 py-3 text-center align-middle">
                            <div className="font-medium text-ys-ink">{gradeText ?? '—'}</div>
                            {grade && grade.status !== 'FREQUENTE' && (
                              <span className="mt-1 inline-block rounded-full bg-ys-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ys-graphite">
                                {grade.status}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {filters.sum && (
                        <td className="px-3 py-3 text-center align-middle font-medium text-ys-ink">
                          {totalText ?? '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
