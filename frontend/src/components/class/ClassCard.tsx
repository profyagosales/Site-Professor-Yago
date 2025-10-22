import type { CSSProperties, ReactNode } from 'react';
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
  const palette = resolveClassColors(color ?? null, id);
  const isDark = palette.fg.toLowerCase() === '#ffffff';
  const badgeBackground = isDark ? 'bg-white/25 text-white' : 'bg-white/70 text-slate-700';
  const subTextClass = isDark ? 'text-white/90' : 'text-slate-800';
  const badgeMutedClass = isDark ? 'text-white/70' : 'text-slate-500';

  const cardStyle: CSSProperties = {
    '--class-card-bg': palette.bg,
    '--class-card-hover-bg': palette.hoverBg,
    '--class-card-text': palette.fg,
  } as CSSProperties;

  const metaParts: string[] = [];
  if (seriesLabel) {
    metaParts.push(seriesLabel);
  }
  if (year) {
    metaParts.push(`${year}`);
  }

  const badgeItems: string[] = [];
  if (metaParts.length) {
    badgeItems.push(metaParts.join(' • '));
  }
  badgeItems.push(`Alunos: ${studentsCount}`);
  badgeItems.push(`Professores: ${teachersCount}`);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Turma ${name} — ${seriesLabel ?? ''} — ${studentsCount} alunos`}
      className="class-card group relative flex w-full flex-col overflow-hidden rounded-lg shadow-sm p-4 min-h-[120px] transition transform hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      style={cardStyle}
    >
      <div className="relative flex flex-1 flex-col gap-4 text-left" style={{ background: 'var(--class-card-bg)', color: 'var(--class-card-text)' }}>
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeMutedClass}`}>
              Turma
            </span>
              <h2 className="text-2xl font-semibold leading-snug" style={{ color: palette.fg }}>
              {name}
            </h2>
            {subject && <p className={`text-sm font-medium ${subTextClass}`}>{subject}</p>}
          </div>
          {actions ? (
            <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </header>

        <div className="mt-auto flex flex-wrap gap-2 text-sm font-medium">
          {badgeItems.map((label) => (
            <span key={label} className={`inline-flex items-center rounded-full px-3 py-1 ${badgeBackground}`}>
              {label}
            </span>
          ))}
        </div>
        {footer && <div className={`mt-2 text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{footer}</div>}
      </div>
    </button>
  );
}

export type { ClassCardProps };
