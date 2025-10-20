import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
import { fetchProfessorClasses, type ProfessorClass } from '@/services/classes';
import {
  createAgendaItem,
  deleteAgendaItem,
  updateAgendaItem,
  type AgendaItemPayload,
  type AgendaItemType,
} from '@/services/agenda';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';

type AgendaEditorItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  classId: string;
  className: string;
  type: AgendaItemType;
  isNew?: boolean;
};

type AgendaEditorModalProps = {
  open: boolean;
  onClose: () => void;
  initialItems: AgendaEditorItem[];
  onSaved?: () => void;
};

type ClassOption = {
  id: string;
  label: string;
};

type DraftError = {
  title?: string;
  date?: string;
};

const TYPE_OPTIONS: Array<{ value: AgendaItemType; label: string }> = [
  { value: 'ATIVIDADE', label: 'Atividade' },
  { value: 'CONTEUDO', label: 'Conteúdo' },
  { value: 'DATA', label: 'Data' },
];

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function resolveClassId(entry: ProfessorClass): string {
  if (!entry) return '';
  if (typeof (entry as any)._id === 'string') return String((entry as any)._id);
  if (typeof entry.id === 'string') return entry.id;
  if (typeof (entry as any).classId === 'string') return String((entry as any).classId);
  return '';
}

function resolveClassLabel(entry: ProfessorClass): string {
  if (!entry) return 'Turma';
  if (entry.name) return String(entry.name);
  if ((entry as any).nome) return String((entry as any).nome);
  const grade = [entry.series, entry.letter].filter(Boolean).join('');
  const discipline = entry.discipline || (entry as any).disciplina || '';
  const base = grade ? `Turma ${grade}` : '';
  return [base, discipline].filter(Boolean).join(' - ') || 'Turma';
}

function toDateInputValue(value: string): string {
  if (!value) return '';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function normalizeInitialItems(items: AgendaEditorItem[] | undefined | null): AgendaEditorItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({
    id: item.id,
    title: coerceString(item.title).trim(),
    description: coerceString(item.description ?? '').trim(),
    date: toDateInputValue(item.date),
    classId: coerceString(item.classId ?? ''),
    className: coerceString(item.className ?? ''),
    type: item.type ?? 'CONTEUDO',
  }));
}

function buildPayload(item: AgendaEditorItem): AgendaItemPayload {
  return {
    title: item.title.trim(),
    description: item.description.trim() ? item.description.trim() : null,
    date: item.date,
    classId: item.classId ? item.classId : null,
    type: item.type,
  };
}

