import { Fragment, type CSSProperties, type ReactNode } from 'react';
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
  isEmpty?: boolean;
  ariaLabel?: string;
  className?: string;
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

function TurmaCell({ turmaLabel, disciplinaLabel, color, textColor, isEmpty, ariaLabel, className = '' }: TurmaCellProps) {
  if (isEmpty) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-xl text-slate-300 ${className}`.trim()}
        aria-label={ariaLabel}
      >
        —
      </div>
    );
  }

  const hasColor = Boolean(color && color !== '#ffffff');
  const containerClasses = [
    'flex h-full w-full flex-col items-center justify-center rounded-[18px] px-3 py-2 text-center leading-tight',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const containerStyle: CSSProperties | undefined = hasColor
    ? { backgroundColor: color ?? undefined, color: textColor ?? undefined }
    : undefined;

  const titleClasses = ['font-semibold', hasColor ? '' : 'text-slate-900']
    .filter(Boolean)
    .join(' ');

  const subtitleClasses = [hasColor ? 'opacity-80' : 'text-slate-700']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} style={containerStyle} aria-label={ariaLabel}>
      <div className={titleClasses} style={{ fontSize: 'var(--sched-grade-title)' }}>
        {turmaLabel}
      </div>
      <div className={subtitleClasses} style={{ fontSize: 'var(--sched-grade-sub)' }}>
        {disciplinaLabel}
      </div>
    </div>
  );
}

function TimeCell({ title, time }: TimeCellProps) {
  const normalizedTitle =
    title.toLowerCase().includes('horário') || !/\d/.test(title)
      ? title
      : `${title} horário`;

  return (
    <div className="flex h-[var(--sched-cell-h)] flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
      <div className="font-medium" style={{ fontSize: 'var(--sched-time-size)' }}>
        {normalizedTitle}
      </div>
      <div className="text-[11px] leading-tight text-slate-500">{time}</div>
    </div>
  );
}

export function WeeklyScheduleTabs({ days, className = '', size = 'md' }: WeeklyScheduleTabsProps) {
  const containerClass = ['flex items-center gap-[var(--sched-chip-gap)]', className]
    .filter(Boolean)
    .join(' ');

  const baseClass =
    size === 'sm'
      ? 'text-[var(--sched-daychip-size)]'
      : 'text-[var(--sched-daychip-size)]';

  return (
    <div className={containerClass} aria-hidden>
      {days.map((day) => (
        <span
          key={day.id}
          className={`px-2 py-[2px] rounded-full border border-slate-200 bg-slate-50 text-slate-600 ${baseClass}`}
        >
          {day.label.toLowerCase()}
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
  const baseClass = 'h-[var(--sched-cell-h)] rounded-2xl border border-slate-200 bg-white';

  if (!items.length) {
    return (
      <div className={`${baseClass} flex items-center justify-center`}>
        <TurmaCell
          turmaLabel=""
          disciplinaLabel=""
          color="#ffffff"
          textColor="#64748b"
          isEmpty
          ariaLabel={`Sem aula em ${dayLabel} / ${timeInfo}`}
          className="h-full"
        />
      </div>
    );
  }

  const multiple = items.length > 1;
  const containerClass = multiple
    ? `${baseClass} flex flex-col gap-2 p-2`
    : `${baseClass} flex items-center justify-center`;

  return (
    <div className={containerClass}>
      {items.map((item, index) => {
        const palette = resolveClassColors(item.color ?? null, item.classId ?? item.label);
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
            color={palette.bg}
            textColor={palette.fg}
            ariaLabel={ariaLabel}
            className={multiple ? 'flex-1' : 'h-full'}
          />
        );
      })}
    </div>
  );
}

export function WeeklyScheduleGrid({ slots, days, cells }: WeeklyScheduleProps) {
  const columnTemplate = `var(--sched-timecol-w) repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: columnTemplate,
        gap: 'var(--sched-gap)',
        rowGap: 'var(--sched-row-gap)',
      }}
    >
      <div aria-hidden />
      {days.map((day) => (
        <div
          key={`day-${day.id}`}
          className="text-[var(--sched-daychip-size)] text-slate-600 md:hidden"
        >
          {day.label.toLowerCase()}
        </div>
      ))}
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
    'schedule-card flex flex-col rounded-[var(--sched-card-radius)] border border-slate-100 bg-white px-[var(--sched-card-pad-x)] py-[var(--sched-card-pad-y)] shadow-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedTabsClassName = [
    'hidden md:flex items-center gap-[var(--sched-chip-gap)]',
    tabsClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClass}>
      <div className="flex items-center justify-between gap-4">
        {title ? (
          <h2
            className="m-0 font-semibold text-slate-900"
            style={{ fontSize: 'var(--sched-title-size)' }}
          >
            {title}
          </h2>
        ) : null}
        <WeeklyScheduleTabs days={days} className={resolvedTabsClassName} size={tabsSize} />
      </div>
      <div className="mt-3" />
      {children ?? <WeeklyScheduleGrid slots={slots} days={days} cells={cells} />}
    </section>
  );
}
