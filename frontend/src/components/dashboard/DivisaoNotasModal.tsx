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
  name: string;
  points: number;
  rawPoints: string;
  type: GradeItemType;
  color: string;
  order: number;
};

const MAX_TOTAL_POINTS = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1];

const buildCacheKey = (classId: string, year: number) => `${classId}:${year}`;

type FormState = {
  classId: string;
  year: number;
  bimester: number;
  visibleBimester: number | null;
};

const createInitialForm = (classId: string, year: number): FormState => ({
  classId,
  year,
  bimester: 1,
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

function formatPointsString(value: string): string {
  const sanitized = typeof value === 'string' ? value.trim() : '';
  if (!sanitized) {
    return '';
  }
  const parsed = parsePointsInput(sanitized);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return '';
  }
  const normalizedNumber = Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(2);
  const trimmedNormalized = normalizedNumber.replace(/\.0+$/, '.0').replace(/(\.\d*?[1-9])0+$/, '$1');
  const display = trimmedNormalized || '0';
  return display.replace('.', ',');
}

function toItemForm(item: GradeSchemeItem, index: number): ItemForm {
  const resolvedType = resolveGradeItemType(item.type);
  const typeConfig = GRADE_ITEM_TYPE_MAP[resolvedType];
  const safePoints = Number.isFinite(item.points) ? Number(item.points) : 0;
  return {
    uid: nanoid(),
    name: (typeof item.name === 'string' && item.name.trim())
      ? item.name.trim()
      : typeof item.label === 'string' && item.label.trim()
        ? item.label.trim()
        : '',
    points: Number.isFinite(item.points) ? parsePointsInput(String(safePoints)) : 0,
    rawPoints: Number.isFinite(item.points) ? formatPointsString(String(safePoints)) : '',
    type: resolvedType,
    color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : typeConfig.color,
    order: Number.isFinite(item.order) ? Number(item.order) : index,
  };
}

function createEmptyItem(order: number): ItemForm {
  return {
    uid: nanoid(),
    name: '',
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
  const [editItems, setEditItems] = useState<ItemForm[]>(() => [createEmptyItem(0)]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemesCache, setSchemesCache] = useState<Record<string, GradeScheme[]>>({});
  const prevOpenRef = useRef(open);
  const formSnapshotRef = useRef(form);
  const firstItemRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusFirstItemRef = useRef(false);

  const { classId, year, bimester, visibleBimester } = form;

  useEffect(() => {
    formSnapshotRef.current = form;
  }, [form]);

  const cacheKey = useMemo(() => buildCacheKey(classId || '', year), [classId, year]);

  const totalPoints = useMemo(
    () => Number(editItems.reduce((sum, item) => sum + (Number.isFinite(item.points) ? item.points : 0), 0).toFixed(1)),
    [editItems]
  );

  const totalIsValid = Math.abs(totalPoints - MAX_TOTAL_POINTS) < 0.001;
  const formatTotalPoints = (value: number) =>
    value.toFixed(2).replace(/\.0+$/, '.0').replace(/(\.\d*?[1-9])0$/, '$1');

  const applySchemeItems = useCallback(
    (scheme: GradeScheme | null | undefined) => {
      if (!scheme || !scheme.items.length) {
        setEditItems([createEmptyItem(0)]);
        shouldFocusFirstItemRef.current = true;
        return;
      }

      const normalized = scheme.items
        .map((item, index) => toItemForm(item, index))
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index }));

      setEditItems(normalized);
      shouldFocusFirstItemRef.current = true;
    },
    []
  );

  const syncFormFromSchemes = useCallback(
    (schemes: GradeScheme[], nextClassId: string, nextYear: number, desiredBimester?: number) => {
      const previous = formSnapshotRef.current;
      const sorted = [...schemes].sort((a, b) => a.bimester - b.bimester);
      const fallbackBimester = sorted[0]?.bimester ?? 1;
      const visibleFromServer = schemes.find((scheme) => scheme.showToStudents)?.bimester ?? null;

      let resolvedBimester = desiredBimester ?? previous.bimester ?? fallbackBimester;

      if (!schemes.some((scheme) => scheme.bimester === resolvedBimester)) {
        if (previous.bimester && schemes.some((scheme) => scheme.bimester === previous.bimester)) {
          resolvedBimester = previous.bimester;
        } else if (visibleFromServer && schemes.some((scheme) => scheme.bimester === visibleFromServer)) {
          resolvedBimester = visibleFromServer;
        } else if (schemes.length) {
          resolvedBimester = fallbackBimester;
        } else {
          resolvedBimester = 1;
        }
      }

      const resolvedVisible = (() => {
        if (previous.visibleBimester && schemes.some((scheme) => scheme.bimester === previous.visibleBimester)) {
          return previous.visibleBimester;
        }
        if (visibleFromServer && schemes.some((scheme) => scheme.bimester === visibleFromServer)) {
          return visibleFromServer;
        }
        return schemes.length ? resolvedBimester : null;
      })();

      setForm({
        classId: nextClassId,
        year: nextYear,
        bimester: resolvedBimester || 1,
        visibleBimester: resolvedVisible,
      });

      const targetScheme = schemes.find((scheme) => scheme.bimester === resolvedBimester);
      applySchemeItems(targetScheme);
    },
    [applySchemeItems]
  );

  const loadSchemes = useCallback(
    async (nextClassId: string, nextYear: number, options: { desiredBimester?: number; force?: boolean } = {}) => {
      if (!nextClassId) {
        setForm((prev) => ({ ...prev, classId: '', bimester: 1, visibleBimester: null }));
        setEditItems([createEmptyItem(0)]);
        return;
      }

      const key = buildCacheKey(nextClassId, nextYear);
      const cached = schemesCache[key];
      if (cached && !options.force) {
        syncFormFromSchemes(cached, nextClassId, nextYear, options.desiredBimester);
        return;
      }

      setLoading(true);
      try {
        const response = await listSchemes({ classId: nextClassId, year: nextYear });
        setSchemesCache((prev) => ({ ...prev, [key]: response }));
        syncFormFromSchemes(response, nextClassId, nextYear, options.desiredBimester);
      } catch (err) {
        console.error('[DivisaoNotasModal] Falha ao carregar esquemas', err);
        toast.error('Não foi possível carregar a divisão de notas.');
      } finally {
        setLoading(false);
      }
    },
    [schemesCache, syncFormFromSchemes]
  );

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (open && !wasOpen) {
      const currentForm = formSnapshotRef.current;
      const fallbackClass = defaultClassId || currentForm.classId || classOptions[0]?.id || '';
      const fallbackYear = defaultYear || currentForm.year || CURRENT_YEAR;
      setForm(createInitialForm(fallbackClass, fallbackYear));
      setEditItems([createEmptyItem(0)]);
      shouldFocusFirstItemRef.current = true;
      if (fallbackClass) {
        void loadSchemes(fallbackClass, fallbackYear, { force: true });
      }
    }
    prevOpenRef.current = open;
  }, [open, defaultClassId, defaultYear, classOptions, loadSchemes]);

  useEffect(() => {
    if (!open) return;
    if (!form.classId && classOptions.length) {
      const fallbackClass = classOptions[0].id;
      setForm((prev) => ({
        ...prev,
        classId: fallbackClass,
      }));
      setEditItems([createEmptyItem(0)]);
      shouldFocusFirstItemRef.current = true;
      void loadSchemes(fallbackClass, form.year, { force: true });
    }
  }, [open, classOptions, form.classId, form.year, loadSchemes]);

  useEffect(() => {
    if (!open) return;
    if (shouldFocusFirstItemRef.current && firstItemRef.current) {
      firstItemRef.current.focus();
      shouldFocusFirstItemRef.current = false;
    }
  }, [open, editItems.length]);

  useEffect(() => {
    if (!open || !classId) return;
    const key = buildCacheKey(classId, year);
    if (!schemesCache[key]) {
      void loadSchemes(classId, year);
    }
  }, [open, classId, year, loadSchemes, schemesCache]);

  const handleClassChange = (nextClassId: string) => {
    setForm((prev) => ({ ...prev, classId: nextClassId, bimester: 1, visibleBimester: null }));
    shouldFocusFirstItemRef.current = true;
    if (nextClassId) {
      setEditItems([createEmptyItem(0)]);
      void loadSchemes(nextClassId, year, { desiredBimester: 1, force: true });
    } else {
      setEditItems([createEmptyItem(0)]);
    }
  };

  const handleYearChange = (nextYear: number) => {
    setForm((prev) => ({ ...prev, year: nextYear, bimester: 1, visibleBimester: null }));
    shouldFocusFirstItemRef.current = true;
    if (classId) {
      setEditItems([createEmptyItem(0)]);
      void loadSchemes(classId, nextYear, { desiredBimester: 1, force: true });
    } else {
      setEditItems([createEmptyItem(0)]);
    }
  };

  const handleBimesterChange = (nextBimester: number) => {
    setForm((prev) => ({ ...prev, bimester: nextBimester }));
    const key = buildCacheKey(classId, year);
    const schemes = schemesCache[key] ?? [];
    const targetScheme = schemes.find((scheme) => scheme.bimester === nextBimester);
    applySchemeItems(targetScheme);
  };

  const handleVisibleBimesterChange = (nextVisible: number) => {
    setForm((prev) => ({ ...prev, visibleBimester: nextVisible }));
  };

  const handleAddItem = () => {
    setEditItems((prev) => {
      const nextOrder = prev.length ? Math.max(...prev.map((item) => item.order)) + 1 : 0;
      return [...prev, createEmptyItem(nextOrder)];
    });
    shouldFocusFirstItemRef.current = false;
  };

  const handleRemoveItem = (uid: string) => {
    setEditItems((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      const remaining = prev.filter((item) => item.uid !== uid).map((item, index) => ({ ...item, order: index }));
      return remaining.length ? remaining : [createEmptyItem(0)];
    });
    shouldFocusFirstItemRef.current = false;
  };

  const handleMove = (uid: string, direction: 'up' | 'down') => {
    setEditItems((prev) => {
      const index = prev.findIndex((item) => item.uid === uid);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next.map((item, order) => ({ ...item, order }));
    });
    shouldFocusFirstItemRef.current = false;
  };

  const handleItemChange = (uid: string, patch: Partial<ItemForm>) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) {
          return item;
        }
        const next: ItemForm = { ...item, ...patch };
        if (patch.name !== undefined) {
          const trimmed = typeof patch.name === 'string' ? patch.name : '';
          next.name = trimmed;
        }
        if (patch.rawPoints !== undefined) {
          next.rawPoints = patch.rawPoints;
          next.points = parsePointsInput(patch.rawPoints);
        }
        if (patch.color !== undefined && typeof patch.color === 'string') {
          next.color = patch.color;
        }
        return next;
      })
    );
  };

  const handlePointsBlur = (uid: string) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) {
          return item;
        }
        const normalized = formatPointsString(item.rawPoints);
        if (!normalized) {
          return { ...item, rawPoints: '', points: 0 };
        }
        const parsed = parsePointsInput(normalized);
        return { ...item, rawPoints: normalized, points: parsed };
      })
    );
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

    const sanitizedItems = editItems
      .map((item, index) => {
        const normalizedPoints = parsePointsInput(item.rawPoints);
        const trimmedName = item.name.trim();
        const safeName = trimmedName || `Item ${index + 1}`;
        const resolvedType = item.type || 'PROVA';
        return {
          name: safeName,
          label: safeName,
          points: normalizedPoints,
          type: resolvedType,
          color: item.color || GRADE_ITEM_TYPE_MAP[resolvedType]?.color || '#EB7A28',
          order: index,
        };
      })
      .filter((item) => item.name || item.points > 0);

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
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-3xl overflow-hidden">
      <div className="flex max-h-[85vh] flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="card-title text-slate-900">Configurar divisão de notas</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
            Fechar
          </Button>
        </header>

        <div className="modal-body-scroll flex-1 space-y-4 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Turma</label>
                <select
                value={classId}
                onChange={(event) => handleClassChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ano</label>
              <select
                value={year}
                onChange={(event) => handleYearChange(Number(event.target.value))}
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
                    onChange={() => handleBimesterChange(option)}
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
              editItems.map((item, index) => (
                <div
                  key={item.uid}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1.6fr)_120px_160px_120px_56px_56px_minmax(110px,1fr)] sm:items-start"
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome do item {index + 1}
                    </label>
                    <input
                      ref={index === 0 ? firstItemRef : undefined}
                      type="text"
                      value={item.name}
                      onChange={(event) => handleItemChange(item.uid, { name: event.target.value })}
                      placeholder="Nome da atividade"
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
                      onBlur={() => handlePointsBlur(item.uid)}
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
                  <div className="flex items-end sm:items-center sm:justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(item.uid, 'up')}
                      disabled={index === 0}
                      className="w-full sm:w-auto"
                      aria-label="Mover item para cima"
                      title="Mover item para cima"
                    >
                      ↑
                    </Button>
                  </div>
                  <div className="flex items-end sm:items-center sm:justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(item.uid, 'down')}
                      disabled={index === editItems.length - 1}
                      className="w-full sm:w-auto"
                      aria-label="Mover item para baixo"
                      title="Mover item para baixo"
                    >
                      ↓
                    </Button>
                  </div>
                  <div className="flex items-end sm:items-center sm:justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.uid)}
                      disabled={editItems.length === 1}
                      className="w-full sm:w-auto"
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
                    onChange={() => handleVisibleBimesterChange(option)}
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
              Total: {formatTotalPoints(totalPoints)} / {formatTotalPoints(MAX_TOTAL_POINTS)}
            </p>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              Adicionar item
            </Button>
          </div>

          {!totalIsValid && (
            <p className="text-xs text-rose-600" role="alert" aria-live="assertive">
              Ajuste os pontos para que a soma seja exatamente {MAX_TOTAL_POINTS.toFixed(1)}.
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
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
