import type { ReactNode } from 'react';
import { resolveClassColors } from '@/utils/classColor';

type ClassCardProps = {
  id: string;
  name: string;
  subject?: string | null;
  year?: number | null;
  studentsCount: number;
  teachersCount: number;
  color?: string | null;
  footer?: ReactNode;
  onClick?: () => void;
};

export function ClassCard({
  id,
  name,
  subject,
  studentsCount,
  teachersCount,
  color,
  footer,
  onClick,
}: ClassCardProps) {
  const { background, textColor } = resolveClassColors(color ?? null, id);
  const isDark = textColor === '#ffffff';
  const badgeBackground = isDark ? 'bg-white/25 text-white' : 'bg-white/70 text-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      style={{ background, color: textColor }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/10 opacity-0 transition group-hover:opacity-60" />
      <div className="relative flex flex-1 flex-col gap-4 p-6 text-left">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
            Turma
          </span>
          <h2 className="text-2xl font-semibold leading-tight">{name}</h2>
          {subject && <p className="text-sm font-medium opacity-80">{subject}</p>}
        </div>

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
