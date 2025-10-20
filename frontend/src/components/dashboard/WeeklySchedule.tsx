import type { CSSProperties } from 'react';
import { resolveClassColors } from '@/utils/classColor';

type SlotConfig = {
  id: number;
  label: string;
  time: string;
};

type DayConfig = {
  id: number;
  label: string;
};

export type WeeklyScheduleCellItem = {
  classId: string | null;
  label: string;
  color?: string | null;
  className?: string | null;
  discipline?: string | null;
};

type WeeklyScheduleProps = {
  slots: SlotConfig[];
  days: DayConfig[];
  cells: Record<string, WeeklyScheduleCellItem[]>;
};

type WeeklyScheduleTabsProps = {
  days: DayConfig[];
  className?: string;
  size?: 'sm' | 'md';
};

type TurmaCellProps = {
  turmaLabel: string;
  disciplinaLabel: string;
  color: string;
  textColor: string;
  isEmpty?: boolean;
  ariaLabel?: string;
};

type TimeCellProps = {
  title: string;
  time: string;
};

function extractTurma(label: string): string {
  if (!label) return '';
  const parts = label.split('—');
  if (parts.length < 2) return '';
  return parts[1]?.trim() ?? '';
}

function extractDisciplina(label: string): string {
  if (!label) return '';
  const parts = label.split('—');
  return parts[0]?.trim() ?? label.trim();
}

function mapToCellData(item: WeeklyScheduleCellItem) {
  const turma = item.className?.trim() || extractTurma(item.label);
  const disciplina = item.discipline?.trim() || extractDisciplina(item.label);
  return {
    turmaLabel: turma || disciplina || item.label || '—',
    disciplinaLabel: disciplina || turma || item.label || '—',
  };
}

function TurmaCell({ turmaLabel, disciplinaLabel, color, textColor, isEmpty, ariaLabel }: TurmaCellProps) {
  if (isEmpty) {
    return (
      <div
        className="h-full rounded-2xl border-2 border-dashed border-slate-200 text-center text-xl text-slate-400"
        aria-label={ariaLabel}
      >
        <div className="grid h-full place-items-center">—</div>
      </div>
    );
  }

  return (
    <div
      className="h-full rounded-2xl text-center shadow-sm"
      style={{ backgroundColor: color }}
      aria-label={ariaLabel}
    >
      <div
        className="grid h-full place-items-center"
        style={{ color: textColor }}
      >
        <div className="flex flex-col items-center justify-center leading-tight">
          <div className="font-semibold tracking-tight" style={{ fontSize: 'clamp(16px, 1.9vw, 22px)' }}>
            {turmaLabel}
          </div>
          <div className="opacity-80" style={{ fontSize: 'clamp(11px, 1.3vw, 14px)', color: textColor }}>
            {disciplinaLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeCell({ title, time }: TimeCellProps) {
  return (
    <div className="h-full rounded-2xl bg-slate-50 text-center">
      <div className="grid h-full place-items-center">
        <div className="leading-snug">
          <div className="font-semibold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600">{time}</div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyScheduleTabs({ days, className = '', size = 'md' }: WeeklyScheduleTabsProps) {
  const baseClass =
    size === 'sm'
      ? 'px-3 py-1 text-xs'
      : 'px-4 py-1.5 text-sm';
  const containerClass = ['flex flex-wrap', className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {days.map((day) => (
        <div
          key={day.id}
          className={`inline-flex items-center rounded-full bg-slate-100 font-semibold uppercase tracking-wide text-slate-600 ${baseClass}`}
        >
          {day.label}
        </div>
      ))}
    </div>
  );
}

export default function WeeklySchedule({ slots, days, cells }: WeeklyScheduleProps) {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `180px repeat(${days.length}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${slots.length}, var(--ws-row-h))`,
    rowGap: 'var(--ws-gap-y)',
    columnGap: '14px',
    paddingTop: 0,
  };

  return (
    <section className="flex flex-1 flex-col px-6 pb-6">
      <div className="grid" style={gridStyle}>
        {slots.map((slot) => (
          <div key={`slot-${slot.id}`} className="contents">
            <div className="h-[var(--ws-row-h)]">
              <TimeCell title={`${slot.label} horário`} time={slot.time} />
            </div>
            {days.map((day) => {
              const key = `${slot.id}-${day.id}`;
              const items = cells[key] || [];
              if (!items.length) {
                const timeInfo = slot.time?.trim() || slot.label;
                return (
                  <div key={key} className="h-[var(--ws-row-h)]">
                    <TurmaCell
                      turmaLabel=""
                      disciplinaLabel=""
                      color="#ffffff"
                      textColor="#64748b"
                      isEmpty
                      ariaLabel={`Sem aula em ${day.label} / ${timeInfo}`}
                    />
                  </div>
                );
              }

              const stackClass = items.length > 1 ? 'grid h-full gap-2' : 'h-full';
              const stackStyle: CSSProperties | undefined =
                items.length > 1 ? { gridAutoRows: '1fr' } : undefined;

              return (
                <div key={key} className="h-[var(--ws-row-h)]">
                  <div className={stackClass} style={stackStyle}>
                    {items.map((item, index) => {
                      const palette = resolveClassColors(item.color ?? null, item.classId ?? item.label);
                      const { turmaLabel, disciplinaLabel } = mapToCellData(item);
                      const ariaDiscipline = disciplinaLabel || turmaLabel;
                      const classLabel = turmaLabel;
                      const timeInfo = slot.time?.trim() || slot.label;
                      const ariaLabel = `Aula de ${ariaDiscipline}${
                        classLabel && classLabel !== ariaDiscipline ? ` — ${classLabel}` : ''
                      } em ${day.label}/${timeInfo}`;

                      return (
                        <div key={`${item.classId || item.label}-${index}`} className="h-full">
                          <TurmaCell
                            turmaLabel={turmaLabel}
                            disciplinaLabel={disciplinaLabel}
                            color={palette.bg}
                            textColor={palette.fg}
                            ariaLabel={ariaLabel}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
