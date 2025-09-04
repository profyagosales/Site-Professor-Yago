import React from 'react';

export default function BoardIcon({ className = 'w-6 h-6 text-orange' }) {
  return (
    <svg
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect x='3' y='4' width='18' height='12' rx='2' ry='2' />
      <path strokeLinecap='round' strokeLinejoin='round' d='M7 20h10M12 16v4' />
    </svg>
  );
}
