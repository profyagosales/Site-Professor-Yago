import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { getClassColor, isColorLight } from '@/features/schedule/colors';

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

type WeeklyScheduleCardProps = WeeklyScheduleProps & {
  title?: string;
  className?: string;
  tabsClassName?: string;
  tabsSize?: 'sm' | 'md';
  children?: ReactNode;
};

type TurmaCellProps = {
  turmaLabel: string;
  disciplinaLabel: string;
  color: string;
  textColor: string;
  ariaLabel?: string;
  className?: string;
};

type PlaceholderCellProps = {
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

function TurmaCell({ turmaLabel, disciplinaLabel, color, textColor, ariaLabel, className = '' }: TurmaCellProps) {
  const hasColor = Boolean(color && color !== '#ffffff');
  const containerClasses = [
    'flex h-full w-full items-center justify-center rounded-2xl px-4 text-center shadow-[0_1px_8px_rgba(0,0,0,.06)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const containerStyle: CSSProperties | undefined = hasColor
    ? { backgroundColor: color ?? undefined, color: textColor ?? undefined }
    : undefined;

  const gradeClasses = ['font-bold', hasColor ? '' : 'text-slate-900']
    .filter(Boolean)
    .join(' ');

  const subjectClasses = [hasColor ? 'opacity-90' : 'text-slate-600']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} style={containerStyle} aria-label={ariaLabel}>
      <div className="leading-tight">
        <div className={gradeClasses} style={{ fontSize: 'var(--sched-grade-fz)' }}>
          {turmaLabel}
        </div>
        {disciplinaLabel ? (
          <div className={subjectClasses} style={{ fontSize: 'var(--sched-subj-fz)' }}>
            {disciplinaLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlaceholderCell({ ariaLabel }: PlaceholderCellProps) {
  return (
    <div
      className="flex h-[var(--sched-slot-h)] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400"
      aria-label={ariaLabel}
    >
      —
    </div>
  );
}

function TimeCell({ title, time }: TimeCellProps) {
  return (
    <div className="flex h-[var(--sched-slot-h)] flex-col items-start justify-center rounded-2xl border border-slate-100 bg-slate-50 px-4 text-left text-slate-700">
      <div className="font-semibold text-slate-700" style={{ fontSize: 'var(--sched-grade-fz)' }}>
        {title}
      </div>
      <div className="text-sm text-slate-500">{time}</div>
    </div>
  );
}

export function WeeklyScheduleTabs({ days, className = '', size = 'md' }: WeeklyScheduleTabsProps) {
  const containerClass = ['grid mb-2 gap-x-[var(--sched-gap-x)]', className]
    .filter(Boolean)
    .join(' ');

  const textSize =
    size === 'sm' ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm';

  return (
    <div
      className={containerClass}
      style={{
        gridTemplateColumns: `var(--sched-leftcol-w) repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      <div />
      {days.map((day) => (
        <span
          key={day.id}
          className={`inline-flex h-[var(--sched-chip-h)] w-full items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold uppercase tracking-wide ${textSize}`}
        >
          {day.label}
        </span>
      ))}
    </div>
  );
}

type ScheduleCellProps = {
  items: WeeklyScheduleCellItem[];
  dayLabel: string;
  timeInfo: string;
};

function ScheduleCell({ items, dayLabel, timeInfo }: ScheduleCellProps) {
  if (!items.length) {
    return (
      <PlaceholderCell ariaLabel={`Sem aula em ${dayLabel} / ${timeInfo}`} />
    );
  }

  const multiple = items.length > 1;

  return (
    <div className={`h-[var(--sched-slot-h)] ${multiple ? 'flex flex-col gap-2' : ''}`}>
      {items.map((item, index) => {
        const bg = getClassColor(item.classId ?? item.label);
        const text = isColorLight(bg) ? '#1F2937' : '#ffffff';
        const { turmaLabel, disciplinaLabel } = mapToCellData(item);
        const ariaDiscipline = disciplinaLabel || turmaLabel;
        const classLabel = turmaLabel;
        const ariaLabel = `Aula de ${ariaDiscipline}${
          classLabel && classLabel !== ariaDiscipline ? ` — ${classLabel}` : ''
        } em ${dayLabel}/${timeInfo}`;

        return (
          <TurmaCell
            key={`${item.classId || item.label}-${index}`}
            turmaLabel={turmaLabel}
            disciplinaLabel={disciplinaLabel}
            color={bg}
            textColor={text}
            ariaLabel={ariaLabel}
            className={multiple ? 'flex-1' : 'h-full'}
          />
        );
      })}
    </div>
  );
}

export function WeeklyScheduleGrid({ slots, days, cells }: WeeklyScheduleProps) {
  const columnTemplate = `var(--sched-leftcol-w) repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div
      className="grid gap-x-[var(--sched-gap-x)] gap-y-[var(--sched-gap-y)]"
      style={{ gridTemplateColumns: columnTemplate }}
    >
      {slots.map((slot) => (
        <Fragment key={`slot-${slot.id}`}>
          <TimeCell title={slot.label} time={slot.time} />
          {days.map((day) => {
            const key = `${slot.id}-${day.id}`;
            const items = cells[key] || [];
            const timeInfo = slot.time?.trim() || slot.label;

            return (
              <ScheduleCell key={key} items={items} dayLabel={day.label} timeInfo={timeInfo} />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

export default function WeeklyScheduleCard({
  slots,
  days,
  cells,
  title = 'Horário semanal',
  className = '',
  tabsClassName = '',
  tabsSize = 'md',
  children,
}: WeeklyScheduleCardProps) {
  const containerClass = [
    'schedule-card rounded-3xl bg-white px-[var(--sched-card-px)] py-[var(--sched-card-py)] shadow-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedTabsClassName = [
    'mb-2',
    tabsClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClass}>
      {title ? (
        <header className="mb-2">
          <h2
            className="font-semibold leading-tight text-slate-900"
            style={{ fontSize: 'var(--sched-title-fz)' }}
          >
            {title}
          </h2>
        </header>
      ) : null}
      {days.length ? (
        <WeeklyScheduleTabs days={days} className={resolvedTabsClassName} size={tabsSize} />
      ) : null}
      {children ?? <WeeklyScheduleGrid slots={slots} days={days} cells={cells} />}
    </section>
  );
}
