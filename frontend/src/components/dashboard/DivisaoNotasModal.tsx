import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Bimester, GradeItem, GradeItemType, GradeSchemeByBimester } from '@/types/gradeScheme';
import { saveSchemeForProfessor } from '@/services/gradeScheme';

type Props = {
  teacherId: string;
  initial: GradeSchemeByBimester | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (next: GradeSchemeByBimester) => void;
};

const TYPES: GradeItemType[] = ['Prova', 'Trabalho', 'Projeto', 'Teste', 'Outros'];
const BIMESTRES: Bimester[] = [1, 2, 3, 4];

function createEmptyScheme(): GradeSchemeByBimester {
  return { 1: [], 2: [], 3: [], 4: [] };
}

function cloneScheme(data: GradeSchemeByBimester | null): GradeSchemeByBimester {
  const source = data ?? createEmptyScheme();
  return {
    1: [...(source[1] ?? [])].map((item) => ({ ...item })),
    2: [...(source[2] ?? [])].map((item) => ({ ...item })),
    3: [...(source[3] ?? [])].map((item) => ({ ...item })),
    4: [...(source[4] ?? [])].map((item) => ({ ...item })),
  };
}

export default function DivisaoNotasModal({ teacherId, initial, isOpen, onClose, onSaved }: Props) {
  const [active, setActive] = useState<Bimester>(1);
  const [data, setData] = useState<GradeSchemeByBimester>(() => cloneScheme(initial));

  useEffect(() => {
    if (isOpen) {
      setActive(1);
      setData(cloneScheme(initial));
    }
  }, [initial, isOpen]);

  const totals = useMemo(() => computeTotals(data), [data]);
  const valid = useMemo(
    () => BIMESTRES.every((b) => Number.isFinite(totals[b]) && Math.abs(totals[b] - 10) < 1e-6),
    [totals],
  );

  function addItem() {
    const fresh: GradeItem = {
      id: uuid(),
      name: '',
      points: 0,
      type: 'Prova',
      color: '#F28C28',
    };
    setData((prev) => ({ ...prev, [active]: [...prev[active], fresh] }));
  }

  function removeItem(id: string) {
    setData((prev) => ({ ...prev, [active]: prev[active].filter((item) => item.id !== id) }));
  }

  function move(id: string, dir: -1 | 1) {
    setData((prev) => {
      const arr = [...prev[active]];
      const index = arr.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const targetIndex = Math.max(0, Math.min(arr.length - 1, index + dir));
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return { ...prev, [active]: arr };
    });
  }

  function patch(id: string, partial: Partial<GradeItem>) {
    setData((prev) => ({
      ...prev,
      [active]: prev[active].map((item) => (item.id === id ? { ...item, ...partial } : item)),
    }));
  }

  async function save() {
    try {
      await saveSchemeForProfessor(teacherId, data);
      onSaved(cloneScheme(data));
      onClose();
    } catch (error) {
      console.error('Falha ao salvar divisão de notas', error);
      window.alert?.('Não foi possível salvar a divisão de notas. Tente novamente.');
    }
  }

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

          <ItemList items={data[active]} onAdd={addItem} onRemove={removeItem} onMove={move} onPatch={patch} />

          <div className="mt-4 text-sm">
            <strong>Totais</strong>
            <ul className="mt-1 grid grid-cols-4 gap-2">
              {BIMESTRES.map((b) => (
                <li
                  key={b}
                  className={`rounded-md px-2 py-1 text-center ${
                    Math.abs(totals[b] - 10) < 1e-6 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {b}º: {totals[b].toFixed(1)} / 10,0
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={save} type="button">
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
  const [name, setName] = useState(item.name ?? '');
  const [pointsStr, setPointsStr] = useState(
    (Number.isFinite(item.points) ? item.points.toFixed(1) : '').replace('.', ','),
  );

  useEffect(() => {
    setName(item.name ?? '');
  }, [item.id, item.name]);

  useEffect(() => {
    const formatted = (Number.isFinite(item.points) ? item.points.toFixed(1) : '').replace('.', ',');
    setPointsStr(formatted);
  }, [item.id, item.points]);

  function onPointsBlur() {
    let s = (pointsStr || '').trim().replace(',', '.');
    let n = Number.parseFloat(s);
    if (!Number.isFinite(n)) n = 0;
    n = Math.max(0, Math.min(10, Math.round(n * 10) / 10));
    onPatch({ points: n });
    setPointsStr(n.toFixed(1).replace('.', ','));
  }

  function onNameBlur() {
    const trimmed = name.trim();
    setName(trimmed);
    onPatch({ name: trimmed });
  }

  return (
    <div className="rounded-xl border p-3 flex flex-wrap items-center gap-3">
      <div className="grow min-w-[200px]">
        <label className="label">Nome do item</label>
        <input
          className="input w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={onNameBlur}
          placeholder="Ex.: Prova 1, Trabalho, Projeto…"
        />
      </div>

      <div>
        <label className="label">Pontos</label>
        <input
          className="input w-[110px] text-right"
          inputMode="decimal"
          value={pointsStr}
          onChange={(event) => setPointsStr(event.target.value)}
          onBlur={onPointsBlur}
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
          className="input h-[40px] w-[80px] p-1"
          value={item.color}
          onChange={(event) => onPatch({ color: event.target.value })}
        />
      </div>

      <div className="ml-auto flex gap-1">
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

function computeTotals(d: GradeSchemeByBimester): Record<Bimester, number> {
  return { 1: sum(d[1]), 2: sum(d[2]), 3: sum(d[3]), 4: sum(d[4]) };
}

function sum(arr: GradeItem[] | undefined) {
  return (arr ?? []).reduce((acc, item) => acc + (item.points || 0), 0);
}
