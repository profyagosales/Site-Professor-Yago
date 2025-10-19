import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export default function DashboardCard({
  title,
  actions,
  className = '',
  contentClassName = '',
  children,
}: DashboardCardProps) {
  const containerClass = [
    'flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-h-[320px]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = ['mt-4 flex-1 flex flex-col', contentClassName].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="card-title text-slate-900">{title}</h3>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className={contentClass}>{children}</div>
    </div>
  );
}
