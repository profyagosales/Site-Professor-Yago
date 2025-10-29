import React from 'react';

export function ChoiceSelect({
  value,
  options,
  onChange,
}: {
  value?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px]"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecionar…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ChoiceMulti({
  values,
  options,
  onToggle,
}: {
  values: string[];
  options: { value: string; label: string }[];
  onToggle: (v: string, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <label
          key={o.value}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px]"
        >
          <input
            type="checkbox"
            className="scale-90"
            checked={values.includes(o.value)}
            onChange={(e) => onToggle(o.value, e.target.checked)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
