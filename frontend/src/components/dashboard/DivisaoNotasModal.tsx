import { useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  upsertScheme,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';
import {
  GRADE_ITEM_TYPE_OPTIONS,
  resolveGradeItemType,
  type GradeItemType,
} from '@/constants/gradeScheme';

type Bimester = 1 | 2 | 3 | 4;

type DraftGradeItemType =
  | 'prova'
  | 'teste'
  | 'trabalho'
  | 'projeto'
  | 'atividade'
  | 'outros';

type DraftItem = {
  id: string;
  name: string;
  points: string;
  type: DraftGradeItemType;
  color: string;
  bimester: Bimester;
  order: number;
};

type DivisaoNotasModalProps = {
  open: boolean;
  onClose: () => void;
  classId?: string | null;
  year: number;
  schemes: GradeScheme[];
  loading?: boolean;
  onSaved?: () => void;
};

const BIMESTERS: Bimester[] = [1, 2, 3, 4];

const CURRENT_YEAR = new Date().getFullYear();

const normalizePoints = (value: number | string | null | undefined) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatPointsInput = (value: number | string | null | undefined) => {
  const normalized = normalizePoints(value);
  return normalized.toFixed(1).replace('.', ',');
};

const toDraftType = (value: string | null | undefined): DraftGradeItemType => {
  const resolved = resolveGradeItemType(value ?? undefined);
  switch (resolved) {
    case 'PROVA':
      return 'prova';
    case 'TESTE':
      return 'teste';
    case 'TRABALHO':
      return 'trabalho';
    case 'PROJETO':
      return 'projeto';
    case 'ATIVIDADE':
      return 'atividade';
    default:
      return 'outros';
  }
};

const toGradeItemType = (value: DraftGradeItemType): GradeItemType => {
  switch (value) {
    case 'prova':
      return 'PROVA';
    case 'teste':
      return 'TESTE';
    case 'trabalho':
      return 'TRABALHO';
    case 'projeto':
      return 'PROJETO';
    case 'atividade':
      return 'ATIVIDADE';
    default:
      return 'OUTROS';
  }
};

const buildDraftFromSchemes = (schemes: GradeScheme[]): DraftItem[] => {
  return schemes
    .flatMap((scheme) => {
      const bimester = Math.min(4, Math.max(1, Number(scheme.bimester))) as Bimester;
      const items = Array.isArray(scheme.items) ? scheme.items : [];
      return items.map((item, index) => ({
        id: nanoid(),
        name: typeof item.name === 'string' ? item.name : typeof item.label === 'string' ? item.label : '',
        points: formatPointsInput(item.points),
        type: toDraftType(item.type),
        color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : '#F2994A',
        bimester,
        order: Number.isFinite(item.order) ? Number(item.order) : index,
      }));
    })
    .sort((a, b) => {
      if (a.bimester !== b.bimester) {
        return a.bimester - b.bimester;
      }
      return a.order - b.order;
    });
};

const ensureOrders = (items: DraftItem[], targetBimester: Bimester) => {
  const sorted = items
    .filter((item) => item.bimester === targetBimester)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
  const orderMap = new Map(sorted.map((item) => [item.id, item.order]));
  return items.map((item) =>
    item.bimester === targetBimester && orderMap.has(item.id)
      ? { ...item, order: orderMap.get(item.id) ?? item.order }
      : item,
  );
};

const clampPoints = (value: string) => {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return '0,0';
  }
  const clamped = Math.max(0, Math.min(10, parsed));
  return clamped.toFixed(1).replace('.', ',');
};

