import type { CSSProperties } from 'react';

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

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const convert = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = Math.round(convert(hue + 1 / 3) * 255);
  const g = Math.round(convert(hue) * 255);
  const b = Math.round(convert(hue - 1 / 3) * 255);
  return { r, g, b };
}

function classColor(classId?: string | null) {
  const base = classId && classId.trim() ? classId.trim() : 'default';
  const hue = hashString(base);
  const saturation = 0.68;
  const lightness = 0.58;
  const { r, g, b } = hslToRgb(hue, saturation, lightness);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const textColor = luminance > 0.6 ? '#0f172a' : '#ffffff';
  const background = `hsl(${hue}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
  return { background, textColor };
}

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
                      const { background, textColor } = classColor(item.classId || item.label);
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
