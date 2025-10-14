import { Fragment, type ReactNode } from 'react';

export type ScheduleEntry = {
  day: string;
  slot: number;
  label: string;
};

type ScheduleTableProps = {
  schedules?: ScheduleEntry[];
  schedule?: ScheduleEntry[];
  emptyPlaceholder?: ReactNode;
};

const SLOTS = [
  { id: 1, label: '1º', time: '07:15–08:45' },
  { id: 2, label: '2º', time: '09:00–10:30' },
  { id: 3, label: '3º', time: '10:45–12:15' },
];

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

function createKey(day: string, slot: number) {
  return `${day}-${slot}`;
}

export default function ScheduleTable({ schedules, schedule, emptyPlaceholder }: ScheduleTableProps) {
  const source = Array.isArray(schedules)
    ? schedules
    : Array.isArray(schedule)
      ? schedule
      : [];

  const map = new Map<string, string>();
  source.forEach((entry) => {
    if (!entry) return;
    const { day, slot, label } = entry;
    if (!day || typeof slot !== 'number') return;
    map.set(createKey(day, slot), label || '—');
  });

  if (!source.length && emptyPlaceholder) {
    return <>{emptyPlaceholder}</>;
  }

  return (
    <div className="bg-white rounded-2xl shadow p-3">
      <div className="grid [grid-template-columns:140px_repeat(5,1fr)] gap-1.5">
        <div />
        {DAYS.map((day) => (
          <div key={day} className="font-extrabold bg-[#fff3e9] rounded-lg p-2.5 text-center text-[#ff7a00]">
            {day}
          </div>
        ))}
        {SLOTS.map((slot) => (
          <Fragment key={slot.id}>
            <div className="bg-[#f6f7fb] rounded-lg p-2.5 font-bold flex flex-col gap-1">
              {slot.label}
              <span className="text-xs text-ys-ink-2">{slot.time}</span>
            </div>
            {DAYS.map((day) => (
              <div
                key={createKey(day, slot.id)}
                className="bg-white border border-dashed border-gray-200 rounded-lg min-h-[52px] flex items-center justify-center p-1.5 text-center"
              >
                {map.get(createKey(day, slot.id)) ?? '—'}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
