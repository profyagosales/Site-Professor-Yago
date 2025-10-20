import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
import { fetchProfessorClasses, type ProfessorClass } from '@/services/classes';
import { deleteAgenda, updateAgenda, type AgendaUpdatePayload } from '@/services/agenda';

type AgendaItemType = 'ATIVIDADE' | 'CONTEUDO' | 'DATA';

type AgendaModalItem = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  classId: string | null;
  className: string | null;
  type: AgendaItemType;
};

type EditAgendaModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: AgendaModalItem[];
  onUpdated?: () => void;
};

type AgendaDraft = {
  title: string;
  description: string;
  date: string;
  classId: string;
  className: string;
  type: AgendaItemType;
};

type EditableAgendaItem = {
  id: string;
  draft: AgendaDraft;
  original: AgendaDraft;
  dirty: boolean;
};

type DraftErrors = {
  title?: string;
  date?: string;
};

type ClassOption = {
  id: string;
  label: string;
};

const TYPE_OPTIONS: Array<{ value: AgendaItemType; label: string }> = [
  { value: 'ATIVIDADE', label: 'Atividade' },
  { value: 'CONTEUDO', label: 'Conteúdo' },
  { value: 'DATA', label: 'Data' },
];

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  try {
    const parsed = typeof value === 'string' ? new Date(value) : value;
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().slice(0, 10);
  } catch (err) {
    console.warn('[EditAgendaModal] Data inválida recebida', value, err);
    return '';
  }
}

function hasChanges(a: AgendaDraft, b: AgendaDraft): boolean {
  return (
    a.title !== b.title ||
    a.description !== b.description ||
    a.date !== b.date ||
    a.classId !== b.classId ||
    a.type !== b.type
  );
}

function validateDraft(draft: AgendaDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) {
    errors.title = 'Informe um título';
  }
  if (draft.type !== 'CONTEUDO' && !draft.date) {
    errors.date = 'Informe a data';
  }
  return errors;
}

function resolveClassId(cls: ProfessorClass): string {
  const id = cls.id ?? cls._id ?? (cls as any).classId;
  return id ? String(id) : '';
}

function formatClassLabel(cls: ProfessorClass): string {
  const name = cls.name ?? (cls as any).nome;
  if (name) return String(name);
  const grade = [cls.series, cls.letter].filter(Boolean).join('');
  const discipline = cls.discipline ?? cls.disciplina;
  return [grade ? `Turma ${grade}` : null, discipline].filter(Boolean).join(' - ') || 'Turma';
}

