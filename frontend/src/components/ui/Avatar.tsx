import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
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

export default function Avatar({ src, name = '', className = '' }: AvatarProps) {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const charCode = name.charCodeAt(0) || 0;
  const color = COLORS[charCode % COLORS.length];

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium ${color} ${className}`}
    >
      {initials || '?'}
    </div>
  );
}

