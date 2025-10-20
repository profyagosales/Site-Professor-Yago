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
    'flex flex-col rounded-2xl border border-ys-line bg-ys-card p-4 sm:p-6 shadow-ys-sm min-h-[320px]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = ['mt-4 flex-1 flex flex-col', contentClassName].filter(Boolean).join(' ');
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
