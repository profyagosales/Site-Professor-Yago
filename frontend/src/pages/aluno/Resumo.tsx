import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { getStudentAgenda, getStudentGrades, listStudentAnnouncements } from '@/services/student';
import type { StudentLayoutContextValue } from '@/layouts/StudentLayout';

const BIMESTERS = [1, 2, 3, 4] as const;
const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' });

type AgendaContent = {
  id: string;
  titulo: string;
  data: string | null;
  descricao?: string | null;
};

type AgendaEvaluation = {
  id: string;
  titulo: string;
  data: string | null;
  valor: number | null;
};

type AgendaData = {
  conteudos: AgendaContent[];
  avaliacoes: AgendaEvaluation[];
};

type Announcement = {
  id: string;
  mensagem: string;
  data: string | null;
  origem?: string | null;
};

type GradeActivity = {
  atividade: string;
  nota: number | null;
  valor: number | null;
  data: string | null;
};

type GradeSummary = {
  atividades: GradeActivity[];
  agregados: {
    mediaAtividades: number | null;
    pontuacaoAcumulada: number;
    totalAtividades: number;
    resumoPorBimestre: Array<{
      bimester: number;
      pontuacao: number;
      media: number | null;
    }>;
  };
};

function currentBimester(): number {
  const month = new Date().getMonth();
  const estimate = Math.floor(month / 2) + 1;
  if (estimate < 1) return 1;
  if (estimate > 4) return 4;
  return estimate;
}

function sortByDateAsc<T extends { data: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.data ? new Date(a.data).getTime() : Number.POSITIVE_INFINITY;
    const db = b.data ? new Date(b.data).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

function sortByDateDesc<T extends { data: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.data ? new Date(a.data).getTime() : 0;
    const db = b.data ? new Date(b.data).getTime() : 0;
    return db - da;
  });
}

function formatDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_SHORT.format(date);
}

function formatLongDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_LONG.format(date);
}

function ensureId(value: unknown, index: number, prefix: string): string {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const idCandidate = raw.id ?? raw._id ?? raw.uuid;
    if (typeof idCandidate === 'string' || typeof idCandidate === 'number') {
      return String(idCandidate);
    }
  }
  return `${prefix}-${index}`;
}

function normalizeAgenda(input: unknown): AgendaData {
  const raw = (input as any) ?? {};
  const conteudos = Array.isArray(raw.conteudos)
    ? raw.conteudos.map((item: any, index: number) => {
        const entry = item ?? {};
        return {
          id: ensureId(entry, index, 'conteudo'),
          titulo: entry?.titulo ?? entry?.title ?? `Conteúdo ${index + 1}`,
          data: entry?.data ?? null,
          descricao: entry?.descricao ?? entry?.description ?? null,
        };
      })
    : [];
  const avaliacoes = Array.isArray(raw.avaliacoes)
    ? raw.avaliacoes.map((item: any, index: number) => {
        const entry = item ?? {};
        const valor = entry?.valor ?? entry?.value;
        return {
          id: ensureId(entry, index, 'avaliacao'),
          titulo: entry?.titulo ?? entry?.name ?? `Avaliação ${index + 1}`,
          data: entry?.data ?? null,
          valor: typeof valor === 'number' ? valor : null,
        };
      })
    : [];
  return {
    conteudos: sortByDateAsc(conteudos),
    avaliacoes: sortByDateAsc(avaliacoes),
  };
}

function normalizeAnnouncements(input: unknown): Announcement[] {
  const base = Array.isArray(input) ? input : Array.isArray((input as any)?.avisos) ? (input as any).avisos : [];
  const mapped = base
    .map((item: any, index: number) => {
      const entry = item ?? {};
      return {
        id: ensureId(entry, index, 'aviso'),
        mensagem: entry?.mensagem ?? entry?.message ?? '',
        data: entry?.data ?? entry?.createdAt ?? null,
        origem: entry?.origem ?? null,
      };
    })
    .filter((item: Announcement) => item.mensagem);
  return sortByDateDesc(mapped);
}

