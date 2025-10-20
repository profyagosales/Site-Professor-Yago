import { useMemo, useState } from 'react';
import type { RadarDataset, RadarFilters } from '@/types/radar';
import { RADAR_ITEM_MIME, type RadarDraggablePayload, type RadarDraggableKind } from './dragAndDrop';

interface RankingListProps {
  dataset: RadarDataset | null;
  loading: boolean;
  groupBy: RadarFilters['groupBy'];
  onSelect: (payload: RadarDraggablePayload) => void;
  onCompare: (payload: RadarDraggablePayload) => void;
  role?: string;
}

const TABS: Array<{ id: RadarDraggableKind; label: string }> = [
  { id: 'student', label: 'Alunos' },
  { id: 'class', label: 'Turmas' },
  { id: 'activity', label: 'Atividades' },
];

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function Avatar({ name, avatarUrl, initials }: { name: string; avatarUrl?: string | null; initials: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
      {avatarUrl ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

export default function RankingList({ dataset, loading, groupBy, onSelect, onCompare, role }: RankingListProps) {
  const [activeTab, setActiveTab] = useState<RadarDraggableKind>('student');

  const items = useMemo(() => {
    if (!dataset) return [];
    if (activeTab === 'student') {
      return dataset.students.map((student, index) => ({
        id: student.id,
        label: student.name,
        subtitle: dataset.classes.find((cls) => cls.id === student.classId)?.name ?? 'Sem turma',
        value: Number.isFinite(student.metrics?.avg) ? student.metrics?.avg ?? 0 : Math.random() * 10,
        delta: student.metrics?.delta ?? 0,
        avatarUrl: student.avatarUrl,
        initials: student.initials,
        rank: index + 1,
        kind: 'student' as const,
      }));
    }
    if (activeTab === 'class') {
      return dataset.classes.map((cls, index) => ({
        id: cls.id,
        label: cls.name,
        subtitle: cls.subject ?? 'Turma',
        value: 6 + Math.random() * 4,
        delta: (Math.random() - 0.5) * 1.2,
        avatarUrl: null,
        initials: (cls.name ?? 'TU').slice(0, 2).toUpperCase(),
        rank: index + 1,
        kind: 'class' as const,
      }));
    }
    return dataset.activities.map((activity, index) => ({
      id: activity.id,
      label: activity.title,
      subtitle: activity.type ?? 'Atividade',
      value: 6 + Math.random() * 4,
      delta: (Math.random() - 0.5) * 1.2,
      avatarUrl: null,
      initials: (activity.title ?? 'AT').slice(0, 2).toUpperCase(),
      rank: index + 1,
      kind: 'activity' as const,
    }));
  }, [activeTab, dataset]);

  const handleItemClick = (event: React.MouseEvent<HTMLButtonElement>, item: (typeof items)[number]) => {
    const payload: RadarDraggablePayload = { id: item.id, label: item.label, kind: item.kind };
    if (event.metaKey || event.ctrlKey) {
      onCompare(payload);
    } else {
      onSelect(payload);
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, item: (typeof items)[number]) => {
    const payload: RadarDraggablePayload = { id: item.id, label: item.label, kind: item.kind };
    event.dataTransfer.setData(RADAR_ITEM_MIME, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div className="flex h-full flex-col" role="region" aria-label="Ranking do radar">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto" role="tabpanel" aria-label={`Lista ${activeTab}`}>
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum dado disponível para o período.</p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                  draggable
                  onDragStart={(event) => handleDragStart(event, item)}
                  onClick={(event) => handleItemClick(event, item)}
                >
                  <span className="text-sm font-semibold text-slate-400">#{item.rank}</span>
                  <Avatar name={item.label} avatarUrl={item.avatarUrl} initials={item.initials} />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-slate-900">{item.value.toFixed(1)}</span>
                    <span
                      className={`text-xs font-medium ${
                        item.delta > 0 ? 'text-emerald-600' : item.delta < 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {item.delta > 0 ? '+' : ''}
                      {item.delta.toFixed(1)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