const sumDraftPoints = (items: DraftItem[], bimester: Bimester) =>
  items
    .filter((item) => item.bimester === bimester)
    .reduce((acc, item) => {
      const parsed = Number.parseFloat(item.points.replace(',', '.'));
      return acc + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

const toGradeSchemeItems = (items: DraftItem[], bimester: Bimester): GradeSchemeItem[] => {
  return items
    .filter((item) => item.bimester === bimester)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => {
      const trimmedName = item.name.trim();
      const safeName = trimmedName || `Item ${index + 1}`;
      const points = Number.parseFloat(item.points.replace(',', '.'));
      return {
        name: safeName,
        label: safeName,
        points: Number.isFinite(points) ? points : 0,
        type: toGradeItemType(item.type),
        color: item.color || GRADE_ITEM_TYPE_OPTIONS[0]?.color || '#F2994A',
        order: index,
      };
    });
};

export default function DivisaoNotasModal({
  open,
  onClose,
  classId,
  year = CURRENT_YEAR,
  schemes,
  loading = false,
  onSaved,
}: DivisaoNotasModalProps) {
  const [bimester, setBimester] = useState<Bimester>(1);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const nameFieldRefs = useRef(new Map<string, HTMLInputElement>());
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const preparedDraft = buildDraftFromSchemes(schemes);
      setDraft(preparedDraft);
      const firstBimester = (preparedDraft[0]?.bimester ?? 1) as Bimester;
      setBimester(firstBimester);
      const firstItem = preparedDraft.find((item) => item.bimester === firstBimester);
      setPendingFocusId(firstItem?.id ?? null);
    }
    if (!open && prevOpenRef.current) {
      setDraft([]);
      setBimester(1);
      setPendingFocusId(null);
    }
    prevOpenRef.current = open;
  }, [open, schemes]);

  useEffect(() => {
    if (!open || !pendingFocusId) return;
    const input = nameFieldRefs.current.get(pendingFocusId);
    if (input) {
      input.focus();
      input.select();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, open, bimester, draft.length]);

  const registerNameInput = (id: string) => (element: HTMLInputElement | null) => {
    if (!element) {
      nameFieldRefs.current.delete(id);
      return;
    }
    nameFieldRefs.current.set(id, element);
  };

  const patchItem = (id: string, patch: Partial<DraftItem>) => {
    setDraft((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const handleNameChange = (id: string, value: string) => {
    patchItem(id, { name: value });
  };

  const handlePointsChange = (id: string, value: string) => {
    patchItem(id, { points: value });
  };

  const handlePointsBlur = (id: string) => {
    const target = draft.find((item) => item.id === id);
    if (!target) return;
    const normalized = clampPoints(target.points);
    patchItem(id, { points: normalized });
  };

  const handleTypeChange = (id: string, value: string) => {
    const normalized = value.trim().toUpperCase();
    const match = GRADE_ITEM_TYPE_OPTIONS.find((option) => option.value === normalized);
    const draftType = toDraftType(match?.value ?? 'OUTROS');
    patchItem(id, { type: draftType });
  };

  const handleColorChange = (id: string, value: string) => {
    patchItem(id, { color: value });
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    setDraft((current) => {
      const target = current.find((item) => item.id === id);
      if (!target) return current;
      const siblings = current
        .filter((item) => item.bimester === target.bimester)
        .sort((a, b) => a.order - b.order);
      const index = siblings.findIndex((item) => item.id === id);
      if (index === -1) return current;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return current;
      const reordered = [...siblings];
      const [removed] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, removed);
      const orderedMap = new Map(reordered.map((item, order) => [item.id, order] as const));
      return current.map((item) =>
        item.bimester === target.bimester && orderedMap.has(item.id)
          ? { ...item, order: orderedMap.get(item.id) ?? item.order }
          : item,
      );
    });
  };

  const handleRemove = (id: string) => {
    const target = draft.find((item) => item.id === id);
    if (!target) return;
    const confirmed = window.confirm('Deseja remover este item?');
    if (!confirmed) return;
    setDraft((current) => {
      const remaining = current.filter((item) => item.id !== id);
      return ensureOrders(remaining, target.bimester);
    });
  };

  const handleAddItem = () => {
    setDraft((current) => {
      const siblings = current.filter((item) => item.bimester === bimester);
      const nextOrder = siblings.length ? Math.max(...siblings.map((item) => item.order)) + 1 : 0;
      const newItem: DraftItem = {
        id: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: '',
        points: '0,0',
        type: 'prova',
        color: '#F2994A',
        bimester,
        order: nextOrder,
      };
      setPendingFocusId(newItem.id);
      return [...current, newItem];
    });
  };

  const handleBimesterChange = (value: Bimester) => {
    setBimester(value);
    const firstItem = draft
      .filter((item) => item.bimester === value)
      .sort((a, b) => a.order - b.order)[0];
    if (firstItem) {
      setPendingFocusId(firstItem.id);
    }
  };

  const totalsByBimester = useMemo(() => {
    const totals = new Map<Bimester, number>();
    BIMESTERS.forEach((value) => {
      totals.set(value, Number(sumDraftPoints(draft, value).toFixed(2)));
    });
    return totals;
  }, [draft]);

  const invalidBimesters = useMemo(
    () =>
      BIMESTERS.filter((value) => {
        const total = totalsByBimester.get(value) ?? 0;
        return Math.abs(total - 10) > 0.001;
      }),
    [totalsByBimester],
  );

  const canSave =
    open &&
    Boolean(classId) &&
    draft.length > 0 &&
    invalidBimesters.length === 0 &&
    !saving &&
    !loading;

  const formatTotal = (value: number) => value.toFixed(1).replace('.', ',');

  const list = useMemo(
    () =>
      draft
        .filter((item) => item.bimester === bimester)
        .sort((a, b) => a.order - b.order),
    [draft, bimester],
  );

  const handleSave = async () => {
    if (!classId) {
      toast.error('Selecione uma turma para salvar.');
      return;
    }
    if (!canSave) {
      toast.error('Cada bimestre deve somar exatamente 10 pontos.');
      return;
    }

    setSaving(true);
    try {
      for (const currentBimester of BIMESTERS) {
        const items = toGradeSchemeItems(draft, currentBimester);
        await upsertScheme({
          classId,
          year,
          bimester: currentBimester,
          items,
        });
      }
      toast.success('Divisão de notas salva.');
      await Promise.resolve(onSaved?.());
      onClose();
    } catch (error) {
      console.error('[DivisaoNotasModal] Falha ao salvar divisão de notas', error);
      toast.error('Não foi possível salvar a divisão de notas.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-4xl overflow-hidden">
      <div className="flex max-h-[85vh] flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">Configurar divisão de notas</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
            Fechar
          </Button>
        </header>

        <div className="flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 bg-white px-6 py-3">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Bimestre para edição</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {BIMESTERS.map((option) => (
                  <label
                    key={option}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-semibold transition ${
                      bimester === option
                        ? 'border-orange-400 bg-orange-50 text-orange-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bimester"
                      className="h-4 w-4 accent-orange-500"
                      checked={bimester === option}
                      onChange={() => handleBimesterChange(option)}
                    />
                    {option}º
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-4">
              {loading ? (
                <p className="text-sm text-slate-500">Carregando divisão de notas…</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Itens do {bimester}º bimestre
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                      Adicionar item
                    </Button>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum item cadastrado. Adicione um item para começar.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {list.map((item, index) => {
                        const isFirst = index === 0;
                        const isLast = index === list.length - 1;
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_180px_140px]">
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Nome do item
                                </label>
                                <input
                                  ref={registerNameInput(item.id)}
                                  type="text"
                                  value={item.name}
                                  onChange={(event) => handleNameChange(item.id, event.target.value)}
                                  placeholder="Nome do item"
                                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Pontos
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.points}
                                  onChange={(event) => handlePointsChange(item.id, event.target.value)}
                                  onBlur={() => handlePointsBlur(item.id)}
                                  placeholder="0,0"
                                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Tipo
                                </label>
                                <select
                                  value={toGradeItemType(item.type)}
                                  onChange={(event) => handleTypeChange(item.id, event.target.value)}
                                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
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
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={item.color}
                                    onChange={(event) => handleColorChange(item.id, event.target.value)}
                                    className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                                    aria-label="Selecionar cor do item"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 px-0"
                                      onClick={() => handleMove(item.id, 'up')}
                                      disabled={isFirst}
                                      aria-label="Mover item para cima"
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 px-0"
                                      onClick={() => handleMove(item.id, 'down')}
                                      disabled={isLast}
                                      aria-label="Mover item para baixo"
                                    >
                                      ↓
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(item.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {BIMESTERS.map((value) => {
                const total = totalsByBimester.get(value) ?? 0;
                const isValid = Math.abs(total - 10) <= 0.001;
                return (
                  <span
                    key={`total-${value}`}
                    className={`text-sm font-semibold ${isValid ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    Total do {value}º: {formatTotal(total)} / 10,0
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={!canSave}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
          {invalidBimesters.length > 0 && (
            <p className="mt-2 text-xs text-rose-600">
              Ajuste os pontos para que todos os bimestres somem exatamente 10,0.
            </p>
          )}
        </footer>
      </div>
    </Modal>
  );
}
