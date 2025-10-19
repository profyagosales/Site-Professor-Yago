import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/Button';
import { listSchemes, type GradeScheme } from '@/services/gradeScheme';
import DivisaoNotasModal from '@/components/dashboard/DivisaoNotasModal';

type ClassOption = {
  id: string;
  label: string;
};

type DivisaoNotasCardProps = {
  classOptions: ClassOption[];
  className?: string;
};

const CURRENT_YEAR = new Date().getFullYear();

function getContrastColor(color: string | null | undefined): string {
  if (!color || typeof color !== 'string') return '#ffffff';
  const hex = color.trim();
  const match = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex) ? hex.slice(1) : null;
  if (!match) return '#ffffff';
  const expanded = match.length === 3 ? match.split('').map((char) => char + char).join('') : match;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

export default function DivisaoNotasCard({ classOptions, className = '' }: DivisaoNotasCardProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classOptions[0]?.id || '');
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [schemes, setSchemes] = useState<GradeScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const activeScheme = useMemo(() => {
    if (!schemes.length) return null;
    const visible = schemes.find((scheme) => scheme.showToStudents);
    if (visible) return visible;
    return schemes.sort((a, b) => a.bimester - b.bimester)[0] ?? null;
  }, [schemes]);

  const totalPoints = activeScheme?.items?.reduce((sum, item) => sum + (Number.isFinite(item.points) ? Number(item.points) : 0), 0) ?? 0;

  const loadSchemes = useCallback(async () => {
    if (!selectedClassId) {
      setSchemes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await listSchemes({ classId: selectedClassId, year });
      setSchemes(response);
    } catch (err) {
      console.error('[DivisaoNotasCard] Falha ao carregar esquemas', err);
      setSchemes([]);
      setError('Não foi possível carregar a divisão de notas.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, year]);

  useEffect(() => {
    void loadSchemes();
  }, [loadSchemes]);

  const handleModalSaved = () => {
    void loadSchemes();
  };

  return (
    <>
      <DashboardCard
        title="Divisão de notas"
        className={className}
        actions={
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} disabled={!selectedClassId}>
            Editar
          </Button>
        }
        contentClassName="flex-1"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Turma
            </label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {!classOptions.length && <option value="">Selecione</option>}
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ano
            </label>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-slate-500">{error}</p>
          ) : !activeScheme ? (
            <p className="text-sm text-slate-500">
              Nenhuma divisão de notas cadastrada para {year}. Clique em editar para configurar.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  Bimestre ativo:{' '}
                  <span className="font-semibold text-slate-900">{activeScheme.bimester}º</span>
                </span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Visível para alunos: {activeScheme.showToStudents ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeScheme.items.map((item) => (
                  <div
                    key={`${item.label}-${item.order}`}
                    className="rounded-full px-4 py-2 text-sm font-medium shadow-sm"
                    style={{
                      backgroundColor: item.color || '#f97316',
                      color: getContrastColor(item.color),
                    }}
                  >
                    {item.label || 'Item'} • {Number(item.points).toFixed(1)} pts
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Total distribuído</span>
                  <span>{totalPoints.toFixed(1)} / 10</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{
                      width: `${Math.min(100, (totalPoints / 10) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardCard>

      <DivisaoNotasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        classOptions={classOptions}
        defaultClassId={selectedClassId}
        defaultYear={year}
        onSaved={handleModalSaved}
      />
    </>
  );
}
