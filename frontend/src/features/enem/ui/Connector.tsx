import React from 'react';

export function Connector({ kind }: { kind: 'E' | 'OU' | 'E/OU' }) {
  return (
    <span className="mx-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black/70" style={{ backgroundColor: 'rgba(15,23,42,0.08)' }}>
      {kind}
    </span>
  );
}
