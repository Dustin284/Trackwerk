import React from 'react';

export default function TrackWerkLogo({ className = "h-10 w-10" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
    >
      <g className="text-blue-800">
        <path d="M85,15H15c-5.5,0-10,4.5-10,10v50c0,5.5,4.5,10,10,10h70c5.5,0,10-4.5,10-10V25C95,19.5,90.5,15,85,15z M90,75c0,2.8-2.2,5-5,5H15c-2.8,0-5-2.2-5-5V25c0-2.8,2.2-5,5-5h70c2.8,0,5,2.2,5,5V75z" />
        <path d="M30,35v30h5V40h20v25h5V40h10v25h5V35H30z" />
        <path d="M65,70c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S67.8,70,65,70z" />
        <rect x="25" y="65" width="30" height="5" />
      </g>
    </svg>
  );
} 