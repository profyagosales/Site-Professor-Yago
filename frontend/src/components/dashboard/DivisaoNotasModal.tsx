import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  listSchemes,
  upsertScheme,
  setVisibleScheme,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';
import {
  GRADE_ITEM_TYPE_MAP,
  GRADE_ITEM_TYPE_OPTIONS,
  resolveGradeItemType,
  type GradeItemType,
} from '@/constants/gradeScheme';

type ClassOption = {
  id: string;
  label: string;
};

type DivisaoNotasModalProps = {
  open: boolean;
  onClose: () => void;
  classOptions: ClassOption[];
  defaultClassId?: string | null;
  defaultYear?: number;
  onSaved?: () => void;
};

type ItemForm = {
  uid: string;
  label: string;
  points: number;
  rawPoints: string;
  type: GradeItemType;
  color: string;
  order: number;
};

const MAX_TOTAL_POINTS = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1];

type FormState = {
  classId: string;
  year: number;
  bimester: number;
  items: ItemForm[];
  visibleBimester: number | null;
};

const createInitialForm = (
  classId: string,
  year: number
): FormState => ({
  classId,
  year,
  bimester: 1,
  items: [createEmptyItem(0)],
  visibleBimester: null,
});

function parsePointsInput(value: string): number {
  if (typeof value !== 'string') {
    return 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '.' || trimmed === ',') {
    return 0;
  }
  const normalized = trimmed.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return 0;
  }
  const clamped = Math.min(Math.max(parsed, 0), MAX_TOTAL_POINTS);
  return Math.round(clamped * 100) / 100;
}

function toItemForm(item: GradeSchemeItem, index: number): ItemForm {
  const resolvedType = resolveGradeItemType(item.type);
  const typeConfig = GRADE_ITEM_TYPE_MAP[resolvedType];
  return {
    uid: nanoid(),
    label: item.label ?? '',
    points: Number.isFinite(item.points) ? Number(item.points) : 0,
    rawPoints: Number.isFinite(item.points) ? String(item.points) : '',
    type: resolvedType,
    color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : typeConfig.color,
    order: Number.isFinite(item.order) ? Number(item.order) : index,
  };
}

function createEmptyItem(order: number): ItemForm {
  return {
    uid: nanoid(),
    label: '',
    points: 1,
    rawPoints: '1',
    type: 'PROVA',
    color: GRADE_ITEM_TYPE_MAP.PROVA.color,
    order,
  };
}