export default function EditAgendaModal({ isOpen, onOpenChange, items, onUpdated }: EditAgendaModalProps) {
  const [entries, setEntries] = useState<EditableAgendaItem[]>([]);
  const [errors, setErrors] = useState<Record<string, DraftErrors>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const focusRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    focusRefs.current = {};

    const nextEntries = (items ?? []).map((item) => {
      const draft: AgendaDraft = {
        title: item.title ?? '',
        description: item.description ?? '',
        date: toDateInputValue(item.date),
        classId: item.classId ?? '',
        className: item.className ?? '',
        type: item.type ?? 'CONTEUDO',
      };
      return {
        id: item.id,
        draft,
        original: { ...draft },
        dirty: false,
      } satisfies EditableAgendaItem;
    });

    setEntries(nextEntries);
    setErrors({});
    setSaving(false);
    setDeletingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setClassesLoading(true);

    fetchProfessorClasses()
      .then((classes) => {
        if (cancelled) return;
        const options = (classes ?? [])
          .map((cls) => {
            const id = resolveClassId(cls);
            if (!id) return null;
            return { id, label: formatClassLabel(cls) } satisfies ClassOption;
          })
          .filter(Boolean) as ClassOption[];
        setClassOptions(options);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[EditAgendaModal] Falha ao carregar turmas', err);
        toast.error('Não foi possível carregar as turmas.');
        setClassOptions([]);
      })
      .finally(() => {
        if (!cancelled) {
          setClassesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const hasChanges = useMemo(() => entries.some((item) => item.dirty), [entries]);

  const handleRequestClose = () => {
    if (saving || deletingId) {
      return;
    }
    onOpenChange(false);
  };

  const updateDraft = (id: string, partial: Partial<AgendaDraft>) => {
    let nextDraftSnapshot: AgendaDraft | null = null;
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const nextDraft = { ...item.draft, ...partial };
        nextDraftSnapshot = nextDraft;
        return {
          ...item,
          draft: nextDraft,
          dirty: hasChanges(nextDraft, item.original),
        };
      })
    );

    if (nextDraftSnapshot) {
      setErrors((prev) => {
        const next = { ...prev };
        const validation = validateDraft(nextDraftSnapshot as AgendaDraft);
        if (validation.title || validation.date) {
          next[id] = validation;
        } else {
          delete next[id];
        }
        return next;
      });
    }
  };

  const handleFocus = (id: string) => {
    const node = focusRefs.current[id];
    if (node) {
      node.focus();
      node.select?.();
    }
  };

  const handleDelete = async (item: EditableAgendaItem) => {
    if (deletingId || saving) {
      return;
    }
    const question = item.draft.title ? `Deseja excluir "${item.draft.title}" da agenda?` : 'Deseja excluir este item da agenda?';
    if (typeof window !== 'undefined' && !window.confirm(question)) {
      return;
    }

    setDeletingId(item.id);
    try {
      await deleteAgenda(item.id);
      toast.success('Item removido da agenda.');
      setEntries((prev) => prev.filter((entry) => entry.id !== item.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      delete focusRefs.current[item.id];
      onUpdated?.();
    } catch (err) {
      console.error('[EditAgendaModal] Falha ao excluir item da agenda', err);
      const message = err instanceof Error && err.message ? err.message : 'Não foi possível excluir o item.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    const dirtyItems = entries.filter((item) => item.dirty);

    if (!dirtyItems.length) {
      toast.info('Nenhuma alteração para salvar.');
      onOpenChange(false);
      return;
    }

    const pendingErrors = new Map<string, DraftErrors>();
    dirtyItems.forEach((item) => {
      const validation = validateDraft(item.draft);
      if (validation.title || validation.date) {
        pendingErrors.set(item.id, validation);
      }
    });

    if (pendingErrors.size > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        dirtyItems.forEach((item) => {
          if (pendingErrors.has(item.id)) {
            next[item.id] = pendingErrors.get(item.id)!;
          } else {
            delete next[item.id];
          }
        });
        return next;
      });
      toast.error('Corrija os campos destacados antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        dirtyItems.map((item) => {
          const payload: AgendaUpdatePayload = {};
          const trimmedTitle = item.draft.title.trim();
          if (item.draft.title !== item.original.title) {
            payload.title = trimmedTitle;
          }
          if (item.draft.description !== item.original.description) {
            const trimmedDescription = item.draft.description.trim();
            payload.description = trimmedDescription ? trimmedDescription : null;
          }
          if (item.draft.date !== item.original.date) {
            payload.date = item.draft.date ? item.draft.date : null;
          }
          if (item.draft.classId !== item.original.classId) {
            payload.classId = item.draft.classId ? item.draft.classId : null;
          }
          if (item.draft.type !== item.original.type) {
            payload.type = item.draft.type;
          }
          if (Object.keys(payload).length === 0) {
            return Promise.resolve();
          }
          return updateAgenda(item.id, payload);
        })
      );

      toast.success('Agenda atualizada com sucesso.');
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error('[EditAgendaModal] Falha ao atualizar agenda', err);
      const message = err instanceof Error && err.message ? err.message : 'Não foi possível salvar as alterações.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderClassOptions = (current: EditableAgendaItem): ClassOption[] => {
    const options = classOptions;
    if (!current.draft.classId) {
      return options;
    }
    const exists = options.some((option) => option.id === current.draft.classId);
    if (exists) {
      return options;
    }
    return [
      ...options,
      {
        id: current.draft.classId,
        label: current.draft.className || 'Turma atual',
      },
    ];
  };

  return (
    <Modal open={isOpen} onClose={handleRequestClose} className="max-w-5xl">
      <div className="flex max-h-[85vh] flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Editar agenda</h2>
          <p className="mt-1 text-sm text-slate-500">Atualize títulos, datas, turmas e tipos das entradas selecionadas.</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: '70vh' }}>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum item disponível para o período selecionado.</p>
          ) : (
            <div className="space-y-6">
              {entries.map((item) => {
                const itemErrors = errors[item.id] ?? {};
                const options = renderClassOptions(item);
                const typeButtons = TYPE_OPTIONS;
                return (
                  <section
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    aria-labelledby={`agenda-item-${item.id}`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label htmlFor={`agenda-title-${item.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                              Título
                            </label>
                            <input
                              id={`agenda-title-${item.id}`}
                              ref={(node) => {
                                focusRefs.current[item.id] = node;
                              }}
                              type="text"
                              value={item.draft.title}
                              onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                              className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                                itemErrors.title ? 'border-red-400' : 'border-slate-200'
                              }`}
                              placeholder="Título da atividade"
                            />
                            {itemErrors.title ? (
                              <p className="mt-1 text-xs text-red-500">{itemErrors.title}</p>
                            ) : null}
                          </div>

                          <div>
                            <label htmlFor={`agenda-description-${item.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                              Descrição
                            </label>
                            <textarea
                              id={`agenda-description-${item.id}`}
                              value={item.draft.description}
                              onChange={(event) => updateDraft(item.id, { description: event.target.value })}
                              className="w-full min-h-[4rem] rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label htmlFor={`agenda-date-${item.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                                Data
                              </label>
                              <input
                                id={`agenda-date-${item.id}`}
                                type="date"
                                value={item.draft.date}
                                onChange={(event) => updateDraft(item.id, { date: event.target.value })}
                                className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                                  itemErrors.date ? 'border-red-400' : 'border-slate-200'
                                }`}
                              />
                              {itemErrors.date ? (
                                <p className="mt-1 text-xs text-red-500">{itemErrors.date}</p>
                              ) : null}
                            </div>
                            <div>
                              <label htmlFor={`agenda-class-${item.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                                Turma
                              </label>
                              <select
                                id={`agenda-class-${item.id}`}
                                value={item.draft.classId}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  const option = options.find((opt) => opt.id === value);
                                  updateDraft(item.id, { classId: value, className: option?.label ?? '' });
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                                disabled={classesLoading}
                              >
                                <option value="">Sem turma específica</option>
                                {options.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="mb-1 block text-sm font-medium text-slate-700">Tipo</span>
                            <div className="flex flex-wrap gap-2">
                              {typeButtons.map((option) => {
                                const active = item.draft.type === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => updateDraft(item.id, { type: option.value })}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                      active
                                        ? 'bg-orange-100 text-orange-700 shadow-sm'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                    }`}
                                    aria-pressed={active}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleFocus(item.id)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                            title="Focar campos deste item"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                            disabled={deletingId === item.id || saving}
                            title="Excluir este item"
                          >
                            {deletingId === item.id ? '...' : '🗑'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleRequestClose} disabled={saving || deletingId !== null}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || deletingId !== null || !hasChanges}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
