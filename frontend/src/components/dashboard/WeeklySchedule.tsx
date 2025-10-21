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
    'flex w-full items-center justify-center rounded-2xl px-3 py-3 text-center',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const containerStyle: CSSProperties = hasColor
    ? { backgroundColor: color, color: textColor }
    : { color: textColor };

  const titleClasses = [
    'text-[18px] sm:text-[19px] font-semibold',
    hasColor ? '' : 'text-slate-900',
  ]
    .filter(Boolean)
    .join(' ');

  const subtitleClasses = [
    'text-[13px]',
    hasColor ? 'opacity-80' : 'text-slate-500',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} style={containerStyle} aria-label={ariaLabel}>
      <div className="leading-tight">
        <div className={titleClasses}>{turmaLabel}</div>
        <div className={subtitleClasses}>{disciplinaLabel}</div>
      </div>
    </div>
  );
}

function TimeCell({ title, time }: TimeCellProps) {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[13px] text-slate-500">{time}</div>
    </div>
  );
}

export function WeeklyScheduleTabs({ days, className = '', size = 'md' }: WeeklyScheduleTabsProps) {
  const baseClass =
    size === 'sm'
      ? 'px-3 py-1.5 text-[13px]'
      : 'px-4 py-1.5 text-sm';
  const containerClass = ['flex flex-wrap items-center gap-2 sm:gap-3', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {days.map((day) => (
        <button
          type="button"
          key={day.id}
          className={`rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 ${baseClass}`}
        >
          {day.label.toLowerCase()}
        </button>
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
  const baseClass = 'h-full rounded-2xl border border-slate-100 bg-white px-2 py-2';

  if (!items.length) {
    return (
      <div className={`${baseClass} flex`}>
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
    ? `${baseClass} flex h-full flex-col gap-2`
    : `${baseClass} flex h-full items-center justify-center`;

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
  const columnTemplate = `140px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div
      className="grid gap-3 sm:gap-4 auto-rows-[minmax(72px,1fr)] md:auto-rows-[minmax(78px,1fr)] lg:auto-rows-[minmax(88px,1fr)]"
      style={{ gridTemplateColumns: columnTemplate }}
    >
      {slots.map((slot) => (
        <Fragment key={`slot-${slot.id}`}>
          <div className="col-span-1">
            <TimeCell title={slot.label} time={slot.time} />
          </div>
          {days.map((day) => {
            const key = `${slot.id}-${day.id}`;
            const items = cells[key] || [];
            const timeInfo = slot.time?.trim() || slot.label;

            return (
              <div key={key} className="col-span-1">
                <ScheduleCell items={items} dayLabel={day.label} timeInfo={timeInfo} />
              </div>
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
    'schedule-card rounded-3xl bg-white shadow-sm border border-gray-100 p-5 sm:p-6 lg:p-7',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClass}>
      <div className="grid grid-rows-[auto_auto_1fr] gap-y-3">
        {title ? (
          <h2 className="m-0 text-[22px] sm:text-[24px] lg:text-[26px] font-semibold text-slate-900">{title}</h2>
        ) : null}
        <WeeklyScheduleTabs days={days} className={tabsClassName} size={tabsSize} />
        {children ?? <WeeklyScheduleGrid slots={slots} days={days} cells={cells} />}
      </div>
    </section>
  );
}
