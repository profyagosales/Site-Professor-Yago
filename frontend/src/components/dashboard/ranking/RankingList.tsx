import { memo } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiAward } from 'react-icons/fi';
import Avatar from '@/components/Avatar';
import type { RankingEntity, RankingItem, RankingMetric } from '@/types/analytics';
import Sparkline from './Sparkline';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
};

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const MINUS_SIGN = '\u2212';

function formatScore(value: number) {
  return numberFormatter.format(value);
}

function formatDelta(value: number) {
  const absolute = numberFormatter.format(Math.abs(value));
  if (value > 0) return `↑ +${absolute}`;
  if (value < 0) return `↓ ${MINUS_SIGN}${absolute}`;
  return null;
}

interface RankingListProps {
  items: RankingItem[];
  entity: RankingEntity;
  metric: RankingMetric;
}

export default memo(function RankingList({ items, entity, metric }: RankingListProps) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2"
      role="list"
    >
      {items.map((item) => (
        <motion.li
          key={item.id}
          variants={itemVariants}
          className="group relative flex items-center gap-4 rounded-2xl border border-transparent bg-white/95 px-4 py-3 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-brand-200"
        >
          <PodiumBadge rank={item.rank} />
          <RankingAvatar entity={entity} item={item} />
          <div className="min-w-0 flex-1">
            {entity === 'class' ? (
              <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                <span className="truncate">{item.name}</span>
              </span>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
                <span className="inline-flex max-w-max items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {item.class_name ?? '—'}
                </span>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-end gap-3">
            {Array.isArray(item.sparkline) && item.sparkline.length > 1 ? (
              <Sparkline values={item.sparkline} />
            ) : null}
            <div className="flex flex-col items-end">
              <span
                className="text-2xl font-semibold text-slate-900"
                title={scoreTooltip(metric)}
              >
                {formatScore(item.score)}
              </span>
              {typeof item.delta === 'number' && Number.isFinite(item.delta)
                ? (() => {
                    const text = formatDelta(item.delta);
                    if (!text) return null;
                    return (
                      <span
                        className={`text-xs font-medium ${
                          item.delta > 0
                            ? 'text-emerald-600'
                            : item.delta < 0
                              ? 'text-rose-600'
                              : 'text-slate-400'
                        }`}
                      >
                        {text}
                      </span>
                    );
                  })()
                : null}
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
});

function PodiumBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  if (medal) {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100 text-xl">
        <span className="animate-[pulse_3s_ease-in-out_infinite]">{medal}</span>
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
      #{rank}
    </span>
  );
}

function RankingAvatar({ entity, item }: { entity: RankingEntity; item: RankingItem }) {
  if (entity === 'student') {
    return <Avatar src={item.avatar_url ?? undefined} name={item.name} size={40} className="ring-1 ring-white" />;
  }
  if (entity === 'class') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <FiUsers className="h-5 w-5" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
      <FiAward className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function RankingSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <li
          key={index}
          className="h-[68px] animate-pulse rounded-2xl bg-slate-100/80"
        />
      ))}
    </ul>
  );
}

function scoreTooltip(metric: RankingMetric) {
  switch (metric) {
    case 'term_avg':
      return 'Média do bimestre';
    case 'activity_peak':
      return 'Maior nota registrada em uma atividade';
    case 'year_avg':
      return 'Média acumulada no ano';
    case 'term_delta':
      return 'Variação em relação ao bimestre anterior';
    default:
      return '';
  }
}
