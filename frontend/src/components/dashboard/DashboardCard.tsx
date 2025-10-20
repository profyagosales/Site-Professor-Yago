import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export default function DashboardCard({
  title,
  action,
  className = '',
  contentClassName = '',
  children,
}: DashboardCardProps) {
  const containerClass = [
    'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = ['px-5 pb-5', contentClassName].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      <div className={contentClass}>{children}</div>
    </div>
  );
}
