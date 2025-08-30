import React from 'react';

type Props = { src?: string; name?: string; size?: number; className?: string };
export default function Avatar({ src, name = '', size = 32, className = '' }: Props) {
  const [err, setErr] = React.useState(false);
  const initials = name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');

  return (
    <div className={`inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-medium ${className}`}
         style={{ width: size, height: size }}>
      {src && !err ? (
        <img src={src} alt={name} width={size} height={size}
             className="rounded-full object-cover w-full h-full"
             onError={()=>setErr(true)} />
      ) : (
        <span style={{ fontSize: Math.max(10, size*0.4) }}>{initials || '🙂'}</span>
      )}
    </div>
  );
}