function normalizeGrades(input: unknown): GradeSummary {
  const fallback: GradeSummary = {
    atividades: [],
    agregados: {
      mediaAtividades: null,
      pontuacaoAcumulada: 0,
      totalAtividades: 0,
      resumoPorBimestre: [],
    },
  };

  if (!input || typeof input !== 'object') return fallback;
  const asAny = input as any;
  const atividadesRaw = Array.isArray(asAny.atividades) ? asAny.atividades : [];
  const agregadosRaw = asAny.agregados ?? {};

  const atividades = atividadesRaw.map((item: any) => ({
    atividade: item?.atividade ?? item?.name ?? 'Atividade',
    nota: typeof item?.nota === 'number' ? item.nota : null,
    valor: typeof item?.valor === 'number' ? item.valor : null,
    data: item?.data ?? null,
  }));

  return {
    atividades,
    agregados: {
      mediaAtividades:
        typeof agregadosRaw.mediaAtividades === 'number' ? agregadosRaw.mediaAtividades : null,
      pontuacaoAcumulada:
        typeof agregadosRaw.pontuacaoAcumulada === 'number' ? agregadosRaw.pontuacaoAcumulada : 0,
      totalAtividades:
        typeof agregadosRaw.totalAtividades === 'number'
          ? agregadosRaw.totalAtividades
          : atividades.filter((activity: GradeActivity) => activity.nota !== null).length,
      resumoPorBimestre: Array.isArray(agregadosRaw.resumoPorBimestre)
        ? agregadosRaw.resumoPorBimestre.map((item: any) => ({
            bimester: Number(item?.bimester ?? item?.bimestre ?? 0),
            pontuacao: typeof item?.pontuacao === 'number' ? item.pontuacao : 0,
            media: typeof item?.media === 'number' ? item.media : null,
          }))
        : [],
    },
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ResumoAlunoPage() {
  const { profile, loading: layoutLoading } = useOutletContext<StudentLayoutContextValue>();
  const studentId = profile?.id ?? null;

  const [agenda, setAgenda] = useState<AgendaData>({ conteudos: [], avaliacoes: [] });
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState(false);

  const [term, setTerm] = useState<number>(currentBimester());
  const [grades, setGrades] = useState<GradeSummary | null>(null);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setAgendaLoading(true);
    setAnnouncementsLoading(true);
    setAgendaError(false);
    setAnnouncementsError(false);

    const load = async () => {
      try {
        const [agendaResponse, announcementsResponse] = await Promise.all([
          getStudentAgenda(studentId),
          listStudentAnnouncements(studentId, { limit: 6 }),
        ]);

        if (cancelled) return;
        setAgenda(normalizeAgenda(agendaResponse));
        setAnnouncements(normalizeAnnouncements(announcementsResponse));
      } catch (error) {
        console.error('[ResumoAluno] Falha ao carregar agenda ou avisos', error);
        if (!cancelled) {
          setAgendaError(true);
          setAnnouncementsError(true);
        }
      } finally {
        if (!cancelled) {
          setAgendaLoading(false);
          setAnnouncementsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setGradesLoading(true);
    setGradesError(false);

    const loadGrades = async () => {
      try {
        const response = await getStudentGrades(studentId, term);
        if (cancelled) return;
        setGrades(normalizeGrades(response));
      } catch (error) {
        console.error('[ResumoAluno] Falha ao carregar notas', error);
        if (!cancelled) {
          setGradesError(true);
        }
      } finally {
        if (!cancelled) {
          setGradesLoading(false);
        }
      }
    };

    void loadGrades();
    return () => {
      cancelled = true;
    };
  }, [studentId, term]);

  const proximasAvaliacoes = useMemo(
    () => sortByDateAsc(agenda.avaliacoes).slice(0, 4),
    [agenda.avaliacoes],
  );

  const proximosConteudos = useMemo(
    () => sortByDateAsc(agenda.conteudos).slice(0, 4),
    [agenda.conteudos],
  );

  const proximaAvaliacao = proximasAvaliacoes[0] ?? null;
  const atividades = grades?.atividades ?? [];
  const atividadesTabela = useMemo(() => atividades.slice(0, 5), [atividades]);
  const agregados = grades?.agregados;

  const resumoPorBimestre = useMemo(() => {
    if (!agregados) return [];
    return [...(agregados.resumoPorBimestre ?? [])]
      .filter((item) => Number.isFinite(item.bimester) && item.pontuacao !== undefined)
      .sort((a, b) => a.bimester - b.bimester);
  }, [agregados]);

  const mediaAtividades = agregados?.mediaAtividades ?? null;
  const pontuacaoAcumulada = agregados?.pontuacaoAcumulada ?? 0;
  const totalAtividades = agregados?.totalAtividades ?? 0;

  if (!studentId) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        {layoutLoading ? 'Carregando dados do aluno…' : 'Não foi possível carregar seu perfil.'}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="h-full">
          <CardBody className="space-y-6">
            <div>
              <CardTitle>Próximas avaliações</CardTitle>
              <CardSub>Acompanhe as provas já agendadas para o seu período</CardSub>
            </div>

            {agendaLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando agenda…</div>
            ) : agendaError ? (
              <EmptyState message="Não foi possível carregar as avaliações. Tente novamente." />
            ) : proximasAvaliacoes.length ? (
              <div className="space-y-4">
                {proximasAvaliacoes.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-start justify-between rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{evaluation.titulo}</p>
                      <p className="text-xs text-slate-500">{formatLongDate(evaluation.data)}</p>
                    </div>
                    <span className="text-xs font-semibold text-orange-500">
                      {typeof evaluation.valor === 'number'
                        ? `${evaluation.valor.toFixed(1)} pts`
                        : 'Sem valor'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Ainda não há avaliações agendadas nesse período." />
            )}

            {proximaAvaliacao && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
                <p className="text-xs font-semibold text-orange-600">Próxima avaliação</p>
                <p className="mt-1 text-lg font-semibold text-orange-700">{proximaAvaliacao.titulo}</p>
                <p className="text-sm text-orange-700/90">{formatLongDate(proximaAvaliacao.data)}</p>
                {typeof proximaAvaliacao.valor === 'number' && (
                  <p className="text-xs text-orange-700/80">
                    Vale {proximaAvaliacao.valor.toFixed(1)} pontos
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="h-full">
          <CardBody className="space-y-6">
            <div>
              <CardTitle>Próximos conteúdos</CardTitle>
              <CardSub>Saiba o que será trabalhado nas próximas aulas</CardSub>
            </div>

            {agendaLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando agenda…</div>
            ) : agendaError ? (
              <EmptyState message="Não foi possível carregar os próximos conteúdos." />
            ) : proximosConteudos.length ? (
              <div className="space-y-3">
                {proximosConteudos.map((content) => (
                  <div key={content.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{content.titulo}</p>
                    <p className="text-xs text-slate-500">{formatLongDate(content.data)}</p>
                    {content.descricao && (
                      <p className="mt-2 text-xs text-slate-500">{content.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Os próximos conteúdos aparecerão aqui assim que forem publicados." />
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardBody className="space-y-6">
            <div>
              <CardTitle>Avisos recentes</CardTitle>
              <CardSub>Comunicados da turma e do professor</CardSub>
            </div>

            {announcementsLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando avisos…</div>
            ) : announcementsError ? (
              <EmptyState message="Não foi possível carregar os avisos." />
            ) : announcements.length ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{announcement.mensagem}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatLongDate(announcement.data)}</p>
                    {announcement.origem && (
                      <p className="text-xs text-slate-400">
                        Fonte: {announcement.origem === 'class' ? 'Turma' : 'Professor'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Você verá seus avisos importantes aqui." />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Notas do bimestre</h2>
            <p className="text-sm text-slate-500">Acompanhe sua pontuação acumulada nas avaliações</p>
          </div>
          <Tabs
            items={BIMESTERS.map((value) => ({
              key: String(value),
              label: `${value}º bim.`,
              isActive: term === value,
              onClick: () => setTerm(value),
            }))}
          />
        </div>

        {gradesLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
            Carregando notas…
          </div>
        ) : gradesError ? (
          <EmptyState message="Não foi possível carregar as notas desse bimestre." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="overflow-hidden">
              <CardBody>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    Pontuação acumulada
                  </p>
                  <p className="mt-1 text-3xl font-bold text-orange-700">{pontuacaoAcumulada.toFixed(1)}</p>
                  <p className="text-xs text-orange-700/80">
                    Soma das notas registradas neste bimestre selecionado
                  </p>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Atividade</th>
                        <th className="px-4 py-3 text-right">Nota</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {atividadesTabela.length ? (
                        atividadesTabela.map((activity, index) => (
                          <tr key={`${activity.atividade}-${index}`}>
                            <td className="px-4 py-3 font-medium text-slate-700">{activity.atividade}</td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {typeof activity.nota === 'number' ? activity.nota.toFixed(1) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500">
                              {typeof activity.valor === 'number' ? activity.valor.toFixed(1) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500">{formatDate(activity.data)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                            Ainda não há atividades registradas neste bimestre.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <div className="space-y-4">
              <StatCard
                label="Média das atividades"
                value={mediaAtividades !== null ? mediaAtividades.toFixed(1) : '—'}
                hint="Calculada com base nas avaliações lançadas"
              />
              <StatCard
                label="Atividades avaliadas"
                value={String(totalAtividades)}
                hint="Quantidade de notas registradas"
              />
              <Card>
                <CardBody className="space-y-3">
                  <CardTitle>Histórico por bimestre</CardTitle>
                  <CardSub>Veja a evolução da pontuação ao longo do ano</CardSub>
                  {resumoPorBimestre.length ? (
                    <div className="space-y-2">
                      {resumoPorBimestre.map((item) => (
                        <div
                          key={item.bimester}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{item.bimester}º bimestre</p>
                            <p className="text-xs text-slate-500">
                              {item.media !== null ? `Média ${item.media.toFixed(1)}` : 'Sem média registrada'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-orange-500">
                            {item.pontuacao.toFixed(1)} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Os bimestres anteriores aparecerão aqui assim que houver registros." />
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
