import { useCallback, useEffect, useMemo, useRef, useState, useId, type TouchEvent, type KeyboardEvent } from 'react';
import DOMPurify from 'dompurify';
import { toast } from 'react-toastify';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  deleteAnnouncement,
  listAnnouncements,
  normalizeAnnouncement,
  type normalizeAnnouncement as NormalizeAnnouncementFn,
} from '@/services/announcements';
import { FiEdit2, FiFileText, FiTrash2 } from 'react-icons/fi';

type Announcement = NonNullable<ReturnType<typeof normalizeAnnouncement>>;

type Attachment = NonNullable<Announcement['attachments']>[number];

const noop = () => {};

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'mark',
    'span',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'img',
    'div',
  ],
  ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel', 'src', 'width', 'height', 'alt'],
};

let purifyConfigured = false;
if (typeof window !== 'undefined' && !purifyConfigured) {
  purifyConfigured = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName && node.tagName.toLowerCase() === 'a') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

type AvisosCardProps = {
  className?: string;
  limit?: number;
  onEdit?: (announcement: Announcement) => void;
  classId?: string | null;
  onCreate?: () => void;
};

const SLIDE_INTERVAL = 10000;
const MODAL_PAGE_SIZE = 6;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeFallbackHtml(message: string): string {
  if (!message) return '<p></p>';
  const paragraphs = message
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) =>
      block
        .trim()
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br />')
    )
    .filter(Boolean);
  if (!paragraphs.length) {
    return `<p>${escapeHtml(message)}</p>`;
  }
  return paragraphs.map((content) => `<p>${content}</p>`).join('');
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ...SANITIZE_CONFIG,
    USE_PROFILES: { html: true },
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isImage(attachment: Attachment): boolean {
  return typeof attachment?.mime === 'string' && attachment.mime.startsWith('image/');
}

function isPdf(attachment: Attachment): boolean {
  return typeof attachment?.mime === 'string' && attachment.mime === 'application/pdf';
}

