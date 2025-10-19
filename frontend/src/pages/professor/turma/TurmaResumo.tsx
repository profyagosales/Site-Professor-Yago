import { useEffect, useState } from 'react';
import { getClassAnnouncements } from '@/services/announcements';
import { getContents } from '@/services/contents';

type Announcement = {
  id: string;
  subject: string;
  message: string;
  html: string;
  attachments: Array<{ url: string; mime?: string | null; name?: string | null }>;
  createdAt?: string;
};

type ContentItem = {
  id: string;
  title: string;
  description?: string;
  date: string;
  bimester: number;
};

type TurmaResumoProps = {
  classId: string;
};

export function TurmaResumo({ classId }: TurmaResumoProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [ann, cont] = await Promise.all([
          getClassAnnouncements({ classId, limit: 5 }),
          getContents({ classId, status: 'pending' }),
        ]);
        if (!alive) return;
        setAnnouncements(ann);
        setContents(cont);
      } catch (err) {
        console.error('Erro ao carregar resumo da turma', err);
        if (alive) setError('Não foi possível carregar o resumo da turma agora.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchData();
    return () => {
      alive = false;
    };
  }, [classId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1.2fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Avisos recentes</h2>
            <p className="text-sm text-slate-500">Os alunos visualizam estes avisos no aplicativo.</p>
          </div>
        </header>

        {loading && <p className="text-sm text-slate-500">Carregando avisos…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && announcements.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum aviso publicado para esta turma.</p>
        )}

        <ul className="space-y-4">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{announcement.subject}</h3>
                  {announcement.createdAt && (
                    <p className="text-xs text-slate-500">
                      {new Date(announcement.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                {announcement.html ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: announcement.html }}
                  />
                ) : (
                  <p className="text-sm text-slate-700">{announcement.message}</p>
                )}
                {announcement.attachments?.length ? (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {announcement.attachments.map((file) => {
                      if (!file?.url) return null;
                      const isImage = typeof file.mime === 'string' && file.mime.startsWith('image/');
                      if (isImage) {
                        return (
                          <img
                            key={file.url}
                            src={file.url}
                            alt={file.name ?? 'Anexo'}
                            className="h-32 w-auto rounded-xl object-cover shadow"
                          />
                        );
                      }
                      return (
                        <a
                          key={file.url}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                        >
                          📎 {file.name ?? 'Anexo'}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Agenda da turma</h2>
            <p className="text-sm text-slate-500">Veja atividades e datas importantes compartilhadas com os alunos.</p>
          </div>
        </header>

        {loading && <p className="text-sm text-slate-500">Carregando agenda…</p>}
        {!loading && !contents.length && !error && (
          <p className="text-sm text-slate-500">Nenhuma atividade planejada para os próximos dias.</p>
        )}

        <ul className="space-y-3">
          {contents.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {new Date(item.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
                {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Bimestre {item.bimester}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default TurmaResumo;
