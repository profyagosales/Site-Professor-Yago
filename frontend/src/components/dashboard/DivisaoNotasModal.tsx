import { useCallback, useEffect, useMemo, useState } from 'react';
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

function toNumberOrZero(value: string): number {
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
  const [classId, setClassId] = useState<string>(() => defaultClassId || classOptions[0]?.id || '');
  const [year, setYear] = useState<number>(defaultYear);
  const [bimester, setBimester] = useState<number>(1);
  const [items, setItems] = useState<ItemForm[]>([createEmptyItem(0)]);
  const [visibleBimester, setVisibleBimester] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemesCache, setSchemesCache] = useState<Record<string, GradeScheme[]>>({});

  const cacheKey = useMemo(() => `${classId}:${year}`, [classId, year]);

  const totalPoints = useMemo(
    () => items.reduce((sum, item) => sum + toNumberOrZero(item.rawPoints), 0),
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
      setVisibleBimester((current) => {
        if (typeof current === 'number' && current >= 1 && current <= 4) {
          return current;
        }
        if (active !== null) {
          return active;
        }
        return schemes[0]?.bimester ?? 1;
      });
      setBimester((current) => {
        if (schemes.some((scheme) => scheme.bimester === current)) {
          return current;
        }
        return active ?? schemes[0]?.bimester ?? 1;
      });
    } catch (err) {
      console.error('[DivisaoNotasModal] Falha ao carregar esquemas', err);
      toast.error('Não foi possível carregar a divisão de notas.');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, classId, year]);

  useEffect(() => {
    if (!open) return;
    if (!classId && classOptions.length) {
      setClassId(classOptions[0].id);
    }
  }, [open, classId, classOptions]);

  useEffect(() => {
    setVisibleBimester(null);
  }, [classId, year]);

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
    if (current) {
      const formItems = current.items.length
        ? current.items.map((item, index) => toItemForm(item, index)).sort((a, b) => a.order - b.order)
        : [createEmptyItem(0)];
      setItems(formItems);
    } else {
      setItems([createEmptyItem(0)]);
    }
  }, [open, bimester, cacheKey, schemesCache]);

  const handleAddItem = () => {
    setItems((prev) => {
      const nextOrder = prev.length ? Math.max(...prev.map((item) => item.order)) + 1 : 0;
      return [...prev, createEmptyItem(nextOrder)];
    });
  };

  const handleRemoveItem = (uid: string) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((item) => item.uid !== uid).map((item, index) => ({ ...item, order: index }));
    });
  };

  const handleMove = (uid: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.uid === uid);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next.map((item, order) => ({ ...item, order }));
    });
  };

  const handleItemChange = (uid: string, patch: Partial<ItemForm>) => {
    setItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
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
        const normalizedPoints = toNumberOrZero(item.rawPoints);
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

      setVisibleBimester(desiredVisible);

      toast.success('Divisão de notas salva.');
      onSaved?.();
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
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-3xl overflow-hidden">
      <div className="flex max-h-[85vh] flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="card-title text-slate-900">Configurar divisão de notas</h2>
          <Button variant="ghost" onClick={handleClose}>
            Fechar
          </Button>
        </div>

        <div className="modal-body flex-1 min-h-0 space-y-4 pr-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Turma</label>
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
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
                onChange={(event) => setYear(Number(event.target.value))}
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
                    onChange={() => setBimester(option)}
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
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_110px_150px_auto]"
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
                      onBlur={() => {
                        setItems((prev) =>
                          prev.map((entry) => {
                            if (entry.uid !== item.uid) return entry;
                            const normalized = toNumberOrZero(entry.rawPoints);
                            return {
                              ...entry,
                              points: normalized,
                              rawPoints: entry.rawPoints.trim() ? String(normalized) : '',
                            };
                          })
                        );
                      }}
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
                    onChange={() => setVisibleBimester(option)}
                  />
                  {option}º
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span>Total distribuído</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  totalIsValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {totalPoints.toFixed(1)} / {MAX_TOTAL_POINTS.toFixed(1)}
              </span>
            </div>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              Adicionar item
            </Button>
          </div>

          {!totalIsValid && (
            <p className="text-xs text-rose-600">
              Ajuste os pontos para que a soma seja exatamente 10.
            </p>
          )}
        </div>

        <div className="modal-footer mt-6 flex justify-end gap-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !totalIsValid}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
