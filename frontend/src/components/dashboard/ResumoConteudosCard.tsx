import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import { listContents, updateContent, deleteContent } from '@/services/contents';
import type { ContentItem } from '@/types/school';
import { toast } from 'react-toastify';

type ConteudoTipo = 'ATIVIDADE' | 'CONTEUDO' | 'DATA';

type SummaryItem = {
  id: string;
  titulo: string;
  turmaNome: string;
  tipo: ConteudoTipo;
  data: string;
};

type ApiPayload = {
  items?: unknown;
  data?: unknown;
};

type ResumoConteudosCardProps = {
  embedded?: boolean;
  limit?: number;
  className?: string;
};

type EditFormState = {
  title: string;
  description: string;
  date: string;
  bimester: string;
  done: boolean;
};

const MODAL_PAGE_SIZE = 6;

function normalizeTipo(value: unknown): ConteudoTipo {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'ATIVIDADE' || normalized === 'CONTEUDO' || normalized === 'DATA') {
    return normalized;
  }
  return 'CONTEUDO';
}

function normalizeSummaryItems(source: unknown): SummaryItem[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id : typeof raw._id === 'string' ? raw._id : null;
      const titulo = typeof raw.titulo === 'string' ? raw.titulo : typeof raw.title === 'string' ? raw.title : null;
      const turmaNome = typeof raw.turmaNome === 'string'
        ? raw.turmaNome
        : typeof raw.className === 'string'
          ? raw.className
          : null;
      const data = typeof raw.data === 'string' ? raw.data : typeof raw.date === 'string' ? raw.date : null;

      if (!id || !titulo || !turmaNome || !data) {
        return null;
      }

      return {
        id,
        titulo,
        turmaNome,
        data,
        tipo: normalizeTipo(raw.tipo ?? raw.type),
      } satisfies SummaryItem;
    })
    .filter(Boolean) as SummaryItem[];
}

function extractSummaryItems(payload: unknown): SummaryItem[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const raw = payload as ApiPayload;
  const primary = normalizeSummaryItems(raw.items);
  if (primary.length) {
    return primary;
  }

  const nestedData = normalizeSummaryItems((raw.data as any)?.items ?? raw.data);
  return nestedData;
}

function formatDate(iso: string): string {
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return 'Data não disponível';
    }
    return format(parsed, "d 'de' LLL", { locale: ptBR });
  } catch (err) {
    console.warn('Falha ao formatar data do conteúdo', iso, err);
    return 'Data não disponível';
  }
}

