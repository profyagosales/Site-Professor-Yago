import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [selectedBimester, setSelectedBimester] = useState<number>(1);
  const [schemes, setSchemes] = useState<GradeScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const canTriggerEdit = typeof onEdit === 'function';
  const userSelectedBimesterRef = useRef(false);

  useEffect(() => {
    if (!classOptions.length) {
      if (selectedClassId) {
        setSelectedClassId('');
      }
      userSelectedBimesterRef.current = false;
      setSelectedBimester(1);
      return;
    }

    const hasSelected = selectedClassId && classOptions.some((option) => option.id === selectedClassId);
    if (!hasSelected) {
      const fallback = classOptions[0]?.id || '';
      if (fallback !== selectedClassId) {
        setSelectedClassId(fallback);
      }
      userSelectedBimesterRef.current = false;
      setSelectedBimester(1);
    }
  }, [classOptions, selectedClassId]);

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

  const loadSchemes = useCallback(async () => {
    if (!selectedClassId) {
      setSchemes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await listSchemes({ classId: selectedClassId, year: CURRENT_YEAR });
      setSchemes(response);
    } catch (err) {
      console.error('[DivisaoNotasCard] Falha ao carregar esquemas', err);
      setSchemes([]);
      setError('Não foi possível carregar a divisão de notas.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    void loadSchemes();
  }, [loadSchemes]);

  useEffect(() => {
    if (!schemes.length) {
      userSelectedBimesterRef.current = false;
      setSelectedBimester(1);
      return;
    }

    if (userSelectedBimesterRef.current) {
      const exists = schemes.some((scheme) => scheme.bimester === selectedBimester);
      if (exists) {
        return;
      }
    }

    const sorted = [...schemes].sort((a, b) => a.bimester - b.bimester);
    const withItems = sorted.find((scheme) => scheme.items.length > 0);
    const fallback = withItems?.bimester ?? sorted[0]?.bimester ?? 1;
    userSelectedBimesterRef.current = false;
    if (selectedBimester !== fallback) {
      setSelectedBimester(fallback);
    }
  }, [schemes, selectedBimester]);

  const itemsByBimester = useMemo(() => {
    const map = new Map<number, GradeScheme['items']>();
    [1, 2, 3, 4].forEach((value) => {
      map.set(value, []);
    });
    schemes.forEach((scheme) => {
      map.set(scheme.bimester, Array.isArray(scheme.items) ? scheme.items : []);
    });
    return map;
  }, [schemes]);

  const currentItems = itemsByBimester.get(selectedBimester) ?? [];

  const handleBimesterSelect = useCallback((bimester: number) => {
    const normalized = Math.min(4, Math.max(1, Math.round(bimester)));
    userSelectedBimesterRef.current = true;
    setSelectedBimester(normalized);
  }, []);

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
                  ? 'Nenhuma turma disponível'
                  : 'Editar divisão de notas'
            }
            aria-disabled={!selectedClassId || !canTriggerEdit}
          >
            Editar
          </Button>
        }
        contentClassName="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {[1, 2, 3, 4].map((bimester) => {
              const isActive = selectedBimester === bimester;
              return (
                <button
                  key={`bimester-${bimester}`}
                  type="button"
                  className={`rounded-full px-4 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] ${
                    isActive ? 'bg-white text-[#FF8A00] shadow-sm' : 'text-slate-500'
                  }`}
                  aria-pressed={isActive}
                  onClick={() => handleBimesterSelect(bimester)}
                >
                  {bimester}º
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[6rem]">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded-full bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-slate-500">{error}</p>
          ) : currentItems.length ? (
            <div className="flex flex-wrap gap-2">
              {currentItems.map((item) => {
                const resolvedType = resolveGradeItemType(item.type);
                const config = GRADE_ITEM_TYPE_MAP[resolvedType];
                const badgeColor = (typeof item.color === 'string' && item.color.trim()) ? item.color : config.color;
                const rawName = typeof item.name === 'string' ? item.name.trim() : '';
                const displayName = rawName || config.label;
                const points = Number.isFinite(item.points) ? Number(item.points) : 0;
                return (
                  <div
                    key={`${resolvedType}-${item.order}-${displayName}`}
                    className="inline-flex h-8 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm"
                    style={{
                      backgroundColor: badgeColor,
                      color: getContrastColor(badgeColor),
                    }}
                  >
                    <span>{displayName}</span>
                    <span>•</span>
                    <span>{points.toFixed(1)} pts</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhuma divisão configurada para este bimestre. Clique em Editar.
            </p>
          )}
        </div>
      </DashboardCard>

      <DivisaoNotasModal
        open={modalOpen}
        onClose={() => handleModalToggle(false)}
        classOptions={classOptions}
        defaultClassId={selectedClassId}
        defaultYear={CURRENT_YEAR}
        onSaved={handleModalSaved}
      />
    </>
  );
}
