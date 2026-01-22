import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { cn } from '@/utils/cn';
import {
  DEFAULT_SCHEME,
  GRADE_SCHEME_DEFAULT_STORAGE_KEY,
  saveGradeScheme,
  type Bimestre,
  type GradeScheme,
  type GradeSchemeBimester,
  type GradeSchemeItem,
} from '@/services/gradeScheme';

type Props = {
  ano: number;
  classId: string | null;
  initial: GradeScheme | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultBimester: Bimestre;
  currentBimester: Bimestre;
  onSaveDefaultBimester?: (bimester: Bimestre) => Promise<void>;
};

type EditableItem = GradeSchemeItem & { pointsText: string };
type EditableBimester = Omit<GradeSchemeBimester, 'items'> & { items: EditableItem[] };
type EditableScheme = {
  classId: string;
  year: number;
  byBimester: Record<Bimestre, EditableBimester>;
};

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];
const DEFAULT_COLOR = '#EB7A28';
const TYPES: Array<{ value: string; label: string }> = [
  { value: 'PROVA', label: 'Prova' },
  { value: 'TRABALHO', label: 'Trabalho' },
  { value: 'PROJETO', label: 'Projeto' },
  { value: 'TESTE', label: 'Teste' },
  { value: 'OUTROS', label: 'Outros' },
];

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2, 10)}`;

export default function DivisaoNotasModal({
  ano,
  classId,
  initial,
  isOpen,
  onClose,
  onSaved,
  defaultBimester,
  currentBimester,
  onSaveDefaultBimester,
}: Props) {
  const [active, setActive] = useState<Bimestre>(1);
  const [saving, setSaving] = useState(false);
  const [invalidBimester, setInvalidBimester] = useState<Bimestre | null>(null);
  const [localScheme, setLocalScheme] = useState<EditableScheme>(() =>
    createEditableScheme(initial, classId, ano),
  );
  const [defaultChoice, setDefaultChoice] = useState<Bimestre>(defaultBimester);
  const [savingDefault, setSavingDefault] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActive(currentBimester);
    setInvalidBimester(null);
    setLocalScheme(createEditableScheme(initial, classId, ano));
    setDefaultChoice(defaultBimester);
  }, [ano, classId, currentBimester, defaultBimester, initial, isOpen]);

  const itens = useMemo(() => localScheme.byBimester[active]?.items ?? [], [localScheme, active]);

  const totals = useMemo(() => {
    return BIMESTERS.reduce((acc, bimester) => {
      const items = localScheme.byBimester[bimester]?.items ?? [];
      acc[bimester] = items.reduce((sum, item) => sum + parsePoints(item.pointsText), 0);
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Bimestre, number>);
  }, [localScheme]);

  const hasAllNames = useMemo(
    () =>
      BIMESTERS.every((b) =>
        (localScheme.byBimester[b]?.items ?? []).every((item) => item.name.trim().length > 0),
      ),
    [localScheme],
  );

  const allTotalsValid = useMemo(
    () =>
      BIMESTERS.every((b) => {
        const total = totals[b];
        return Math.abs(total - 10) < 0.001;
      }),
    [totals],
  );

  const overLimitBimesters = useMemo(
    () => BIMESTERS.filter((b) => totals[b] > 10.0001),
    [totals],
  );

  const hasOverLimit = overLimitBimesters.length > 0;

  const updateItems = (bimester: Bimestre, recipe: (items: EditableItem[]) => EditableItem[]) => {
    setLocalScheme((prev) => {
      const current = prev.byBimester[bimester] ?? createEditableBimester(prev.classId, prev.year, bimester);
      const nextItems = normalizeOrders(recipe([...current.items]));
      return {
        ...prev,
        byBimester: {
          ...prev.byBimester,
          [bimester]: { ...current, items: nextItems },
        },
      };
    });
  };

  const addItem = (bimester: Bimestre) => {
    updateItems(bimester, (items) => [
      ...items,
      {
        id: makeId(),
        name: '',
        label: '',
        points: 0,
        pointsText: '0,0',
        type: 'PROVA',
        color: DEFAULT_COLOR,
        order: items.length,
      },
    ]);
  };

  const patchItem = (bimester: Bimestre, id: string, patch: Partial<EditableItem>) => {
    updateItems(bimester, (items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              id,
              name: patch.name !== undefined ? patch.name : item.name,
              label: patch.label !== undefined ? patch.label : patch.name !== undefined ? patch.name : item.label,
            }
          : item,
    );
  };

  const removeItem = (bimester: Bimestre, id: string) => {
    updateItems(bimester, (items) => items.filter((item) => item.id !== id));
  };

  const moveItem = (bimester: Bimestre, id: string, direction: -1 | 1) => {
    updateItems(bimester, (items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return items;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return items;
      const clone = [...items];
      [clone[index], clone[nextIndex]] = [clone[nextIndex], clone[index]];
      return clone.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handleSave = async () => {
    if (!classId) {
      toast.error('Selecione uma turma para salvar a divisão de notas.');
      return;
    }
    if (!hasAllNames) {
      toast.error('Preencha o nome de todos os itens.');
      return;
    }
    if (hasOverLimit) {
      setInvalidBimester(overLimitBimesters[0]);
      toast.error('Algum bimestre excede 10,0 pontos. Ajuste para salvar.');
      return;
    }

    try {
      setSaving(true);
      setInvalidBimester(null);
      const payload = toServiceScheme(localScheme);
      const saved = await saveGradeScheme(payload);
      setLocalScheme(createEditableScheme(saved, classId, ano));
      onSaved?.();
      if (!allTotalsValid) {
        toast.info('Salvo. Alguns bimestres ainda não somam 10 pts; ajuste depois se precisar.');
      }
      onClose();
    } catch (error: any) {
      const status = error?.status;
      const code = error?.code;
      if (code === 'ROUTE_NOT_FOUND' || status === 404 || /rota da api não encontrada/i.test(error?.message ?? '')) {
        toast.error('Divisão de notas indisponível no momento (rota da API não encontrada)');
      } else if (status === 400) {
        const bimester = error?.bimester as Bimestre | undefined;
        if (bimester) {
          setInvalidBimester(bimester);
        }
        toast.error(error?.message ?? 'A soma de pontos deve ser igual a 10,0.');
      } else {
        toast.error(error?.message ?? 'Falha ao salvar divisão de notas.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveDefaultBimester = async () => {
    if (!onSaveDefaultBimester) return;
    try {
      setSavingDefault(true);
      await onSaveDefaultBimester(defaultChoice);
      if (typeof window !== 'undefined') {
        localStorage.setItem(GRADE_SCHEME_DEFAULT_STORAGE_KEY, String(defaultChoice));
      }
      toast.success('Bimestre padrão atualizado!');
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status ?? null;
      const code = error?.code ?? error?.response?.data?.code ?? null;
      const message = error?.message ?? 'Não foi possível salvar o bimestre padrão.';
      const fallbackMessage = 'Bimestre padrão salvo neste navegador.';
      const shouldFallback =
        code === 'ROUTE_NOT_FOUND' ||
        code === 'ERR_NETWORK' ||
        status === 0 ||
        status === 404 ||
        /rota da api não encontrada/i.test(message) ||
        /divisão de notas indisponível/i.test(message);
      if (typeof window !== 'undefined' && shouldFallback) {
        localStorage.setItem(GRADE_SCHEME_DEFAULT_STORAGE_KEY, String(defaultChoice));
        toast.success(fallbackMessage);
      } else {
        toast.error(message);
      }
    } finally {
      setSavingDefault(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal overflow-hidden rounded-3xl border border-slate-100 shadow-2xl">
        <header className="modal-header sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Configurar divisão de notas</p>
            <h3 className="text-lg font-semibold text-slate-900">Ajuste os itens por bimestre</h3>
          </div>
          <button className="btn btn-outline" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="modal-body">
          <div className="grid gap-4 lg:grid-cols-[360px,1fr] xl:grid-cols-[380px,1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-slate-800">Bimestre padrão no card</div>
                  <p className="text-xs text-slate-500">Escolha qual bimestre será exibido por padrão no card da divisão de notas.</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BIMESTERS.map((bim) => (
                    <label
                      key={bim}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        defaultChoice === bim
                          ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="grade-scheme-default"
                        value={bim}
                        checked={defaultChoice === bim}
                        onChange={() => setDefaultChoice(bim)}
                      />
                      <span>{bim}º bimestre</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={handleSaveDefaultBimester}
                    disabled={!onSaveDefaultBimester || savingDefault}
                  >
                    {savingDefault ? 'Salvando…' : 'Salvar como padrão'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-slate-800">Selecione o bimestre para editar</span>
                  <p className="text-xs text-slate-500">Edite um bimestre por vez; você pode salvar mesmo que outros bimestres ainda não somem 10 pts.</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {BIMESTERS.map((bim) => (
                    <button
                      key={bim}
                      className={cn(
                        'bimestre-pill px-4 py-2 text-sm font-semibold',
                        active === bim
                          ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                      type="button"
                      aria-pressed={active === bim}
                      onClick={() => setActive(bim)}
                    >
                      {bim}º
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Totais por bimestre</h4>
                <TotalsGrid totals={totals} invalid={invalidBimester} overLimit={overLimitBimesters} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-800">Itens do {active}º bimestre</h4>
                    <p className="text-xs text-slate-500">Adicione avaliações, trabalhos ou atividades e distribua os pontos.</p>
                  </div>
                  <button className="btn btn-outline" type="button" onClick={() => addItem(active)}>
                    Adicionar item
                  </button>
                </div>

                {classId ? (
                  <ItemList
                    items={itens}
                    onRemove={(id) => removeItem(active, id)}
                    onMove={(id, dir) => moveItem(active, id, dir)}
                    onPatch={(id, patch) => patchItem(active, id, patch)}
                  />
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Cadastre uma turma para configurar a divisão de notas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="modal-footer sticky bottom-0 left-0 right-0 flex justify-end gap-3 border-t border-slate-200 bg-white/95">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={saving || !classId || !hasAllNames || hasOverLimit}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ItemList({
  items,
  onRemove,
  onMove,
  onPatch,
}: {
  items: EditableItem[];
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onPatch: (id: string, patch: Partial<EditableItem>) => void;
}) {
  return (
    <div className="space-y-4">
      {!items.length && (
        <p className="text-sm text-slate-500">Nenhum item cadastrado. Adicione um item para começar.</p>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            onRemove={() => onRemove(item.id)}
            onMoveUp={() => onMove(item.id, -1)}
            onMoveDown={() => onMove(item.id, 1)}
            onPatch={(patch) => onPatch(item.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPatch,
}: {
  item: EditableItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPatch: (patch: Partial<EditableItem>) => void;
}) {
  const handlePointsChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(/,{2,}/g, ',');
    onPatch({ pointsText: cleaned });
  };

  const commitPoints = (value: string) => {
    const numeric = clampPoints(parsePoints(value));
    onPatch({ points: numeric, pointsText: formatPointsInput(numeric) });
  };

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 p-4">
      <div className="min-w-[200px] flex-1">
        <label className="label">Nome do item</label>
        <input
          className="input w-full"
          value={item.name}
          onChange={(event) => onPatch({ name: event.target.value, label: event.target.value })}
          placeholder="Ex.: Prova 1, Projeto, Trabalho..."
        />
      </div>

      <div>
        <label className="label">Pontos</label>
        <input
          className="input w-[120px] text-right"
          inputMode="decimal"
          value={item.pointsText}
          onChange={(event) => handlePointsChange(event.target.value)}
          onBlur={(event) => commitPoints(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitPoints((event.target as HTMLInputElement).value);
            }
          }}
          placeholder="0,0"
        />
      </div>

      <div>
        <label className="label">Tipo</label>
        <select
          className="input"
          value={item.type}
          onChange={(event) => onPatch({ type: event.target.value })}
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Cor</label>
        <input
          type="color"
          className="h-10 w-16 cursor-pointer rounded border"
          value={item.color || DEFAULT_COLOR}
          onChange={(event) => onPatch({ color: event.target.value })}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="icon-btn" type="button" onClick={onMoveUp} disabled={!canMoveUp} title="Mover para cima">
          ↑
        </button>
        <button className="icon-btn" type="button" onClick={onMoveDown} disabled={!canMoveDown} title="Mover para baixo">
          ↓
        </button>
        <button className="icon-btn danger" type="button" onClick={onRemove} title="Remover">
          ✕
        </button>
      </div>
    </div>
  );
}

function TotalsGrid({ totals, invalid, overLimit }: { totals: Record<Bimestre, number>; invalid: Bimestre | null; overLimit: Bimestre[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {BIMESTERS.map((bim) => {
        const total = totals[bim];
        const over = overLimit.includes(bim);
        const ok = Math.abs(total - 10) < 0.001;
        const variant = over
          ? 'border border-rose-500 bg-rose-50 text-rose-700'
          : ok
            ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
            : 'border border-amber-200 bg-amber-50 text-amber-700';
        return (
          <div key={bim} className={`rounded-xl px-3 py-2 text-sm font-medium ${variant}`}>
            {bim}º bimestre: {total.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 10,0
          </div>
        );
      })}
    </div>
  );
}

function createEditableScheme(source: GradeScheme | null, classId: string | null, year: number): EditableScheme {
  const effectiveClassId = source?.classId || classId || '';
  const base = source ?? DEFAULT_SCHEME(effectiveClassId, year);
  const byBimester = BIMESTERS.reduce((acc, bimester) => {
    const entry = base.byBimester?.[bimester] ?? DEFAULT_SCHEME(effectiveClassId, year).byBimester[bimester];
    acc[bimester] = createEditableBimester(effectiveClassId, base.year ?? year, bimester, entry);
    return acc;
  }, {} as Record<Bimestre, EditableBimester>);

  return {
    classId: effectiveClassId,
    year: base.year ?? year,
    byBimester,
  };
}

function createEditableBimester(
  classId: string,
  year: number,
  bimester: Bimestre,
  entry?: GradeSchemeBimester,
): EditableBimester {
  const source = entry ?? DEFAULT_SCHEME(classId, year).byBimester[bimester];
  const items = (source.items ?? []).map((item, index) => ({
    id: item.id || makeId(),
    name: item.name?.trim() || item.label?.trim() || '',
    label: item.label?.trim() || item.name?.trim() || '',
    points: clampPoints(item.points ?? 0),
    pointsText: formatPointsInput(item.points ?? 0),
    type: item.type || 'PROVA',
    color: item.color || DEFAULT_COLOR,
    order: Number.isFinite(item.order) ? Number(item.order) : index,
  }));

  return {
    id: source.id,
    classId: source.classId || classId,
    year: source.year ?? year,
    bimester: source.bimester ?? bimester,
    items: normalizeOrders(items),
    totalPoints: source.totalPoints ?? 0,
    showToStudents: source.showToStudents ?? false,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function toServiceScheme(editable: EditableScheme): GradeScheme {
  return {
    classId: editable.classId,
    year: editable.year,
    byBimester: BIMESTERS.reduce((acc, bimester) => {
      const entry = editable.byBimester[bimester] ?? createEditableBimester(editable.classId, editable.year, bimester);
      const items = (entry.items ?? []).map((item, index) => ({
        id: item.id,
        name: item.name.trim(),
        label: item.label.trim() || item.name.trim(),
        points: clampPoints(parsePoints(item.pointsText)),
        type: item.type || 'PROVA',
        color: item.color || DEFAULT_COLOR,
        order: Number.isFinite(item.order) ? Number(item.order) : index,
      }));
      acc[bimester] = {
        id: entry.id,
        classId: editable.classId,
        year: editable.year,
        bimester,
        items,
        totalPoints: clampPoints(items.reduce((sum, item) => sum + item.points, 0)),
        showToStudents: entry.showToStudents ?? false,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
      return acc;
    }, {} as Record<Bimestre, GradeSchemeBimester>),
  };
}

function normalizeOrders(items: EditableItem[]): EditableItem[] {
  return items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

function parsePoints(value: string): number {
  const normalized = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
}

function clampPoints(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 10) return 10;
  return Number(value.toFixed(1));
}

function formatPointsInput(value: number): string {
  return clampPoints(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

