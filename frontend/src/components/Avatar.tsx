import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

const COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-pink-500',
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function Avatar({
  src,
  name = '',
  size = 32,
  className = '',
}: AvatarProps) {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() || '')
    .join('');
  const color = COLORS[hash(name) % COLORS.length];

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium ${color} ${className}`}
      style={{ width: size, height: size }}
    >
      {initials || '?'}
    </div>
  );
}
