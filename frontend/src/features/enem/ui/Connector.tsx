import React from 'react';

export function Connector({ kind, className }: { kind: 'E' | 'OU' | 'E/OU'; className?: string }) {
  return (
    <span className={['enem-connector', className].filter(Boolean).join(' ')}>
      {kind}
    </span>
  );
}
