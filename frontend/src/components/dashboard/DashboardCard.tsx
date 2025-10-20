import { useId, type ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function DashboardCard({
  title,
  actions,
  className = '',
  contentClassName = '',
  children,
  ariaLabel,
}: DashboardCardProps) {
  const containerClass = [
    'flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-6 min-h-[22rem]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = ['mt-4 flex flex-1 flex-col overflow-hidden', contentClassName].filter(Boolean).join(' ');
  const headingId = useId();
  const regionLabel = ariaLabel ?? title;

  return (
    <section className={containerClass} role="region" aria-label={regionLabel} aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-3">
        <h3 id={headingId} className="card-title text-slate-900">
          {title}
        </h3>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className={contentClass}>{children}</div>
    </section>
  );
}
