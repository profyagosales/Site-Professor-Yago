import { useEffect, useMemo, useState } from 'react';
import { Bimester, GradeItem, GradeItemType, GradeScheme } from '@/types/gradeScheme';
import { saveSchemeForProfessor } from '@/services/gradeScheme';

type Props = {
  teacherId: string;
  initial: GradeScheme | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (next: GradeScheme) => void;
};

const TYPES: GradeItemType[] = ['Prova', 'Trabalho', 'Projeto', 'Teste', 'Outros'];
const BIMESTRES: Bimester[] = [1, 2, 3, 4];

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;

function cloneItems(items: GradeScheme | null): GradeScheme {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({ ...item }));
}

export default function DivisaoNotasModal({ teacherId, initial, isOpen, onClose, onSaved }: Props) {
  const [active, setActive] = useState<Bimester>(1);
  const [items, setItems] = useState<GradeScheme>(() => cloneItems(initial));

  useEffect(() => {
    if (isOpen) {
      setActive(1);
      setItems(cloneItems(initial));
    }
  }, [initial, isOpen]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.bimester === active),
    [items, active],
  );

  const totals = useMemo(() => computeTotals(items), [items]);
  const isValid = useMemo(
    () => BIMESTRES.every((b) => Number.isFinite(totals[b]) && Math.abs(totals[b] - 10) < 1e-4),
    [totals],
  );

  const addItem = (bimester: Bimester) => {
    const fresh: GradeItem = {
      id: makeId(),
      name: '',
      type: 'Prova',
      points: 0,
      color: '#F28C2E',
      bimester,
    };
    setItems((prev) => [...prev, fresh]);
  };

  const updateItem = (id: string, patch: Partial<GradeItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const targetBimester = prev[index].bimester;
      const indices = prev
        .map((entry, idx) => ({ entry, idx }))
        .filter(({ entry }) => entry.bimester === targetBimester)
        .map(({ idx }) => idx);
      const position = indices.indexOf(index);
      const nextPosition = position + direction;
      if (nextPosition < 0 || nextPosition >= indices.length) {
        return prev;
      }
      const swapIndex = indices[nextPosition];
      const clone = [...prev];
      [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
      return clone;
    });
  };

  const handleSave = async () => {
    if (!isValid) return;
    try {
      await saveSchemeForProfessor(items, teacherId);
      onSaved(cloneItems(items));
      onClose?.();
    } catch (error) {
      console.error('Falha ao salvar divisão de notas', error);
      window.alert?.('Não foi possível salvar a divisão de notas. Tente novamente.');
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
            items={filteredItems}
            onAdd={() => addItem(active)}
            onRemove={removeItem}
            onMove={moveItem}
            onPatch={updateItem}
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
          <button className="btn btn-primary" disabled={!isValid} onClick={handleSave} type="button">
            Salvar
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
            key={item.id}
            item={item}
            canUp={idx > 0}
            canDown={idx < items.length - 1}
            onRemove={() => onRemove(item.id)}
            onUp={() => onMove(item.id, -1)}
            onDown={() => onMove(item.id, 1)}
            onPatch={(partial) => onPatch(item.id, partial)}
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
          value={item.name}
          onChange={(event) => onPatch({ name: event.target.value })}
          placeholder="Ex.: Prova 1, Trabalho, Projeto..."
        />
      </div>

      <div>
        <label className="label">Pontos</label>
        <input
          className="input w-[110px] text-right"
          inputMode="decimal"
          pattern="[0-9]+([\\.,][0-9]+)?"
          value={String(item.points ?? 0).replace('.', ',')}
          onChange={(event) => {
            const raw = event.target.value.replace(',', '.');
            const next = Number(raw);
            if (Number.isFinite(next)) {
              onPatch({ points: Math.max(0, Math.min(10, next)) });
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
          onChange={(event) => onPatch({ type: event.target.value as GradeItemType })}
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
          value={item.color}
          onChange={(event) => onPatch({ color: event.target.value })}
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

function computeTotals(entries: GradeScheme): Record<Bimester, number> {
  const totals: Record<Bimester, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  entries.forEach((item) => {
    const increment = Number.isFinite(item.points) ? Number(item.points) : 0;
    totals[item.bimester] = Number.parseFloat((totals[item.bimester] + increment).toFixed(2));
  });
  return totals;
}
