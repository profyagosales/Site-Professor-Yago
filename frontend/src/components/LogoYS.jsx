import React from 'react';
const LogoYS = ({ size = 120 }) => (
  <div className='flex flex-col items-center'>
    <svg
      width={size}
      height={size / 2}
      viewBox='0 0 120 60'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <linearGradient id='logoGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='#ff7e5f' />
          <stop offset='100%' stopColor='#feb47b' />
        </linearGradient>
      </defs>
      <text
        x='10'
        y='45'
        fontSize='45'
        fontWeight='700'
        fill='url(#logoGradient)'
      >
        YS
      </text>
    </svg>
  </div>
);

export default LogoYS;
