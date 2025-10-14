import { Tabs } from '@/components/ui/Tabs';

const RESOURCES = [
  {
    title: 'Cronograma oficial',
    description: 'Fique atento às principais datas do PAS/UnB e organize os estudos com antecedência.',
    link: 'https://www.unb.br/pas',
    linkLabel: 'Site do PAS',
  },
  {
    title: 'Guia de competências',
    description: 'Entenda como cada competência é avaliada e como preparar uma redação completa.',
    link: 'https://www.unb.br/pas',
    linkLabel: 'Competências ENEM/PAS',
  },
  {
    title: 'Checklist da redação',
    description: 'Lista rápida para revisar argumentação, coesão, ortografia e proposta de intervenção.',
    link: '#',
    linkLabel: 'Baixar checklist',
  },
];

export default function PasUnbAlunoPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#00c4cc,#0fb981,#3e9d5a)] px-8 py-12 text-white shadow-[0_30px_70px_rgba(15,185,129,0.25)] sm:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Trilha do aluno</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">PAS/UnB</h1>
        <p className="mt-4 max-w-2xl text-base font-medium text-white/85 sm:text-lg">
          Reunimos aqui conteúdos, cronogramas e materiais de apoio para a preparação contínua do PAS/UnB. Volte sempre para acompanhar atualizações e novos recursos.
        </p>
      </div>

      <div className="mt-10">
        <Tabs
          items={[
            { key: 'overview', label: 'Resumo', to: '/aluno/resumo' },
            { key: 'grades', label: 'Minhas Notas', to: '/aluno/notas' },
            { key: 'essays', label: 'Redações', to: '/aluno/redacoes' },
            { key: 'pas', label: 'PAS/UnB', to: '/aluno/pas-unb', end: true },
          ]}
        />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((item) => (
          <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <h2 className="text-lg font-semibold text-ys-ink">{item.title}</h2>
            <p className="mt-3 text-sm text-ys-ink-2">{item.description}</p>
            {item.link !== '#' ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0fb981] transition hover:text-[#0b8a63]"
              >
                {item.linkLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline"
                >
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            ) : (
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0fb981] opacity-70"
                disabled
              >
                {item.linkLabel} (em breve)
              </button>
            )}
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-sm text-slate-600">
        Estamos trabalhando em uma jornada completa com simulados, redações comentadas e trilhas de estudo específicas para cada etapa. Enquanto isso, converse com o seu professor para alinhar os próximos passos e mantenha um registro das suas anotações na área de redações.
      </div>
    </section>
  );
}
