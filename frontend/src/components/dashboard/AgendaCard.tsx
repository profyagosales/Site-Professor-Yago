import { useState, type ReactNode } from 'react';
import DashboardCard from './DashboardCard';
import ResumoConteudosCard from './ResumoConteudosCard';

type AgendaCardProps = {
  className?: string;
  contentClassName?: string;
  limit?: number;
};

export default function AgendaCard({
  className = '',
  contentClassName = '',
  limit,
}: AgendaCardProps) {
  const [action, setAction] = useState<ReactNode | null>(null);

  const cardClassName = ['flex h-full min-h-[24rem] flex-col', className]
    .filter(Boolean)
    .join(' ');
  const cardContentClassName = [
    'flex h-full min-h-0 flex-col gap-4 overflow-hidden',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DashboardCard
      title="Agenda"
      action={action ?? undefined}
      className={cardClassName}
      contentClassName={cardContentClassName}
    >
      <ResumoConteudosCard
        embedded
        limit={limit}
        className="flex h-full min-h-0 flex-col gap-4"
        onActionChange={setAction}
      />
    </DashboardCard>
  );
}
