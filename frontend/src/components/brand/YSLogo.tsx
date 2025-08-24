import React from 'react';

type Props = { size?: number; tone?: string; className?: string };

export default function YSLogo({ size = 128, tone = '#ff6a00', className = '' }: Props) {
  const s = size;
  return (
    <div className={`brand-glow ${className}`} style={{ width: s, height: s }}>
      <svg viewBox="0 0 100 100" width={s} height={s} role="img" aria-label="YS">
        <rect x="8" y="8" width="84" height="84" rx="22" ry="22"
              fill="none" stroke={tone} strokeWidth="7" />
        <path d="M28 30 L42 48 L42 70" stroke={tone} strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M58 30 C75 30, 75 46, 58 46 C41 46, 41 62, 58 62 C73 62, 73 70, 60 72"
              stroke={tone} strokeWidth="9" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  );
}
export function IconProfessor({ size=18 }: {size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12Zm0 2c-4 0-7.5 2.2-7.5 5v1h15v-1c0-2.8-3.5-5-7.5-5Z"/>
  </svg>;
}
export function IconAluno({ size=18 }: {size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 3 2 8l10 5 8-4v6h2V8l-10-5Zm0 13-6-3v3l6 3 6-3v-3l-6 3Z"/>
  </svg>;
}
