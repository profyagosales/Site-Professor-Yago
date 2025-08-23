import React from 'react';
import './login.css';

const words = ['Yago', 'School', 'Online'];

const LogoYS = ({ size = 120, showWords = true }) => (
  <div className="logo-ys">
    <svg
      width={size}
      height={size / 2}
      viewBox="0 0 120 60"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff7e5f">
            <animate
              attributeName="stop-color"
              values="#ff7e5f;#feb47b;#ff7e5f"
              dur="6s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#feb47b">
            <animate
              attributeName="stop-color"
              values="#feb47b;#ff7e5f;#feb47b"
              dur="6s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>
      <text
        x="10"
        y="45"
        fontSize="45"
        fontWeight="700"
        fill="url(#logoGradient)"
      >
        YS
      </text>
    </svg>
    {showWords && (
      <div className="rotating-words">
        {words.map((word, index) => (
          <span key={word} style={{ '--i': index }}>{word}</span>
        ))}
      </div>
    )}
  </div>
);

export default LogoYS;
