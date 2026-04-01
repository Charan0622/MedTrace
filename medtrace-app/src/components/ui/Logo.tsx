"use client";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  const id = `logo-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />

      {/* Shield outline */}
      <path
        d="M24 6C16 6 8 12 8 22C8 34 24 44 24 44C24 44 40 34 40 22C40 12 32 6 24 6Z"
        fill="white" fillOpacity="0.1"
        stroke="white" strokeWidth="1.5" strokeOpacity="0.3"
      />

      {/* EKG heartbeat pulse line */}
      <path
        d="M12 24 L18 24 L20 18 L24 32 L28 16 L30 24 L36 24"
        stroke="#4ADE80" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Red medical cross at top of shield */}
      <rect x="21" y="8.5" width="6" height="2" rx="1" fill="#EF4444" />
      <rect x="22.75" y="6.75" width="2.5" height="5.5" rx="1.25" fill="#EF4444" />

      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#166534" />
          <stop offset="0.5" stopColor="#15803D" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
