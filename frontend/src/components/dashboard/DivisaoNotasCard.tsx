import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/Button';
import { listSchemes, type GradeScheme } from '@/services/gradeScheme';
import { GRADE_ITEM_TYPE_MAP, resolveGradeItemType } from '@/constants/gradeScheme';
import DivisaoNotasModal from '@/components/dashboard/DivisaoNotasModal';

type ClassOption = {
  id: string;
  label: string;
};

type DivisaoNotasCardProps = {
  classOptions: ClassOption[];
  className?: string;
  onEdit?: () => void;
  editOpen?: boolean;
  onEditOpenChange?: (open: boolean) => void;
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

export default function DivisaoNotasCard({
  classOptions,
  className = '',
  onEdit,
  editOpen,
  onEditOpenChange,
}: DivisaoNotasCardProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classOptions[0]?.id || '');
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [schemes, setSchemes] = useState<GradeScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const canTriggerEdit = typeof onEdit === 'function';

  useEffect(() => {
    if (typeof editOpen === 'boolean' && editOpen !== modalOpen) {
      setModalOpen(editOpen);
    }
  }, [editOpen, modalOpen]);

  useEffect(() => {
    if (onEdit === undefined) {
      console.info('[DivisaoNotasCard] Ação de edição indisponível; botão permanecerá desabilitado.');
    } else if (onEdit !== null && typeof onEdit !== 'function') {
      console.warn('[DivisaoNotasCard] onEdit deve ser uma função quando fornecido.');
    }
  }, [onEdit]);

  const handleModalToggle = useCallback(
    (open: boolean) => {
      setModalOpen(open);
      onEditOpenChange?.(open);
    },
    [onEditOpenChange]
  );

  const handleEditClick = useCallback(() => {
    if (!canTriggerEdit) {
      console.info('[DivisaoNotasCard] Ignorando clique em editar sem handler registrado.');
      return;
    }

    try {
      onEdit?.();
    } catch (err) {
      console.error('[DivisaoNotasCard] Erro ao executar onEdit', err);
    }

    handleModalToggle(true);
  }, [canTriggerEdit, handleModalToggle, onEdit]);

  const activeScheme = useMemo(() => {
    if (!schemes.length) return null;
    const visible = schemes.find((scheme) => scheme.showToStudents);
    if (visible) return visible;
    return schemes.sort((a, b) => a.bimester - b.bimester)[0] ?? null;
  }, [schemes]);

  const totalPoints = activeScheme?.items?.reduce((sum, item) => sum + (Number.isFinite(item.points) ? Number(item.points) : 0), 0) ?? 0;
  const totalMatches = Math.abs(totalPoints - 10) < 0.001;

  const typeLegend = useMemo(() => {
    if (!activeScheme?.items?.length) return [] as Array<{ type: string; label: string; color: string }>;
    const seen = new Set<string>();
    return activeScheme.items.reduce<Array<{ type: string; label: string; color: string }>>((acc, item) => {
      const resolvedType = resolveGradeItemType(item.type);
      if (seen.has(resolvedType)) {
        return acc;
      }
      seen.add(resolvedType);
      const config = GRADE_ITEM_TYPE_MAP[resolvedType];
      acc.push({ type: resolvedType, label: config.label, color: config.color });
      return acc;
    }, []);
  }, [activeScheme?.items]);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditClick}
            disabled={!selectedClassId || !canTriggerEdit}
            title={
              !canTriggerEdit
                ? 'Indisponível'
                : !selectedClassId
                  ? 'Selecione uma turma'
                  : 'Editar divisão de notas'
            }
            aria-disabled={!selectedClassId || !canTriggerEdit}
          >
            Editar
          </Button>
        }
        contentClassName="flex flex-1 flex-col overflow-hidden"
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

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
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
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Bimestre em exibição</span>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                    {activeScheme.bimester}º
                  </span>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Visível para alunos: {activeScheme.showToStudents ? 'Sim' : 'Não'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeScheme.items.map((item) => {
                  const resolvedType = resolveGradeItemType(item.type);
                  const config = GRADE_ITEM_TYPE_MAP[resolvedType];
                  const badgeColor = item.color || config.color;
                  return (
                    <div
                      key={`${item.label}-${item.order}`}
                      className="rounded-full px-4 py-2 text-sm font-medium shadow-sm"
                      style={{
                        backgroundColor: badgeColor,
                        color: getContrastColor(badgeColor),
                      }}
                    >
                      {item.label || 'Item'} • {Number(item.points).toFixed(1)} pts
                    </div>
                  );
                })}
              </div>
              {typeLegend.length ? (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  {typeLegend.map((entry) => (
                    <span key={`legend-${entry.type}`} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/80 shadow-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Total distribuído</span>
                  <span className={totalMatches ? 'text-slate-500' : 'text-red-600'}>
                    {totalPoints.toFixed(1)} / 10
                  </span>
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
        onClose={() => handleModalToggle(false)}
        classOptions={classOptions}
        defaultClassId={selectedClassId}
        defaultYear={year}
        onSaved={handleModalSaved}
      />
    </>
  );
}
