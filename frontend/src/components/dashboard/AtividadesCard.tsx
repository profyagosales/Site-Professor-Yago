import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import DashboardCard from './DashboardCard';
import { listContents, deleteContent } from '@/services/contents';
import type { ContentItem } from '@/types/school';
import { toast } from 'react-toastify';

type AtividadesCardProps = {
  embedded?: boolean;
  limit?: number;
  className?: string;
  refreshKey?: number;
  onActionChange?: (action: ReactNode | null) => void;
};

const MODAL_PAGE_SIZE = 8;

function formatContentDate(value: string | Date): string {
  try {
    const parsed = typeof value === 'string' ? new Date(value) : value;
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (err) {
    console.warn('[AtividadesCard] Falha ao formatar data', value, err);
    return '';
  }
}

export default function AtividadesCard({
  embedded = false,
  limit = 5,
  className = '',
  refreshKey = 0,
  onActionChange,
}: AtividadesCardProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<ContentItem[]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const containerClass = ['flex h-full min-h-0 flex-col gap-4', className].filter(Boolean).join(' ');

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listContents({ limit, page: 1, sort: 'desc' });
      setItems(response.items ?? []);
    } catch (err) {
      console.error('[AtividadesCard] Falha ao carregar conteúdos', err);
      setItems([]);
      setError('Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSummaryRefreshToken((token) => token + 1);
  }, [refreshKey]);

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, summaryRefreshToken]);

  const displayedItems = useMemo(() => items.slice(0, limit), [items, limit]);

  const loadModalPage = async (page: number) => {
    setModalLoading(true);
    try {
      const response = await listContents({ limit: MODAL_PAGE_SIZE, page, sort: 'desc' });
      setModalItems(response.items ?? []);
      setModalHasMore(response.hasMore ?? false);
    } catch (err) {
      console.error('[AtividadesCard] Falha ao carregar lista completa de conteúdos', err);
      toast.error('Não foi possível carregar as atividades.');
      setModalItems([]);
      setModalHasMore(false);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) {
      return;
    }
    void loadModalPage(modalPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, modalPage]);

  const handleDelete = async (item: ContentItem) => {
    if (!item?.id) {
      return;
    }
    const question = item.title ? `Excluir "${item.title}"?` : 'Excluir atividade?';
    if (typeof window !== 'undefined' && !window.confirm(question)) {
      return;
    }

    try {
      await deleteContent(item.id);
      toast.success('Atividade excluída.');
      setSummaryRefreshToken((token) => token + 1);
      if (modalOpen) {
        void loadModalPage(modalPage);
      }
    } catch (err) {
      console.error('[AtividadesCard] Falha ao excluir conteúdo', err);
      toast.error('Não foi possível excluir a atividade.');
    }
  };

  const openModal = useCallback(() => {
    setModalPage(1);
    setModalOpen(true);
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setModalItems([]);
  };

  const isEditDisabled = loading && items.length === 0;

  const renderEditButton = useCallback(
    () => (
      <Button type="button" variant="ghost" size="sm" onClick={openModal} disabled={isEditDisabled}>
        Editar
      </Button>
    ),
    [openModal, isEditDisabled],
  );

  const shouldRenderHeader = embedded && !onActionChange;

  useEffect(() => {
    if (!embedded || !onActionChange) {
      return;
    }

    onActionChange(renderEditButton());

    return () => {
      onActionChange(null);
    };
  }, [embedded, onActionChange, renderEditButton]);

  const headerAction = renderEditButton();

  const content = (
    <div className="min-h-0 flex-1">
      {loading ? (
        <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
      ) : error ? (
        <p className="text-sm text-slate-500">{error}</p>
      ) : displayedItems.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma atividade cadastrada recentemente.</p>
      ) : (
        <ul className="space-y-3">
          {displayedItems.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.className}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {formatContentDate(item.date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const modalElement = (
    <Modal open={modalOpen} onClose={closeModal}>
      <div className="w-full max-w-4xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="card-title text-slate-900">Atividades cadastradas</h2>
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
          <p className="text-sm text-slate-500">Nenhuma atividade cadastrada.</p>
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
                    <td className="px-4 py-3 text-slate-600">{formatContentDate(item.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.bimester}º</td>
                    <td className="px-4 py-3 text-slate-600">{item.done ? 'Concluída' : 'Pendente'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
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
          <span>Página {modalPage}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModalPage((page) => Math.max(1, page - 1))}
              disabled={modalPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalPage((page) => (modalHasMore ? page + 1 : page))}
              disabled={!modalHasMore}
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );

  if (embedded) {
    return (
      <div className={containerClass}>
        {shouldRenderHeader ? (
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Atividades</h3>
            {headerAction}
          </div>
        ) : null}
        {content}
        {modalElement}
      </div>
    );
  }

  const standaloneClassName = ['flex h-full min-h-[24rem] flex-col', className].filter(Boolean).join(' ');

  return (
    <>
      <DashboardCard
        title="Atividades"
        action={headerAction}
        className={standaloneClassName}
        contentClassName="flex h-full min-h-0 flex-col gap-4 overflow-hidden"
      >
        {content}
      </DashboardCard>
      {modalElement}
    </>
  );
}

