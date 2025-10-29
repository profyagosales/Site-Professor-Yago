import React from 'react';

export function MandatoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
      {label}
    </span>
  );
}
