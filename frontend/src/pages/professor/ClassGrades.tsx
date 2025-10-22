import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActivityEntries, getGradeScheme, upsertActivityEntriesBulk } from '@/services/grades';
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

type TableColumn = {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
};

type TableRow = {
  student: ClassGradesStudent;
  photoUrl: string | null;
  grades: Array<{ term: number; value: string | null; badge: string | null }>;
  totalText: string | null;
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
  const [activityTable, setActivityTable] = useState<{
    activities: Array<{ id: string; label: string; maxPoints: number }>;
    rows: Array<{ studentId: string; name: string; photoUrl: string | null; roll: number | null; scores: Record<string, number>; total: number }>;
  } | null>(null);
  const hasSyncedYearRef = useRef(false);
  const [liveUpdateMessage, setLiveUpdateMessage] = useState<string>('');
  const [selectedTerms, setSelectedTerms] = useState<number[]>(() => [...DEFAULT_TERMS]);
  const [activityTerm, setActivityTerm] = useState<number>(() => DEFAULT_TERMS[0]);
  const [activities, setActivities] = useState<Array<{ id: string; label: string; maxPoints: number }>>([]);
  const [activityModal, setActivityModal] = useState<{ open: boolean; activityId: string | null; maxPoints: number; label: string }>(() => ({ open: false, activityId: null, maxPoints: 10, label: '' }));
  const [activityRows, setActivityRows] = useState<Array<{ studentId: string; name: string; photo: string | null; roll: number | null; score: number }>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

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

  // Build Mode A table (single term): activities per student + total (cap 10)
  useEffect(() => {
    let cancelled = false;
    async function loadActivityTable() {
      if (!id) return;
      if (selectedTerms.length !== 1) {
        setActivityTable(null);
        return;
      }
      const term = selectedTerms[0];
      try {
        const [scheme, entries] = await Promise.all([
          getGradeScheme({ classId: id, term: term as any, year: filters.year }),
          getActivityEntries({ classId: id, term: term as any, year: filters.year }),
        ]);
        if (cancelled) return;
        const activities = scheme;
        const rows = (entries.rows || []).map((r: any) => {
          const scores: Record<string, number> = {};
          activities.forEach((a) => {
            const found = (r.entries || []).find((e: any) => e.activityId === a.id);
            scores[a.id] = Number(found?.score ?? NaN);
          });
          const total = Math.min(
            10,
            activities.reduce((acc, a) => acc + (Number.isFinite(scores[a.id]) ? Number(scores[a.id]) : 0), 0)
          );
          return {
            studentId: r.student.id,
            name: r.student.name,
            photoUrl: r.student.photo ? (r.student.photo.startsWith('data:') ? r.student.photo : `data:image/jpeg;base64,${r.student.photo}`) : null,
            roll: r.student.roll ?? null,
            scores,
            total,
          };
        });
        setActivityTable({ activities, rows });
      } catch {
        if (!cancelled) setActivityTable(null);
      }
    }
    loadActivityTable();
    return () => {
      cancelled = true;
    };
  }, [id, filters.year, selectedTerms]);

  // Announce table refresh for accessibility
  useEffect(() => {
    const termsLabel = visibleTerms.join(', ');
    const rowsCount = students.length;
    // If in activity mode and we have activities, include count
    if (visibleTerms.length === 1 && activityTable) {
      const colsCount = 3 + activityTable.activities.length + 1; // base + activities + TOTAL
      setLiveUpdateMessage(`Tabela atualizada. ${rowsCount} linhas, ${colsCount} colunas. Ano ${filters.year}. Bimestre ${termsLabel}.`);
    } else {
      const colsCount = 3 + visibleTerms.length + (filters.sum ? 1 : 0);
      setLiveUpdateMessage(`Tabela atualizada. ${rowsCount} linhas, ${colsCount} colunas. Ano ${filters.year}. Bimestres ${termsLabel}.`);
    }
  }, [students.length, visibleTerms, activityTable, filters.year, filters.sum]);

  // Load activities for launcher
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!id) return;
      try {
        const items = await getGradeScheme({ classId: id, term: activityTerm as any, year: filters.year });
        if (!ignore) setActivities(items);
      } catch (e) {
        if (!ignore) setActivities([]);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id, activityTerm, filters.year]);

  const visibleTerms = useMemo(() => {
    return [...selectedTerms].sort((a, b) => a - b);
  }, [selectedTerms]);

  const showTotal = filters.sum;

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
      const query: any = { year: filters.year, terms: selectedTerms, includeTotal: filters.sum };
      if (selectedTerms.length === 1) {
        query.view = 'activities';
      }
      const blob = await exportClassGradesPdf(id, query);
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

  const tableColumns = useMemo<TableColumn[]>(() => {
    const columns: TableColumn[] = [
      { key: 'photo', label: 'Foto', align: 'left' },
      { key: 'roll', label: 'Nº', align: 'center' },
      { key: 'name', label: 'Aluno', align: 'left' },
    ];

    if (visibleTerms.length === 1 && activityTable) {
      activityTable.activities.forEach((a) => columns.push({ key: `act-${a.id}`, label: a.label, align: 'right' }));
      columns.push({ key: 'total', label: 'TOTAL', align: 'right' });
    } else {
      visibleTerms.forEach((term) => {
        columns.push({ key: `term-${term}`, label: `${term}º bim.`, align: 'right' });
      });
      if (showTotal) {
        columns.push({ key: 'total', label: 'Soma Total', align: 'right' });
      }
    }

    return columns;
  }, [visibleTerms, showTotal, activityTable]);

  const tableRows = useMemo<TableRow[]>(() => {
    if (visibleTerms.length === 1 && activityTable) {
      const actIds = activityTable.activities.map((a) => a.id);
      const map = new Map(activityTable.rows.map((r) => [r.studentId, r]));
      return students.map((student) => {
        const row = map.get(student.id);
        const photoUrl = resolvePhotoUrl(student.photoUrl) ?? row?.photoUrl ?? null;
        const grades = actIds.map((aid) => ({ term: visibleTerms[0], value: row && Number.isFinite(row.scores[aid]) ? formatScoreValue(row.scores[aid]) : null, badge: null }));
        const totalText = row ? formatScoreValue(row.total) : null;
        return { student, photoUrl, grades, totalText };
      });
    }
    return students.map((student) => {
      const photoUrl = resolvePhotoUrl(student.photoUrl);
      const grades = visibleTerms.map((term) => {
        const grade = student.grades[String(term)];
        const value = grade ? formatScoreValue(grade.score) : null;
        const badge = grade && grade.status !== 'FREQUENTE' ? grade.status : null;
        return { term, value, badge };
      });
      const totalScore = showTotal ? computeTotal(student, visibleTerms) : null;
      const totalText = totalScore !== null ? formatScoreValue(totalScore) : null;
      return { student, photoUrl, grades, totalText };
    });
  }, [students, visibleTerms, showTotal, activityTable]);

  return (
    <div className="p-4 space-y-6">
      <span className="sr-only" aria-live="polite">{liveUpdateMessage}</span>
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ys-ink">Lançamentos por atividade</h2>
            <p className="text-xs text-ys-graphite">Escolha uma atividade do bimestre e lance notas dos alunos.</p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-ys-line px-3 py-2 text-sm">
            <span>Bimestre:</span>
            <select className="focus:outline-none" value={activityTerm} onChange={(e) => setActivityTerm(Number(e.target.value))}>
              {TERM_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
        {activities.length === 0 ? (
          <p className="mt-3 text-sm text-ys-graphite">Nenhuma atividade configurada. Configure em Divisão de notas.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {activities.map((a) => (
              <Button key={a.id} onClick={async () => {
                if (!id) return;
                setActivityError(null);
                setActivityLoading(true);
                try {
                  const data = await getActivityEntries({ classId: id, term: activityTerm as any, year: filters.year });
                  const rows = (data.rows || []).map((r: any) => ({
                    studentId: r.student.id,
                    name: r.student.name,
                    photo: r.student.photo ?? null,
                    roll: r.student.roll ?? null,
                    score: Number((r.entries || []).find((e: any) => e.activityId === a.id)?.score ?? 0),
                  }));
                  setActivityRows(rows);
                  setActivityModal({ open: true, activityId: a.id, maxPoints: a.maxPoints, label: a.label });
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Falha ao carregar alunos/lançamentos.';
                  setActivityError(msg);
                } finally {
                  setActivityLoading(false);
                }
              }}>
                Lançar: {a.label}
              </Button>
            ))}
          </div>
        )}
        {activityError && <p className="mt-2 text-sm text-rose-600">{activityError}</p>}
      </section>

      {activityModal.open && (
        <div role="dialog" aria-labelledby="activity-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-ys-lg">
            <h3 id="activity-modal-title" className="text-base font-semibold text-ys-ink">
              {activityModal.label} — 0..{activityModal.maxPoints}
            </h3>
            <div className="mt-3 max-h-[60vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-ys-graphite">
                    <th className="px-2 py-1 text-left">Aluno</th>
                    <th className="px-2 py-1 text-center">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map((row, idx) => (
                    <tr key={row.studentId} className="border-t border-ys-line">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {row.photo ? (
                            <img src={row.photo.startsWith('data:') ? row.photo : `data:image/jpeg;base64,${row.photo}`} alt={row.name} className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-ys-bg text-[10px] text-ys-graphite flex items-center justify-center">{row.roll ?? '—'}</div>
                          )}
                          <span className="text-ys-ink">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          autoFocus={idx === 0}
                          type="number"
                          min={0}
                          max={activityModal.maxPoints}
                          step={0.1}
                          className="w-24 rounded-lg border border-ys-line px-2 py-1 text-center focus:border-ys-amber focus:outline-none"
                          value={Number.isFinite(row.score) ? row.score : 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setActivityRows((prev) => prev.map((r) => (r.studentId === row.studentId ? { ...r, score: Math.max(0, Math.min(activityModal.maxPoints, Number.isFinite(v) ? Number(v.toFixed(1)) : 0)) } : r)));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActivityModal({ open: false, activityId: null, maxPoints: 10, label: '' })}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!id || !activityModal.activityId) return;
                  try {
                    await upsertActivityEntriesBulk({ classId: id, term: activityTerm as any, activityId: activityModal.activityId, items: activityRows.map((r) => ({ studentId: r.studentId, score: r.score })) });
                    setActivityModal({ open: false, activityId: null, maxPoints: 10, label: '' });
                    void loadGrades();
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Falha ao salvar notas.';
                    setActivityError(msg);
                  }
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
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

          {selectedTerms.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-ys-line p-3 text-sm">
              <input type="checkbox" checked={filters.sum} onChange={handleSumToggle} />
              <span className="text-ys-ink">Exibir coluna Total (soma)</span>
            </label>
          )}
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
                <tr className="text-xs uppercase tracking-wide text-ys-graphite">
                  {tableColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
                      scope="col"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.student.id} className="border-b border-ys-line last:border-b-0">
                    <td className="px-3 py-3">
                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt={row.student.name || 'Foto do aluno'}
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ys-bg text-[0.65rem] font-semibold uppercase text-ys-graphite">
                          Sem foto
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-ys-ink">
                      {row.student.roll ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-ys-ink">{row.student.name || 'Sem nome'}</div>
                      {row.student.email && (
                        <div className="text-xs text-ys-graphite">{row.student.email}</div>
                      )}
                    </td>
                    {row.grades.map((grade) => (
                      <td key={`${row.student.id}-${grade.term}`} className="px-3 py-3 text-right align-middle">
                        <div className="font-medium text-ys-ink">{grade.value ?? '—'}</div>
                        {grade.badge && (
                          <span className="mt-1 inline-block rounded-full bg-ys-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ys-graphite">
                            {grade.badge}
                          </span>
                        )}
                      </td>
                    ))}
                    {showTotal && (
                      <td className="px-3 py-3 text-right align-middle font-medium text-ys-ink">
                        {row.totalText ?? '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
