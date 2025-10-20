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

export default function WeeklySchedule({ slots, days, cells }: WeeklyScheduleProps) {
  return (
    <div className="h-full overflow-x-auto pb-1">
      <div className="h-full min-w-full">
        <div
          className="schedule-grid grid h-full"
          style={{
            gridTemplateColumns: `132px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="h-6" />
          {days.map((day) => (
            <div
              key={day.id}
              className="flex h-8 items-center justify-center rounded-xl bg-slate-100 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              {day.label}
            </div>
          ))}

          {slots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="schedule-slot">
                <span className="schedule-slot-label">{slot.label} horário</span>
                <span className="schedule-slot-time">{slot.time}</span>
              </div>

              {days.map((day) => {
                const key = `${slot.id}-${day.id}`;
                const items = cells[key] || [];
                const timeInfo = slot.time?.trim() || slot.label;
                if (!items.length) {
                  return (
                    <div key={key} className="schedule-cell schedule-empty" aria-label={`Sem aula em ${day.label} / ${timeInfo}`}>
                      —
                    </div>
                  );
                }

                return (
                  <div key={key} className="schedule-cell-stack">
                    {items.map((item, index) => {
                      const palette = resolveClassColors(item.color ?? null, item.classId ?? item.label);
                      const ariaDiscipline = item.discipline?.trim() || item.label;
                      const classLabel = item.className?.trim() || item.label;
                      const ariaLabel = `Aula de ${ariaDiscipline}${
                        classLabel && classLabel !== ariaDiscipline ? ` — ${classLabel}` : ''
                      } em ${day.label}/${timeInfo}`;
                      const itemStyle: CSSProperties = {
                        backgroundColor: palette.bg,
                        color: palette.fg,
                      };

                      return (
                        <div
                          key={`${item.classId || item.label}-${index}`}
                          className="schedule-cell schedule-filled"
                          style={itemStyle}
                          title={item.label}
                          aria-label={ariaLabel}
                        >
                          <span className="schedule-cell-title">{item.label}</span>
                          {item.discipline && item.discipline !== item.label ? (
                            <span className="schedule-cell-subtitle">{item.discipline}</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