export default function AvisosCard({
  className = '',
  limit = 5,
  classId = null,
  onEdit = noop,
  onCreate = noop,
}: AvisosCardProps) {
  const hasEditAction = onEdit !== noop;
  const hasCreateAction = onCreate !== noop;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<number | undefined>();
  const touchStartRef = useRef<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalItems, setModalItems] = useState<Announcement[]>([]);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalTotal, setModalTotal] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(() => new Set());

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] disabled:opacity-60 disabled:cursor-not-allowed';

  const resetInterval = useCallback(() => {
    if (intervalRef.current !== undefined) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    if (announcements.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % announcements.length);
      }, SLIDE_INTERVAL);
      setIsPaused(false);
    } else {
      setIsPaused(true);
    }
  }, [announcements.length]);

  const pauseCarousel = useCallback(() => {
    if (intervalRef.current !== undefined) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setIsPaused(true);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAnnouncements({ limit, classId: classId ?? undefined });
      setAnnouncements(items);
      setActiveIndex(0);
    } catch (err) {
      console.error('[AvisosCard] Falha ao carregar avisos', err);
      setAnnouncements([]);
      setError('Não foi possível carregar os avisos agora.');
    } finally {
      setLoading(false);
    }
  }, [limit, classId]);

  useEffect(() => {
    void fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    const handler = () => {
      void fetchAnnouncements();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('announcements:refresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('announcements:refresh', handler);
      }
    };
  }, [fetchAnnouncements]);

  useEffect(() => {
    resetInterval();
    return () => {
      pauseCarousel();
    };
  }, [resetInterval, pauseCarousel]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length > 0) {
      pauseCarousel();
      touchStartRef.current = event.touches[0].clientX;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartRef.current === null) return;
    const touchEnd = event.changedTouches[0]?.clientX ?? touchStartRef.current;
    const delta = touchEnd - touchStartRef.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) {
        setActiveIndex((prev) => (prev + 1) % announcements.length);
      } else {
        setActiveIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
      }
      resetInterval();
    }
    touchStartRef.current = null;
  };

  const activeAnnouncement = announcements[activeIndex] ?? null;

  const announcementHtml = useMemo(() => {
    if (!activeAnnouncement) return '';
    const rawHtml = activeAnnouncement.html || computeFallbackHtml(activeAnnouncement.message);
    return sanitizeHtml(rawHtml);
  }, [activeAnnouncement]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    setModalPage(1);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalItems([]);
    setModalPage(1);
  }, []);

  const loadModalPage = useCallback(
    async (page: number) => {
      setModalLoading(true);
      try {
        const { items, hasMore, total } = await listAnnouncements({
          limit: MODAL_PAGE_SIZE,
          page,
          classId: classId ?? undefined,
        });
        setModalItems(items);
        setModalHasMore(hasMore);
        setModalTotal(total);
      } catch (err) {
        console.error('[AvisosCard] Falha ao carregar avisos (modal)', err);
        setModalItems([]);
        setModalHasMore(false);
      } finally {
        setModalLoading(false);
      }
    },
    [classId]
  );

  useEffect(() => {
    if (!modalOpen) return;
    void loadModalPage(modalPage);
  }, [modalOpen, modalPage, loadModalPage]);

  const setProcessingFlag = useCallback((id: string, active: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (active) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleEdit = useCallback(
    (announcement: Announcement) => {
      pauseCarousel();
      closeModal();
      onEdit?.(announcement);
    },
    [pauseCarousel, closeModal, onEdit]
  );

  const handleDelete = useCallback(
    async (announcement: Announcement) => {
      if (!announcement?.id) return;
      const confirmed = typeof window === 'undefined' ? true : window.confirm('Remover este aviso?');
      if (!confirmed) return;
      setProcessingFlag(announcement.id, true);
      try {
        await deleteAnnouncement(announcement.id);
        toast.success('Aviso removido');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('announcements:refresh'));
        }
        await fetchAnnouncements();
        const remaining = modalItems.filter((item) => item.id !== announcement.id).length;
        setModalItems((prev) => prev.filter((item) => item.id !== announcement.id));
        if (remaining === 0 && modalPage > 1) {
          setModalPage((prev) => Math.max(1, prev - 1));
        }
      } catch (err) {
        console.error('[AvisosCard] Falha ao remover aviso', err);
        toast.error('Não foi possível remover este aviso.');
      } finally {
        setProcessingFlag(announcement.id, false);
        resetInterval();
      }
    },
    [fetchAnnouncements, modalItems, modalPage, resetInterval, setProcessingFlag]
  );

  const togglePause = useCallback(() => {
    if (isPaused) {
      resetInterval();
    } else {
      pauseCarousel();
    }
  }, [isPaused, pauseCarousel, resetInterval]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        togglePause();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % announcements.length);
        resetInterval();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
        resetInterval();
      }
    },
    [announcements.length, togglePause, resetInterval]
  );

  const handleModalNext = () => {
    if (modalHasMore) {
      setModalPage((current) => current + 1);
    }
  };

  const handleModalPrev = () => {
    setModalPage((current) => Math.max(1, current - 1));
  };

  const rawCarouselId = useId();
  const carouselId = `announcement-carousel-${rawCarouselId.replace(/[^a-zA-Z0-9-]/g, '')}`;

  const handleSelectIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      resetInterval();
    },
    [resetInterval]
  );

  return (
    <>
      <DashboardCard
        title="Avisos"
        className={className}
        actions={
          <div className="flex gap-2">
            {hasCreateAction ? (
              <Button type="button" variant="ghost" onClick={onCreate}>
                Registrar aviso
              </Button>
            ) : null}
            <Button variant="link" onClick={openModal} disabled={loading || (!error && !announcements.length)}>
              Ver todos
            </Button>
          </div>
        }
        contentClassName="card-body"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-24 w-full max-w-sm animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            {error}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Nenhum aviso encontrado.
          </div>
        ) : (
          <div
            className="aria-carousel flex h-full flex-col"
            role="region"
            aria-roledescription="carrossel"
            aria-live="polite"
            aria-label="Avisos recentes"
            id={carouselId}
            tabIndex={0}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={pauseCarousel}
            onMouseLeave={resetInterval}
            onFocus={pauseCarousel}
            onBlur={resetInterval}
            onKeyDown={handleKeyDown}
          >
            <p className="sr-only" aria-live="polite">
              {isPaused ? 'Carrossel pausado' : 'Carrossel em reprodução automática'}
            </p>
            <div id={activeAnnouncement ? `announcement-slide-${activeAnnouncement.id}` : undefined} className="flex flex-1 flex-col">
              <header className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {formatDateTime(activeAnnouncement?.scheduleAt ?? activeAnnouncement?.createdAt) || 'Aviso'}
                </p>
                <h4 className="text-lg font-semibold text-slate-900">{activeAnnouncement?.subject}</h4>
              </header>
              <div
                className="avisos-body rich-content prose prose-sm mt-4 max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: announcementHtml }}
              />
              {activeAnnouncement?.attachments?.length ? (
                <div className="mt-4 space-y-3">
                  {activeAnnouncement.attachments.map((attachment) => {
                    if (!attachment || !attachment.url) return null;
                    if (isImage(attachment)) {
                      return (
                        <div key={attachment.url} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <img
                            src={attachment.url}
                            alt={attachment.name ?? 'Imagem do aviso'}
                            className="max-h-64 w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      );
                    }
                    if (isPdf(attachment)) {
                      return (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          <FiFileText aria-hidden="true" className="h-4 w-4" />
                          {attachment.name || 'Ver PDF'}
                        </a>
                      );
                    }
                    return (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-orange-600 underline"
                      >
                        {attachment.name || 'Ver anexo'}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {announcements.length > 1 ? (
              <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Selecionar aviso">
                {announcements.map((item, index) => (
                  <button
                    key={item.id ?? `announcement-${index}`}
                    type="button"
                    role="tab"
                    aria-pressed={index === activeIndex}
                    aria-label={`Ir para aviso ${index + 1}`}
                    onClick={() => handleSelectIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] ${
                      index === activeIndex ? 'bg-orange-500' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </DashboardCard>

      <Modal open={modalOpen} onClose={closeModal}>
        <div className="w-full max-w-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="card-title text-slate-900">Todos os avisos</h2>
            <Button variant="ghost" onClick={closeModal}>
              Fechar
            </Button>
          </div>
          {modalLoading ? (
            <div className="space-y-3">
              {Array.from({ length: MODAL_PAGE_SIZE }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : modalItems.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum aviso disponível.</p>
          ) : (
            <div className="space-y-6">
              {modalItems.map((announcement) => {
                const html = sanitizeHtml(
                  announcement.html || computeFallbackHtml(announcement.message)
                );
                const timestamp =
                  formatDateTime(announcement.scheduleAt ?? announcement.createdAt) || 'Aviso';
                return (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <header className="mb-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{timestamp}</p>
                      <h3 className="text-lg font-semibold text-slate-900">{announcement.subject}</h3>
                    </header>
                    <div
                      className="announcement-content rich-content prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                    {announcement.attachments?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {announcement.attachments.map((attachment) => {
                          if (!attachment?.url) return null;
                          if (isPdf(attachment)) {
                            return (
                              <a
                                key={attachment.url}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                <FiFileText aria-hidden="true" className="h-4 w-4" />
                                {attachment.name || 'Ver PDF'}
                              </a>
                            );
                          }
                          return (
                            <a
                              key={attachment.url}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                            >
                              {attachment.name || 'Abrir anexo'}
                            </a>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {hasEditAction ? (
                        <button
                          type="button"
                          onClick={() => handleEdit(announcement)}
                          className={iconButtonClass}
                          title="Editar aviso"
                          aria-label="Editar aviso"
                        >
                          <FiEdit2 aria-hidden="true" />
                          <span className="sr-only">Editar aviso</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(announcement)}
                        className={iconButtonClass}
                        title="Excluir aviso"
                        aria-label="Excluir aviso"
                        disabled={processingIds.has(announcement.id)}
                      >
                        <FiTrash2 aria-hidden="true" />
                        <span className="sr-only">Excluir aviso</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {modalPage}
              {modalTotal ? ` • ${modalTotal} avisos` : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleModalPrev} disabled={modalPage === 1}>
                Anterior
              </Button>
              <Button variant="outline" onClick={handleModalNext} disabled={!modalHasMore}>
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