export default function AgendaEditorModal({ open, onClose, initialItems, onSaved }: AgendaEditorModalProps) {
  const [items, setItems] = useState<AgendaEditorItem[]>([]);
  const [errors, setErrors] = useState<Record<string, DraftError>>({});
  const [saving, setSaving] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems(normalizeInitialItems(initialItems));
    setErrors({});
    setSaving(false);
  }, [open, initialItems]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoadingClasses(true);
    fetchProfessorClasses()
      .then((classes) => {
        if (cancelled) return;
        const options = (classes ?? [])
          .map((cls) => {
            const id = resolveClassId(cls);
            if (!id) return null;
            return { id, label: resolveClassLabel(cls) } satisfies ClassOption;
          })
          .filter(Boolean) as ClassOption[];
        setClassOptions(options);
      })
      .catch((err) => {
        console.error('[AgendaEditorModal] Falha ao carregar turmas', err);
        if (!cancelled) {
          toast.error('Não foi possível carregar as turmas.');
          setClassOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingClasses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const validate = (item: AgendaEditorItem): DraftError => {
    const itemErrors: DraftError = {};
    if (!item.title.trim()) {
      itemErrors.title = 'Informe um título';
    }
    if (!item.date) {
      itemErrors.date = 'Informe a data';
    }
    return itemErrors;
  };

  const setItemField = (id: string, field: keyof AgendaEditorItem, value: string | AgendaItemType) => {
    setItems((prev) => {
      let snapshot: AgendaEditorItem | null = null;
      const next = prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        snapshot = { ...item, [field]: value } as AgendaEditorItem;
        return snapshot;
      });

      if (snapshot) {
        setErrors((prevErrors) => {
          const nextErrors = { ...prevErrors };
          const validation = validate(snapshot as AgendaEditorItem);
          if (validation.title || validation.date) {
            nextErrors[id] = validation;
          } else {
            delete nextErrors[id];
          }
          return nextErrors;
        });
      }

      return next;
    });
  };

  const handleAddItem = () => {
    const timestamp = Date.now();
    const newId = `new-${timestamp}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        title: '',
        description: '',
        date: '',
        classId: '',
        className: '',
        type: 'ATIVIDADE',
        isNew: true,
      },
    ]);
    setFocusedId(newId);
  };

  const handleDelete = async (item: AgendaEditorItem) => {
    if (saving) return;
    const question = item.title ? `Remover "${item.title}" da agenda?` : 'Remover item da agenda?';
    if (typeof window !== 'undefined' && !window.confirm(question)) {
      return;
    }

    if (item.isNew) {
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    try {
      await deleteAgendaItem(item.id);
      toast.success('Item removido.');
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      onSaved?.();
    } catch (err) {
      console.error('[AgendaEditorModal] Falha ao excluir item', err);
      toast.error('Não foi possível excluir o item da agenda.');
    }
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const allErrors: Record<string, DraftError> = {};
    items.forEach((item) => {
      const validation = validate(item);
      if (validation.title || validation.date) {
        allErrors[item.id] = validation;
      }
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast.error('Revise os campos destacados antes de salvar.');
      return;
    }

    const creations = items.filter((item) => item.isNew);
    const updates = items.filter((item) => !item.isNew);

    if (!creations.length && !updates.length) {
      toast.info('Nenhuma alteração para salvar.');
      onClose();
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ...creations.map((item) => createAgendaItem(buildPayload(item))),
        ...updates.map((item) => updateAgendaItem(item.id, buildPayload(item))),
      ]);

      toast.success('Agenda atualizada.');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('[AgendaEditorModal] Falha ao salvar agenda', err);
      toast.error('Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const optionsById = useMemo(() => {
    const map = new Map<string, ClassOption>();
    classOptions.forEach((option) => {
      map.set(option.id, option);
    });
    return map;
  }, [classOptions]);

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} className="max-w-4xl">
      <div className="flex max-h-[70vh] flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Editar agenda</h2>
              <p className="text-sm text-slate-500">Gerencie títulos, datas, turmas e tipos das atividades agendadas.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddItem} disabled={saving}>
              <FiPlus className="h-4 w-4" aria-hidden />
              Adicionar item
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum item na agenda. Adicione o primeiro item para começar.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const itemErrors = errors[item.id] ?? {};
                const classOption = item.classId ? optionsById.get(item.classId) : undefined;
                return (
                  <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">
                          {item.title || 'Item da agenda'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFocusedId(item.id)}
                          >
                            <FiEdit2 className="h-4 w-4" aria-hidden />
                            Focar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDelete(item)}
                            disabled={saving}
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden />
                            Excluir
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-sm font-medium text-slate-700">
                          <span>Título</span>
                          <input
                            key={focusedId === item.id ? `${item.id}-focus` : item.id}
                            type="text"
                            className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                              itemErrors.title ? 'border-red-400' : 'border-slate-200'
                            }`}
                            value={item.title}
                            onChange={(event) => setItemField(item.id, 'title', event.target.value)}
                            autoFocus={focusedId === item.id}
                          />
                          {itemErrors.title ? (
                            <span className="text-xs text-red-500">{itemErrors.title}</span>
                          ) : null}
                        </label>
                        <label className="space-y-1 text-sm font-medium text-slate-700">
                          <span>Data</span>
                          <input
                            type="date"
                            className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                              itemErrors.date ? 'border-red-400' : 'border-slate-200'
                            }`}
                            value={item.date}
                            onChange={(event) => setItemField(item.id, 'date', event.target.value)}
                          />
                          {itemErrors.date ? <span className="text-xs text-red-500">{itemErrors.date}</span> : null}
                        </label>
                      </div>

                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>Descrição</span>
                        <textarea
                          className="w-full min-h-[4rem] rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                          value={item.description}
                          onChange={(event) => setItemField(item.id, 'description', event.target.value)}
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-sm font-medium text-slate-700">
                          <span>Turma</span>
                          <select
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                            value={item.classId}
                            onChange={(event) => {
                              const nextId = event.target.value;
                              setItemField(item.id, 'classId', nextId);
                              const option = classOptions.find((opt) => opt.id === nextId);
                              if (option) {
                                setItems((prev) =>
                                  prev.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, classId: nextId, className: option.label }
                                      : entry,
                                  ),
                                );
                              }
                            }}
                            disabled={loadingClasses}
                          >
                            <option value="">Sem turma específica</option>
                            {classOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                            {item.classId && !classOption ? (
                              <option value={item.classId}>{item.className || 'Turma'}</option>
                            ) : null}
                          </select>
                        </label>
                        <fieldset className="space-y-1 text-sm font-medium text-slate-700">
                          <legend className="text-sm font-medium text-slate-700">Tipo</legend>
                          <div className="flex flex-wrap gap-2">
                            {TYPE_OPTIONS.map((option) => {
                              const active = item.type === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                    active
                                      ? 'bg-orange-100 text-orange-700 shadow-sm'
                                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                  }`}
                                  onClick={() => setItemField(item.id, 'type', option.value)}
                                  aria-pressed={active}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

