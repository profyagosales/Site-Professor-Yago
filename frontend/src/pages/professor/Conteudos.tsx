import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Table, Th, Td } from '@/components/ui/Table';
import type { ContentItem } from '@/types/school';
import {
  listContents,
  toggleContentStatus,
  updateContent,
  deleteContent,
} from '@/services/contents';

const BIMESTERS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

type BimesterFilter = 'all' | 1 | 2 | 3 | 4;
type StatusFilter = 'all' | 'pending' | 'done';

type FormState = {
  title: string;
  description: string;
  date: string;
  bimester: string;
  done: boolean;
  className: string;
};

function formatDateLabel(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Data não disponível';
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    console.warn('Falha ao formatar data do conteúdo', error);
    return 'Data não disponível';
  }
}

function notifyContentsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('contents:refresh'));
  }
}

export default function ConteudosPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bimesterFilter, setBimesterFilter] = useState<BimesterFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listContents({
          bimester: bimesterFilter === 'all' ? undefined : bimesterFilter,
          done: statusFilter === 'all' ? undefined : statusFilter === 'done',
          limit: 200,
          sort: 'desc',
        });
        if (cancelled) return;
        setItems(response.items);
      } catch (err) {
        console.error('[ConteudosPage] Falha ao carregar conteúdos', err);
        if (!cancelled) {
          setItems([]);
          const message = err instanceof Error ? err.message : 'Não foi possível carregar os conteúdos.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [bimesterFilter, statusFilter, refreshToken]);

  const filteredItems = useMemo(() => {
    return [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [items]);

  const handleRefresh = () => {
    setRefreshToken((token) => token + 1);
  };

  const handleToggle = async (content: ContentItem) => {
    try {
      const updated = await toggleContentStatus(content.id, !content.done);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notifyContentsRefresh();
    } catch (err) {
      console.error('[ConteudosPage] Falha ao alternar status', err);
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar o conteúdo.';
      toast.error(message);
    }
  };

  const openEditModal = (content: ContentItem) => {
    setEditingContent(content);
    setFormState({
      title: content.title,
      description: content.description ?? '',
      date: content.date ? content.date.slice(0, 10) : '',
      bimester: String(content.bimester),
      done: Boolean(content.done),
      className: content.className || 'Turma',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingContent(null);
    setFormState(null);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingContent || !formState) return;
    setSaving(true);
    try {
      const payload = {
        title: formState.title.trim(),
        description: formState.description.trim() ? formState.description.trim() : null,
        date: formState.date,
        bimester: Number(formState.bimester),
        done: formState.done,
      };
      const updated = await updateContent(editingContent.id, payload);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success('Conteúdo atualizado com sucesso');
      notifyContentsRefresh();
      closeForm();
    } catch (err) {
      console.error('[ConteudosPage] Falha ao atualizar conteúdo', err);
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar o conteúdo.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (content: ContentItem) => {
    setDeleteTarget(content);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContent(deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success('Conteúdo removido');
      notifyContentsRefresh();
      setDeleteTarget(null);
    } catch (err) {
      console.error('[ConteudosPage] Falha ao remover conteúdo', err);
      const message = err instanceof Error ? err.message : 'Não foi possível remover o conteúdo.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ys-ink">Conteúdos planejados</h1>
          <p className="text-sm text-ys-graphite">Acompanhe os conteúdos registrados por turma.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Bimestre
            <select
              value={String(bimesterFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setBimesterFilter(value === 'all' ? 'all' : (Number(value) as BimesterFilter));
              }}
              className="rounded-xl border border-ys-line bg-white px-3 py-1.5 text-sm text-ys-ink shadow-sm focus:border-ys-amber focus:outline-none"
            >
              <option value="all">Todos</option>
              {BIMESTERS.map((bimester) => (
                <option key={bimester} value={bimester}>
                  {bimester}º bimestre
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-ys-line bg-white px-3 py-1.5 text-sm text-ys-ink shadow-sm focus:border-ys-amber focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="done">Concluídos</option>
            </select>
          </label>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-40 w-full animate-pulse rounded-2xl bg-ys-bg" aria-hidden />
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-ys-graphite">
            Nenhum conteúdo encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Conteúdo</Th>
                  <Th>Turma</Th>
                  <Th>Bimestre</Th>
                  <Th>Data</Th>
                  <Th>Status</Th>
                  <Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-ys-bg/60 transition-colors">
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-ys-ink">{item.title}</span>
                        {item.description ? (
                          <span className="text-xs text-ys-graphite">{item.description}</span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-ys-ink-2">{item.className || 'Turma'}</span>
                    </Td>
                    <Td>
                      <span className="rounded-full bg-ys-bg px-2 py-1 text-xs font-semibold text-ys-ink">
                        {item.bimester}º
                      </span>
                    </Td>
                    <Td>
                      <span>{formatDateLabel(item.date)}</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {item.done ? 'Concluído' : 'Pendente'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(item)}
                          disabled={loading}
                        >
                          {item.done ? 'Marcar pendente' : 'Marcar concluído'}
                        </Button>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(item)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={closeForm}>
        <div className="w-full max-w-xl p-6">
          <h2 className="ys-card-title text-slate-900">Editar conteúdo</h2>
          <form className="mt-4 space-y-4" onSubmit={handleFormSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Turma</label>
              <p className="mt-1 text-sm text-slate-500">{formState?.className ?? '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Título</label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-ys-amber focus:outline-none"
                value={formState?.title ?? ''}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, title: event.target.value } : prev,
                  )
                }
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Descrição</label>
              <textarea
                className="mt-1 h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-ys-amber focus:outline-none"
                value={formState?.description ?? ''}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Data</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-ys-amber focus:outline-none"
                  value={formState?.date ?? ''}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, date: event.target.value } : prev,
                    )
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Bimestre</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-ys-amber focus:outline-none"
                  value={formState?.bimester ?? '1'}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, bimester: event.target.value } : prev,
                    )
                  }
                  required
                >
                  {BIMESTERS.map((bimester) => (
                    <option key={bimester} value={bimester}>
                      {bimester}º bimestre
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formState?.done ?? false}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, done: event.target.checked } : prev,
                  )
                }
              />
              Marcar como concluído
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <div className="w-full max-w-md p-6">
          <h2 className="ys-card-title text-slate-900">Remover conteúdo</h2>
          <p className="mt-3 text-sm text-slate-600">
            Tem certeza que deseja remover “{deleteTarget?.title}”? Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="ghost"
              className="border-red-200 bg-red-600 text-white hover:bg-red-500"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Removendo…' : 'Remover'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