export default function ResumoConteudosCard({
  embedded = false,
  limit = 5,
  className = '',
}: ResumoConteudosCardProps) {
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<ContentItem[]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<ContentItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await api.get('/professor/conteudos-resumo', {
          params: { limit: Math.max(limit, 5) },
          meta: { noCache: true },
        });
        if (cancelled) {
          return;
        }
        const payload = response?.data;
        const items = extractSummaryItems(payload);
        setSummaryItems(items);
      } catch (err) {
        console.error('Falha ao carregar resumo de conteúdos', err);
        if (!cancelled) {
          setSummaryItems([]);
          setError('Não foi possível carregar o resumo.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit, refreshToken]);

  useEffect(() => {
    const handler = () => {
      setRefreshToken((token) => token + 1);
      if (modalOpen) {
        void loadModalPage(modalPage);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('contents:refresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('contents:refresh', handler);
      }
    };
  }, [modalOpen, modalPage]);

  const displayedItems = useMemo(() => summaryItems.slice(0, limit), [summaryItems, limit]);
  const hasMore = summaryItems.length > limit;

  const containerClass = embedded
    ? ['flex h-full flex-col', className].filter(Boolean).join(' ')
    : ['flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className]
        .filter(Boolean)
        .join(' ');

  const loadModalPage = async (page: number) => {
    setModalLoading(true);
    try {
      const response = await listContents({ limit: MODAL_PAGE_SIZE, page, sort: 'desc' });
      setModalItems(response.items);
      setModalTotal(response.total);
      setModalHasMore(response.hasMore);
    } catch (err) {
      console.error('[ResumoConteudosCard] Falha ao carregar atividades', err);
      setModalItems([]);
      setModalHasMore(false);
      toast.error('Não foi possível carregar as atividades.');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    void loadModalPage(modalPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, modalPage]);

  const openModal = () => {
    setModalPage(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (editSaving || deleting) return;
    setModalOpen(false);
    setModalItems([]);
  };

  const openEditModal = (item: ContentItem) => {
    setEditTarget(item);
    setEditForm({
      title: item.title,
      description: item.description ?? '',
      date: item.date.slice(0, 10),
      bimester: String(item.bimester),
      done: Boolean(item.done),
    });
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditTarget(null);
    setEditForm(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget || !editForm) return;
    setEditSaving(true);
    try {
      await updateContent(editTarget.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() ? editForm.description.trim() : null,
        date: editForm.date,
        bimester: Number(editForm.bimester),
        done: editForm.done,
      });
      toast.success('Atividade atualizada');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('contents:refresh'));
      }
      closeEditModal();
      void loadModalPage(modalPage);
    } catch (err) {
      console.error('[ResumoConteudosCard] Falha ao atualizar atividade', err);
      toast.error('Não foi possível atualizar a atividade.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContent(deleteTarget.id);
      toast.success('Atividade removida');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('contents:refresh'));
      }
      setDeleteTarget(null);
      void loadModalPage(modalPage > 1 && !modalHasMore ? modalPage - 1 : modalPage);
    } catch (err) {
      console.error('[ResumoConteudosCard] Falha ao remover atividade', err);
      toast.error('Não foi possível remover a atividade.');
    } finally {
      setDeleting(false);
    }
  };

  const content = () => {
    if (loading) {
      return <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />;
    }
    if (error) {
      return <p className="text-sm text-slate-500">{error}</p>;
    }
    if (displayedItems.length === 0) {
      return <p className="text-sm text-slate-500">Nenhuma atividade cadastrada recentemente.</p>;
    }
    return (
      <ul className="space-y-3">
        {displayedItems.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{item.titulo}</p>
                <p className="text-xs text-slate-500">{item.turmaNome}</p>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                {item.tipo}
              </span>
            </div>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {formatDate(item.data)}
            </p>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="card-title text-slate-900">Próximas Atividades</h3>
        </div>
      )}
      <div className="card-scroll flex-1">{content()}</div>
      {hasMore && (
        <div className="mt-4 flex justify-end">
          <Button variant="link" onClick={openModal}>
            Ver todos
          </Button>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal}>
        <div className="w-full max-w-4xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="card-title text-slate-900">Todas as atividades</h2>
            <Button variant="ghost" onClick={closeModal}>
              Fechar
            </Button>
          </div>
          {modalLoading ? (
            <div className="space-y-3">
              {Array.from({ length: MODAL_PAGE_SIZE }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : modalItems.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma atividade registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Título</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Turma</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Data</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Bimestre</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modalItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.title}</td>
                      <td className="px-4 py-3 text-slate-600">{item.className}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{item.bimester}º</td>
                      <td className="px-4 py-3 text-slate-600">{item.done ? 'Concluída' : 'Pendente'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {modalPage}
              {modalTotal ? ` • ${modalTotal} atividades` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalPage((page) => Math.max(1, page - 1))} disabled={modalPage === 1}>
                Anterior
              </Button>
              <Button variant="outline" onClick={() => setModalPage((page) => (modalHasMore ? page + 1 : page))} disabled={!modalHasMore}>
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(editTarget)} onClose={closeEditModal}>
        <div className="w-full max-w-lg p-6">
          <h3 className="card-title mb-4 text-slate-900">Editar atividade</h3>
          {editForm ? (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Título</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, title: event.target.value } : prev)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Descrição</label>
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, description: event.target.value } : prev)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Data</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, date: event.target.value } : prev)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Bimestre</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editForm.bimester}
                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, bimester: event.target.value } : prev)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editForm.done}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, done: event.target.checked } : prev)}
                />
                Concluída
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeEditModal} disabled={editSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <div className="w-full max-w-md p-6">
          <h3 className="card-title mb-2 text-slate-900">Remover atividade</h3>
          <p className="text-sm text-slate-600">
            Tem certeza de que deseja remover "{deleteTarget?.title}"?
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button type="button" className="btn-primary" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo…' : 'Remover'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
