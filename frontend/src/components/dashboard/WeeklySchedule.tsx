import type { CSSProperties } from 'react';
import { classColor } from '@/utils/classColor';

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
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[640px]">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `140px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="h-10" />
          {days.map((day) => (
            <div
              key={day.id}
              className="flex h-10 items-center justify-center rounded-2xl bg-slate-50 text-sm font-semibold text-slate-600"
            >
              {day.label}
            </div>
          ))}

          {slots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="flex min-h-[96px] flex-col justify-center rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-slate-700">{slot.label} horário</span>
                <span className="text-xs text-slate-500">{slot.time}</span>
              </div>

              {days.map((day) => {
                const key = `${slot.id}-${day.id}`;
                const items = cells[key] || [];
                if (!items.length) {
                  return (
                    <div
                      key={key}
                      className="flex min-h-[96px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-xs text-slate-400"
                    >
                      —
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    className="flex min-h-[96px] flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2"
                  >
                    {items.map((item, index) => {
                      const { background, textColor } = classColor(item.classId || item.label);
                      const style: CSSProperties = {
                        background,
                        color: textColor,
                      };
                      return (
                        <div
                          key={`${item.classId || item.label}-${index}`}
                          className="rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition hover:shadow-md"
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
