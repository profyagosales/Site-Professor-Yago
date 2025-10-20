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
    <div className="h-full pb-1">
      <div className="min-w-full h-full">
        <div
          className="schedule-grid grid h-full gap-1.5 md:gap-2"
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
              <div className="flex min-h-[46px] flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px]">
                <span className="text-xs font-semibold text-slate-700">{slot.label} horário</span>
                <span className="text-[10px] text-slate-500">{slot.time}</span>
              </div>

              {days.map((day) => {
                const key = `${slot.id}-${day.id}`;
                const items = cells[key] || [];
                if (!items.length) {
                  return (
                    <div
                      key={key}
                      className="schedule-cell schedule-empty flex min-h-[46px] items-center justify-center border border-dashed border-slate-200 bg-white text-sm text-slate-400"
                    >
                      —
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex min-h-[46px] flex-col gap-2">
                    {items.map((item, index) => {
                      const palette = resolveClassColors(item.color ?? null, item.classId ?? item.label);
                      const ariaDiscipline = item.discipline?.trim() || item.label;
                      const classLabel = item.className?.trim() || item.label;
                      const timeInfo = slot.time?.trim() || slot.label;
                      const ariaLabel = `Aula de ${ariaDiscipline}${
                        classLabel && classLabel !== ariaDiscipline ? ` — ${classLabel}` : ''
                      } em ${day.label}/${timeInfo}`;
                      const itemStyle: CSSProperties = {
                        backgroundColor: palette.bg,
                        color: palette.fg,
                        width: '100%',
                      };

                      return (
                        <div
                          key={`${item.classId || item.label}-${index}`}
                          className="schedule-cell text-center font-medium leading-tight"
                          style={itemStyle}
                          title={item.label}
                          aria-label={ariaLabel}
                        >
                          <div className="flex w-full flex-col items-center justify-center gap-1">
                            <span className="block w-full truncate">{item.label}</span>
                            {item.discipline && item.discipline !== item.label ? (
                              <span className="block w-full truncate text-xs opacity-80">{item.discipline}</span>
                            ) : null}
                          </div>
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