export default function DivisaoNotasModal({
  open,
  onClose,
  classOptions,
  defaultClassId = null,
  defaultYear = CURRENT_YEAR,
  onSaved = () => {},
}: DivisaoNotasModalProps) {
  const initialClassId = defaultClassId || classOptions[0]?.id || '';
  const [form, setForm] = useState<FormState>(() => createInitialForm(initialClassId, defaultYear));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemesCache, setSchemesCache] = useState<Record<string, GradeScheme[]>>({});
  const initializedRef = useRef(false);

  const { classId, year, bimester, items, visibleBimester } = form;

  useEffect(() => {
    if (open && !initializedRef.current) {
      const fallbackClass = defaultClassId || classOptions[0]?.id || form.classId || '';
      setForm(createInitialForm(fallbackClass, defaultYear));
      initializedRef.current = true;
    }
    if (!open) {
      initializedRef.current = false;
    }
  }, [open, defaultClassId, defaultYear, classOptions, form.classId]);

  useEffect(() => {
    if (!open) return;
    if (!form.classId && classOptions.length) {
      setForm((prev) => ({
        ...prev,
        classId: classOptions[0].id,
      }));
    }
  }, [open, classOptions, form.classId]);

  const cacheKey = useMemo(() => `${classId}:${year}`, [classId, year]);

  const totalPoints = useMemo(
    () => items.reduce((sum, item) => sum + parsePointsInput(item.rawPoints), 0),
    [items]
  );

  const totalIsValid = Math.abs(totalPoints - MAX_TOTAL_POINTS) < 0.001;

  const loadSchemes = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const schemes = await listSchemes({ classId, year });
      setSchemesCache((prev) => ({ ...prev, [cacheKey]: schemes }));
      const active = schemes.find((scheme) => scheme.showToStudents)?.bimester ?? null;
      setForm((prev) => {
        const nextVisible =
          prev.visibleBimester !== null
            ? prev.visibleBimester
            : active ?? schemes[0]?.bimester ?? null;
        const hasCurrent = schemes.some((scheme) => scheme.bimester === prev.bimester);
        const nextBimester = hasCurrent ? prev.bimester : active ?? schemes[0]?.bimester ?? 1;
        return {
          ...prev,
          visibleBimester: nextVisible,
          bimester: nextBimester || 1,
        };
      });
    } catch (err) {
      console.error('[DivisaoNotasModal] Falha ao carregar esquemas', err);
      toast.error('Não foi possível carregar a divisão de notas.');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, classId, year]);

  useEffect(() => {
    if (!open || !classId) return;
    if (!schemesCache[cacheKey]) {
      void loadSchemes();
    }
  }, [open, classId, cacheKey, loadSchemes, schemesCache]);

  useEffect(() => {
    if (!open) return;
    const schemes = schemesCache[cacheKey] ?? [];
    const current = schemes.find((scheme) => scheme.bimester === bimester);
    const nextItems = current
      ? (current.items.length
          ? current.items.map((item, index) => toItemForm(item, index)).sort((a, b) => a.order - b.order)
          : [createEmptyItem(0)])
      : [createEmptyItem(0)];

    setForm((prev) => {
      const isSameLength = prev.items.length === nextItems.length;
      const isSameContent =
        isSameLength &&
        prev.items.every((item, index) => {
          const candidate = nextItems[index];
          return (
            item.label === candidate.label &&
            item.points === candidate.points &&
            item.rawPoints === candidate.rawPoints &&
            item.type === candidate.type &&
            item.color === candidate.color &&
            item.order === candidate.order
          );
        });
      if (isSameContent) {
        return prev;
      }
      return {
        ...prev,
        items: nextItems,
      };
    });
  }, [open, bimester, cacheKey, schemesCache]);

  const handleAddItem = () => {
    setForm((prev) => {
      const nextOrder = prev.items.length ? Math.max(...prev.items.map((item) => item.order)) + 1 : 0;
      return {
        ...prev,
        items: [...prev.items, createEmptyItem(nextOrder)],
      };
    });
  };

  const handleRemoveItem = (uid: string) => {
    setForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }
      const remaining = prev.items
        .filter((item) => item.uid !== uid)
        .map((item, index) => ({ ...item, order: index }));
      return {
        ...prev,
        items: remaining,
      };
    });
  };

  const handleMove = (uid: string, direction: 'up' | 'down') => {
    setForm((prev) => {
      const index = prev.items.findIndex((item) => item.uid === uid);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev;
      const next = [...prev.items];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return {
        ...prev,
        items: next.map((item, order) => ({ ...item, order })),
      };
    });
  };

  const handleItemChange = (uid: string, patch: Partial<ItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.uid !== uid) {
          return item;
        }
        const next: ItemForm = { ...item, ...patch };
        if (patch.rawPoints !== undefined) {
          next.points = parsePointsInput(patch.rawPoints);
        }
        if (patch.color !== undefined && typeof patch.color === 'string') {
          next.color = patch.color;
        }
        return next;
      }),
    }));
  };

  const handleSave = async () => {
    if (!classId) {
      toast.error('Selecione uma turma.');
      return;
    }
    if (!totalIsValid) {
      toast.error('A soma dos pontos deve ser exatamente 10.');
      return;
    }

    const sanitizedItems = items
      .map((item, index) => {
        const normalizedPoints = parsePointsInput(item.rawPoints);
        return {
          label: item.label.trim(),
          points: normalizedPoints,
          type: item.type,
          color: item.color,
          order: index,
        };
      })
      .filter((item) => item.label || item.points > 0);

    if (!sanitizedItems.length) {
      toast.error('Adicione ao menos um item com pontos.');
      return;
    }

    setSaving(true);
    try {
      const currentSchemes = schemesCache[cacheKey] ?? [];
      const currentVisible = currentSchemes.find((scheme) => scheme.showToStudents)?.bimester ?? null;
      const desiredVisible = visibleBimester ?? currentVisible ?? bimester;

      const scheme = await upsertScheme({
        classId,
        year,
        bimester,
        items: sanitizedItems,
        showToStudents: desiredVisible === bimester,
      });

      if (desiredVisible !== currentVisible) {
        try {
          await setVisibleScheme({ classId, year, bimester: desiredVisible });
        } catch (err) {
          console.error('[DivisaoNotasModal] Falha ao atualizar bimestre visível', err);
          toast.error('Não foi possível atualizar o bimestre em exibição.');
        }
      }

      setSchemesCache((prev) => {
        const existing = prev[cacheKey] ?? [];
        const updatedScheme = scheme ?? {
          id: nanoid(),
          classId,
          year,
          bimester,
          items: sanitizedItems,
          totalPoints: sanitizedItems.reduce((sum, item) => sum + item.points, 0),
          showToStudents: desiredVisible === bimester,
          createdAt: null,
          updatedAt: null,
        };
        const withoutCurrent = existing.filter((entry) => entry.bimester !== bimester);
        return {
          ...prev,
          [cacheKey]: [...withoutCurrent, updatedScheme].map((entry) => ({
            ...entry,
            showToStudents: entry.bimester === desiredVisible,
          })),
      };
    });

      setForm((prev) => ({
        ...prev,
        visibleBimester: desiredVisible,
      }));

      toast.success('Divisão de notas salva.');
      await Promise.resolve(onSaved?.());
      onClose();
    } catch (err) {
      console.error('[DivisaoNotasModal] Falha ao salvar', err);
      toast.error('Erro ao salvar a divisão de notas.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    initializedRef.current = false;
    onClose();
  };

  const bodyStyle = useMemo(
    () => ({ maxHeight: '70vh', overflowY: 'auto', overscrollBehavior: 'contain' as const }),
    []
  );

  return (
    <Modal open={open} onClose={handleClose} className="max-w-3xl overflow-hidden">
      <div className="flex max-h-[85vh] flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="card-title text-slate-900">Configurar divisão de notas</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
            Fechar
          </Button>
        </header>

        <div className="flex-1">
          <div className="space-y-4 px-6 py-4" style={bodyStyle}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Turma</label>
                <select
                value={classId}
                onChange={(event) => {
                  const nextClassId = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    classId: nextClassId,
                    bimester: 1,
                    visibleBimester: null,
                    items: [createEmptyItem(0)],
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ano</label>
              <select
                value={year}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    year: nextYear,
                    bimester: 1,
                    visibleBimester: null,
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                {YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bimestre para edição
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((option) => (
                <label
                  key={`edit-bim-${option}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
                    bimester === option
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="bimester"
                    className="h-3 w-3 accent-orange-500"
                    checked={bimester === option}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        bimester: option,
                      }))
                    }
                  />
                  {option}º bim.
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.uid}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_110px_150px_120px_auto]"
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Item {index + 1}
                    </label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(event) => handleItemChange(item.uid, { label: event.target.value })}
                      placeholder="Descrição"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pontos
                    </label>
                    <input
                      inputMode="decimal"
                      value={item.rawPoints}
                      onChange={(event) => handleItemChange(item.uid, { rawPoints: event.target.value })}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tipo
                    </label>
                    <select
                      value={item.type}
                      onChange={(event) => {
                        const nextType = resolveGradeItemType(event.target.value);
                        const config = GRADE_ITEM_TYPE_MAP[nextType];
                        handleItemChange(item.uid, { type: nextType, color: config.color });
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    >
                      {GRADE_ITEM_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cor
                    </label>
                    <input
                      type="color"
                      value={item.color || '#FF7A00'}
                      onChange={(event) => handleItemChange(item.uid, { color: event.target.value })}
                      className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                      aria-label="Selecionar cor do item"
                    />
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(item.uid, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(item.uid, 'down')}
                      disabled={index === items.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.uid)}
                      disabled={items.length === 1}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bimestre em exibição
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((option) => (
                <label
                  key={`visible-${option}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    visibleBimester === option
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="visible-bimester"
                    className="h-3 w-3 accent-orange-500"
                    checked={visibleBimester === option}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        visibleBimester: option,
                      }))
                    }
                  />
                  {option}º
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-sm font-semibold ${totalIsValid ? 'text-emerald-600' : 'text-rose-600'}`}
              aria-live="polite"
            >
              Total: {totalPoints.toFixed(1)} / {MAX_TOTAL_POINTS.toFixed(1)}
            </p>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              Adicionar item
            </Button>
          </div>

          {!totalIsValid && (
            <p className="text-xs text-rose-600">
              Ajuste os pontos para que a soma seja exatamente {MAX_TOTAL_POINTS.toFixed(1)}.
            </p>
          )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !totalIsValid || loading}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
