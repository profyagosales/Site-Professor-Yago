export function YSMark({
  color = '#FFF',
  size = 128,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox='0 0 64 64' aria-hidden fill='none'>
      <rect
        x='2.5'
        y='2.5'
        width='59'
        height='59'
        rx='14'
        stroke={color}
        strokeWidth='4'
        fill='rgba(255,255,255,.05)'
      />
      {/* Y */}
      <path d='M12 14h8l6 10 6-10h8l-10 16v18h-8V30L12 14Z' fill={color} />
      {/* S */}
      <path
        d='M36 44c0 4 3 6 8 6 4 0 7-1 9-2v-7c-2 1-5 2-8 2-2 0-3-.5-3-1.7 0-1.3 1.4-1.8 4-2.3l2.3-.4C53.7 37 58 34.9 58 29c0-6.2-5.6-9-13-9-4.7 0-9 1-12 2.6v7.2c3-1.6 7-2.9 11-2.9 3.2 0 4.5.9 4.5 2.2 0 1.4-1.6 2-4.5 2.6l-2 .4C37.9 33 36 35.7 36 40v4Z'
        fill={color}
      />
    </svg>
  );
}
