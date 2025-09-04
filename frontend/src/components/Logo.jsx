import React from 'react';

const Logo = () => (
  <div className='flex items-center'>
    <svg
      width='32'
      height='32'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='text-orange'
    >
      <path d='M12 2L2 7l10 5 10-5-10-5z' fill='currentColor' />
      <path
        d='M4 10v6l8 4 8-4v-6'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinejoin='round'
      />
    </svg>
    <span className='ml-2 font-bold text-orange'>Professor Yago</span>
  </div>
);

export default Logo;
