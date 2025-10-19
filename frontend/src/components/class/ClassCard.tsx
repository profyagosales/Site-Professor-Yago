import type { ReactNode } from 'react';
import { resolveClassColors } from '@/utils/classColor';

type ClassCardProps = {
  id: string;
  name: string;
  subject?: string | null;
  year?: number | null;
  seriesLabel?: string | null;
  studentsCount: number;
  teachersCount: number;
  color?: string | null;
  footer?: ReactNode;
  onClick?: () => void;
  actions?: ReactNode;
};

export function ClassCard({
  id,
  name,
  subject,
  year,
  seriesLabel,
  studentsCount,
  teachersCount,
  color,
  footer,
  onClick,
  actions,
}: ClassCardProps) {
  const { background, textColor } = resolveClassColors(color ?? null, id);
  const isDark = textColor === '#ffffff';
  const badgeBackground = isDark ? 'bg-white/25 text-white' : 'bg-white/70 text-slate-700';
  const subTextClass = isDark ? 'text-white/90' : 'text-slate-800';
  const metaTextClass = isDark ? 'text-white/75' : 'text-slate-600';
  const badgeMutedClass = isDark ? 'text-white/70' : 'text-slate-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-3xl shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      style={{ background, color: textColor }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/10 opacity-0 transition group-hover:opacity-50" />
      <div className="relative flex flex-1 flex-col gap-5 p-6 text-left">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeMutedClass}`}>
              Turma
            </span>
            <h2 className="text-2xl font-semibold leading-snug" style={{ color: textColor }}>
              {name}
            </h2>
            {subject && <p className={`text-sm font-medium ${subTextClass}`}>{subject}</p>}
            {(seriesLabel || year) && (
              <p className={`text-xs font-semibold uppercase tracking-wide ${metaTextClass}`}>
                {seriesLabel ? seriesLabel : null}
                {seriesLabel && year ? ' • ' : ''}
                {year ? `Ano letivo ${year}` : null}
              </p>
            )}
          </div>
          {actions ? (
            <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </header>

        <div className="mt-auto flex flex-wrap gap-2 text-sm font-medium">
          <span className={`inline-flex items-center rounded-full px-3 py-1 ${badgeBackground}`}>
            {studentsCount} aluno{studentsCount === 1 ? '' : 's'}
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 ${badgeBackground}`}>
            {teachersCount} docente{teachersCount === 1 ? '' : 's'}
          </span>
        </div>
        {footer && <div className={`mt-2 text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{footer}</div>}
      </div>
    </button>
  );
}

export type { ClassCardProps };
