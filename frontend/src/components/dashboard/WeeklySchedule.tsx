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
    <div className="pb-1">
      <div className="min-w-full">
        <div
          className="grid gap-1.5 md:gap-2"
          style={{
            gridTemplateColumns: `132px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="h-6" />
          {days.map((day) => (
            <div
              key={day.id}
              className="flex h-8 items-center justify-center rounded-xl bg-slate-100 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              {day.label}
            </div>
          ))}

          {slots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="flex min-h-[48px] flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px]">
                <span className="font-semibold text-slate-700">{slot.label} horário</span>
                <span className="text-[10px] text-slate-500">{slot.time}</span>
              </div>

              {days.map((day) => {
                const key = `${slot.id}-${day.id}`;
                const items = cells[key] || [];
                if (!items.length) {
                  return (
                    <div
                      key={key}
                      className="flex min-h-[48px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-[11px] text-slate-300"
                    >
                      —
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    className="flex min-h-[48px] flex-col justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  >
                    {items.map((item, index) => {
                      const palette = resolveClassColors(item.color ?? null, item.classId ?? item.label);
                      const ariaDiscipline = item.discipline?.trim() || item.label;
                      const classLabel = item.className?.trim() || item.label;
                      const timeInfo = slot.time?.trim() || slot.label;
                      const ariaLabel = `Aula de ${ariaDiscipline}${
                        classLabel && classLabel !== ariaDiscipline ? ` — ${classLabel}` : ''
                      } em ${day.label}/${timeInfo}`;
                      const chipStyle: CSSProperties = {
                        backgroundColor: palette.bg,
                        color: palette.fg,
                        maxWidth: '100%',
                      };

                      return (
                        <span
                          key={`${item.classId || item.label}-${index}`}
                          className="chip inline-flex w-full items-center justify-center text-center text-xs leading-tight"
                          style={chipStyle}
                          title={item.label}
                          aria-label={ariaLabel}
                        >
                          <span className="block w-full truncate">{item.label}</span>
                        </span>
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
