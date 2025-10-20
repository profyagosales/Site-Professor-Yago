import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DEFAULT_SCHEME, saveGradeScheme } from '@/services/gradeScheme';
import type { GradeItem, GradeScheme, Bimestre } from '@/services/gradeScheme';

type Props = {
  ano: number;
  initial: GradeScheme | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const TYPES: GradeItem['tipo'][] = ['Prova', 'Trabalho', 'Projeto', 'Teste', 'Outros'];
const BIMESTRES: Bimestre[] = [1, 2, 3, 4];
const DEFAULT_ITEM_COLOR = '#F28C2E';

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;

function cloneScheme(source: GradeScheme | null, ano: number): GradeScheme {
  const base = source ?? DEFAULT_SCHEME(ano);
  const itensPorBimestre: GradeScheme['itensPorBimestre'] = { 1: [], 2: [], 3: [], 4: [] };
  for (const b of BIMESTRES) {
    const itens = Array.isArray(base.itensPorBimestre[b]) ? base.itensPorBimestre[b] : [];
    itensPorBimestre[b] = itens.map((item) => ({
      id: item.id ?? makeId(),
      nome: item.nome ?? '',
      tipo: item.tipo ?? 'Outros',
      pontos: Number.isFinite(item.pontos) ? Number(item.pontos) : 0,
      cor: item.cor ?? DEFAULT_ITEM_COLOR,
    }));
  }
  return { ano: base.ano ?? ano, itensPorBimestre };
}

export default function DivisaoNotasModal({ ano, initial, isOpen, onClose, onSaved }: Props) {
  const [active, setActive] = useState<Bimestre>(1);
  const [saving, setSaving] = useState(false);
  const [localScheme, setLocalScheme] = useState<GradeScheme>(() => cloneScheme(initial, ano));

  useEffect(() => {
    if (isOpen) {
      setActive(1);
      setLocalScheme(cloneScheme(initial, ano));
    }
  }, [ano, initial, isOpen]);

  const itens = useMemo(() => localScheme.itensPorBimestre[active] ?? [], [localScheme, active]);

  const totals = useMemo(() => computeTotals(localScheme), [localScheme]);
  const isValid = useMemo(
    () => BIMESTRES.every((b) => Number.isFinite(totals[b]) && Math.abs(totals[b] - 10) < 1e-4),
    [totals],
  );

  const updateItems = (b: Bimestre, recipe: (items: GradeItem[]) => GradeItem[]) => {
    setLocalScheme((prev) => ({
      ...prev,
      itensPorBimestre: {
        ...prev.itensPorBimestre,
        [b]: recipe(prev.itensPorBimestre[b] ?? []),
      },
    }));
  };

  const addItem = (bimester: Bimestre) => {
    const fresh: GradeItem = {
      id: makeId(),
      nome: '',
      tipo: 'Prova',
      pontos: 0,
      cor: DEFAULT_ITEM_COLOR,
    };
    updateItems(bimester, (prev) => [...prev, fresh]);
  };

  const updateItem = (bimester: Bimestre, id: string, patch: Partial<GradeItem>) => {
    updateItems(bimester, (prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, id } : item)),
    );
  };

  const removeItem = (bimester: Bimestre, id: string) => {
    updateItems(bimester, (prev) => prev.filter((item) => item.id !== id));
  };

  const moveItem = (bimester: Bimestre, id: string, direction: -1 | 1) => {
    updateItems(bimester, (prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const clone = [...prev];
      [clone[index], clone[nextIndex]] = [clone[nextIndex], clone[index]];
      return clone;
    });
  };

  const handleSave = async () => {
    if (!isValid) return;
    try {
      setSaving(true);
      await saveGradeScheme(localScheme);
      onSaved?.(); // refetch no card
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar divisão de notas.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>Configurar divisão de notas</h3>
          <button className="btn btn-outline" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        <div className="modal-body">
          <div className="mb-3">
            <span className="text-sm text-foreground/70 mr-2">Bimestre para edição</span>
            <div className="inline-flex rounded-full bg-muted p-1">
              {BIMESTRES.map((b) => (
                <button
                  key={b}
                  className={cnForBimesterButton(b === active)}
                  onClick={() => setActive(b)}
                  type="button"
                >
                  {b}º
                </button>
              ))}
            </div>
          </div>

          <ItemList
            items={itens}
            onAdd={() => addItem(active)}
            onRemove={(id) => removeItem(active, id)}
            onMove={(id, dir) => moveItem(active, id, dir)}
            onPatch={(id, partial) => updateItem(active, id, partial)}
          />

          <div className="grid grid-cols-4 gap-3 mt-4 text-sm">
            {BIMESTRES.map((b) => {
              const total = totals[b];
              const ok = Math.abs(total - 10) < 0.0001;
              return (
                <div
                  key={b}
                  className={`rounded px-3 py-2 text-sm ${ok ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}
                >
                  {b}º: {total.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 10,0
                </div>
              );
            })}
          </div>
        </div>

        <footer className="modal-footer flex justify-end gap-3 mt-4">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!isValid || saving} onClick={handleSave} type="button">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function cnForBimesterButton(active: boolean) {
  return `px-3 py-1 text-sm rounded-full ${active ? 'bg-brand text-white' : 'hover:bg-foreground/5'}`;
}

function ItemList({
  items,
  onAdd,
  onRemove,
  onMove,
  onPatch,
}: {
  items: GradeItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onPatch: (id: string, p: Partial<GradeItem>) => void;
}) {
  return (
    <div>
      {!items.length && (
        <p className="text-foreground/60 mb-3">Nenhum item cadastrado. Adicione um item para começar.</p>
      )}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <ItemRow
            key={item.id ?? `item-${idx}`}
            item={item}
            canUp={idx > 0}
            canDown={idx < items.length - 1}
            onRemove={() => {
              if (item.id) onRemove(item.id);
            }}
            onUp={() => {
              if (item.id) onMove(item.id, -1);
            }}
            onDown={() => {
              if (item.id) onMove(item.id, 1);
            }}
            onPatch={(partial) => {
              if (item.id) onPatch(item.id, partial);
            }}
          />
        ))}
      </div>
      <button className="btn btn-outline mt-3" onClick={onAdd} type="button">
        Adicionar item
      </button>
    </div>
  );
}

function ItemRow({
  item,
  canUp,
  canDown,
  onRemove,
  onUp,
  onDown,
  onPatch,
}: {
  item: GradeItem;
  canUp: boolean;
  canDown: boolean;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  onPatch: (p: Partial<GradeItem>) => void;
}) {
  return (
    <div className="rounded-xl border p-3 flex flex-wrap items-center gap-3">
      <div className="grow min-w-[200px]">
        <label className="label">Nome do item</label>
        <input
          className="input w-full"
          value={item.nome}
          onChange={(event) => onPatch({ nome: event.target.value })}
          placeholder="Ex.: Prova 1, Trabalho, Projeto..."
        />
      </div>

      <div>
        <label className="label">Pontos</label>
        <input
          className="input w-[110px] text-right"
          inputMode="decimal"
          pattern="[0-9]+([\\.,][0-9]+)?"
          value={String(item.pontos ?? 0).replace('.', ',')}
          onChange={(event) => {
            const raw = event.target.value.replace(',', '.');
            const next = Number(raw);
            if (Number.isFinite(next)) {
              onPatch({ pontos: Math.max(0, Math.min(10, next)) });
            }
          }}
          placeholder="0,0"
        />
      </div>

      <div>
        <label className="label">Tipo</label>
        <select
          className="input"
          value={item.tipo}
          onChange={(event) => onPatch({ tipo: event.target.value as GradeItem['tipo'] })}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Cor</label>
        <input
          type="color"
          className="h-10 w-16 p-0 border rounded"
          value={item.cor ?? DEFAULT_ITEM_COLOR}
          onChange={(event) => onPatch({ cor: event.target.value })}
          aria-label="Selecionar cor"
        />
      </div>

      <div className="ml-auto flex gap-2">
        <button className="icon-btn" disabled={!canUp} onClick={onUp} title="Mover para cima" type="button">
          ↑
        </button>
        <button className="icon-btn" disabled={!canDown} onClick={onDown} title="Mover para baixo" type="button">
          ↓
        </button>
        <button className="icon-btn danger" onClick={onRemove} title="Remover" type="button">
          ✕
        </button>
      </div>
    </div>
  );
}

function computeTotals(scheme: GradeScheme): Record<Bimestre, number> {
  const totals: Record<Bimestre, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const b of BIMESTRES) {
    const itens = scheme.itensPorBimestre[b] ?? [];
    totals[b] = itens.reduce((sum, item) => sum + (Number.isFinite(item.pontos) ? Number(item.pontos) : 0), 0);
  }
  return totals;
}
