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
  const headingId = useId();
  const assistiveLabelId = ariaLabel ? `${headingId}-assistive` : undefined;
  const labelledBy = assistiveLabelId ? `${headingId} ${assistiveLabelId}` : headingId;

  const containerClass = [
    'dashboard-card flex h-full min-h-[22rem] min-w-0 flex-col gap-5 px-6 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:gap-6 sm:px-8 sm:py-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = ['flex flex-1 min-h-0 flex-col overflow-hidden', contentClassName].filter(Boolean).join(' ');

  return (
    <section className={containerClass} role="region" aria-labelledby={labelledBy}>
      {assistiveLabelId ? (
        <span id={assistiveLabelId} className="sr-only">
          {ariaLabel}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-4 sm:gap-5">
        <h3 id={headingId} className="card-title text-slate-900">
          {title}
        </h3>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className={contentClass}>{children}</div>
    </section>
  );
}
