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
  color: string;
  order: number;
};

const MAX_TOTAL_POINTS = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1];

function toItemForm(item: GradeSchemeItem, index: number): ItemForm {
  return {
    uid: nanoid(),
    label: item.label ?? '',
    points: Number.isFinite(item.points) ? Number(item.points) : 0,
    color:
      typeof item.color === 'string' && item.color.trim()
        ? item.color.trim()
        : '#2563eb',
    order: Number.isFinite(item.order) ? Number(item.order) : index,
  };
}

function createEmptyItem(order: number): ItemForm {
  return {
    uid: nanoid(),
    label: '',
    points: 1,
    color: '#2563eb',
    order,
  };
}

export default function DivisaoNotasModal({
  open,
  onClose,
  classOptions,
  defaultClassId = null,
  defaultYear = CURRENT_YEAR,
  onSaved,
}: DivisaoNotasModalProps) {
  const [classId, setClassId] = useState<string>(() => defaultClassId || classOptions[0]?.id || '');
  const [year, setYear] = useState<number>(defaultYear);
  const [bimester, setBimester] = useState<number>(1);
  const [items, setItems] = useState<ItemForm[]>([createEmptyItem(0)]);
  const [showToStudents, setShowToStudents] = useState(false);
  const [markAsVisible, setMarkAsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemesCache, setSchemesCache] = useState<Record<string, GradeScheme[]>>({});

  const cacheKey = useMemo(() => `${classId}:${year}`, [classId, year]);

  const totalPoints = useMemo(
    () => items.reduce((sum, item) => sum + (Number.isFinite(item.points) ? Number(item.points) : 0), 0),
    [items]
  );

  const loadSchemes = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const schemes = await listSchemes({ classId, year });
      setSchemesCache((prev) => ({ ...prev, [cacheKey]: schemes }));
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
      setShowToStudents(Boolean(current.showToStudents));
      setMarkAsVisible(Boolean(current.showToStudents));
    } else {
      setItems([createEmptyItem(0)]);
      setShowToStudents(false);
      setMarkAsVisible(false);
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

  const pointsExceeded = totalPoints > MAX_TOTAL_POINTS + 0.001;

  const handleSave = async () => {
    if (!classId) {
      toast.error('Selecione uma turma.');
      return;
    }
    if (pointsExceeded) {
      toast.error('Distribua no máximo 10 pontos.');
      return;
    }

    const sanitizedItems = items
      .map((item, index) => ({
        label: item.label.trim(),
        points: Number.isFinite(item.points) ? Number(item.points) : 0,
        color: item.color,
        order: index,
      }))
      .filter((item) => item.label || item.points > 0);

    if (!sanitizedItems.length) {
      toast.error('Adicione ao menos um item com pontos.');
      return;
    }

    setSaving(true);
    try {
      const scheme = await upsertScheme({
        classId,
        year,
        bimester,
        items: sanitizedItems,
        showToStudents,
      });

      if (markAsVisible) {
        await setVisibleScheme({ classId, year, bimester });
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
          showToStudents: markAsVisible,
          createdAt: null,
          updatedAt: null,
        };
        const withoutCurrent = existing.filter((entry) => entry.bimester !== bimester);
        return {
          ...prev,
          [cacheKey]: [...withoutCurrent, { ...updatedScheme, showToStudents: markAsVisible }],
        };
      });

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
    <Modal open={open} onClose={handleClose}>
      <div className="w-full max-w-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="card-title text-slate-900">Configurar divisão de notas</h2>
          <Button variant="ghost" onClick={handleClose}>
            Fechar
          </Button>
        </div>

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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setBimester(option)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                bimester === option
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option}º bim.
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
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
                className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_110px_90px_auto]"
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
                    type="number"
                    min="0"
                    max={MAX_TOTAL_POINTS}
                    step="0.1"
                    value={item.points}
                    onChange={(event) =>
                      handleItemChange(item.uid, { points: Number(event.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cor
                  </label>
                  <input
                    type="color"
                    value={item.color}
                    onChange={(event) => handleItemChange(item.uid, { color: event.target.value })}
                    className="h-[42px] w-full rounded-xl border border-slate-200 bg-white p-1"
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-600">
            Total: <span className={pointsExceeded ? 'text-red-600' : 'text-slate-900'}>{totalPoints.toFixed(1)}</span> / {MAX_TOTAL_POINTS}
          </div>
          <Button type="button" variant="outline" onClick={handleAddItem}>
            Adicionar item
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={markAsVisible}
              onChange={(event) => {
                setMarkAsVisible(event.target.checked);
                if (event.target.checked) {
                  setShowToStudents(true);
                }
              }}
            />
            Definir este bimestre como visível para alunos
          </label>
          {!markAsVisible ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showToStudents}
                onChange={(event) => setShowToStudents(event.target.checked)}
              />
              Permitir que alunos visualizem esta divisão
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
