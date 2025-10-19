import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import DOMPurify from 'dompurify';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { listAnnouncements, normalizeAnnouncement } from '@/services/announcements';

type Announcement = NonNullable<ReturnType<typeof normalizeAnnouncement>>;

type Attachment = NonNullable<Announcement['attachments']>[number];

type AvisosCardProps = {
  className?: string;
  limit?: number;
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
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
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

export default function AvisosCard({ className = '', limit = 5 }: AvisosCardProps) {
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

  const resetInterval = useCallback(() => {
    if (intervalRef.current !== undefined) {
      window.clearInterval(intervalRef.current);
    }
    if (announcements.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % announcements.length);
      }, SLIDE_INTERVAL);
    }
  }, [announcements.length]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAnnouncements({ limit });
      setAnnouncements(items);
      setActiveIndex(0);
    } catch (err) {
      console.error('[AvisosCard] Falha ao carregar avisos', err);
      setAnnouncements([]);
      setError('Não foi possível carregar os avisos agora.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

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
      if (intervalRef.current !== undefined) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [resetInterval]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length > 0) {
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
        const { items, hasMore, total } = await listAnnouncements({ limit: MODAL_PAGE_SIZE, page });
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
    []
  );

  useEffect(() => {
    if (!modalOpen) return;
    void loadModalPage(modalPage);
  }, [modalOpen, modalPage, loadModalPage]);

  const handleModalNext = () => {
    if (modalHasMore) {
      setModalPage((current) => current + 1);
    }
  };

  const handleModalPrev = () => {
    setModalPage((current) => Math.max(1, current - 1));
  };

  return (
    <>
      <DashboardCard
        title="Avisos"
        className={className}
        actions={
          <Button variant="link" onClick={openModal} disabled={loading || (!error && !announcements.length)}>
            Ver todos
          </Button>
        }
        contentClassName="flex-1"
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
            className="flex h-full flex-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {formatDateTime(activeAnnouncement?.scheduleAt ?? activeAnnouncement?.createdAt) || 'Aviso'}
              </p>
              <h4 className="text-lg font-semibold text-slate-900">{activeAnnouncement?.subject}</h4>
            </header>
            <div
              className="prose prose-sm mt-4 max-w-none flex-1 overflow-y-auto text-slate-700 [&>p]:mb-3 [&>p]:leading-relaxed"
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
                        📄 {attachment.name || 'Ver PDF'}
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

            {announcements.length > 1 ? (
              <div className="mt-6 flex items-center justify-center gap-2">
                {announcements.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Ir para aviso ${index + 1}`}
                    onClick={() => {
                      setActiveIndex(index);
                      resetInterval();
                    }}
                    className={`h-2.5 rounded-full transition ${
                      index === activeIndex ? 'w-6 bg-orange-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
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
                      className="prose prose-sm max-w-none text-slate-700 [&>p]:mb-3 [&>p]:leading-relaxed"
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
                                📄 {attachment.name || 'Ver PDF'}
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
