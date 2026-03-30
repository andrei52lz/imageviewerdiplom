import React from 'react';

interface VisionKitIconProps {
  className?: string;
  size?: number;
}

export function VisionKitIcon({ className = '', size = 40 }: VisionKitIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer bounding box frame */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Corner brackets - top left */}
      <path
        d="M 10 25 L 10 10 L 25 10"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Corner brackets - top right */}
      <path
        d="M 75 10 L 90 10 L 90 25"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Corner brackets - bottom left */}
      <path
        d="M 10 75 L 10 90 L 25 90"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Corner brackets - bottom right */}
      <path
        d="M 75 90 L 90 90 L 90 75"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Eye shape in center */}
      <ellipse
        cx="50"
        cy="50"
        rx="25"
        ry="15"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Pupil */}
      <circle
        cx="50"
        cy="50"
        r="6"
        fill="currentColor"
      />
      
      {/* Iris highlight */}
      <circle
        cx="52"
        cy="48"
        r="2"
        fill="white"
        opacity="0.8"
      />
    </svg>
  );
}
