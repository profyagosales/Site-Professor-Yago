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
          className="grid gap-2 md:gap-3"
          style={{
            gridTemplateColumns: `140px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="h-8" />
          {days.map((day) => (
            <div
              key={day.id}
              className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              {day.label}
            </div>
          ))}

          {slots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="flex min-h-[56px] flex-col justify-center rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">{slot.label} horário</span>
                <span className="text-[11px] text-slate-500">{slot.time}</span>
              </div>

              {days.map((day) => {
                const key = `${slot.id}-${day.id}`;
                const items = cells[key] || [];
                if (!items.length) {
                  return (
                    <div
                      key={key}
                      className="flex min-h-[56px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-[11px] text-slate-300"
                    >
                      —
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    className="flex min-h-[56px] flex-col gap-1.5 rounded-2xl border border-slate-100 bg-white p-2"
                  >
                    {items.map((item, index) => {
                    const source = item.classId && item.classId.trim() ? item.classId : item.label;
                    const { background, textColor } = resolveClassColors(null, source);
                      const style: CSSProperties = {
                        background,
                        color: textColor,
                      };
                      return (
                        <div
                          key={`${item.classId || item.label}-${index}`}
                          className="rounded-xl px-2.5 py-2 text-xs font-medium shadow-sm transition hover:shadow-md"
                          style={style}
                        >
                          {item.label}
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
