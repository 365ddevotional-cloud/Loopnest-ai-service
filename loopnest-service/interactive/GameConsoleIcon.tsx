interface GameConsoleIconProps {
  className?: string;
  size?: number;
}

export function GameConsoleIcon({ className = "", size = 24 }: GameConsoleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="5" width="20" height="14" rx="3" fill="white" stroke="#1a1a1a" strokeWidth="1.2" />
      <rect x="6" y="10" width="4" height="1.2" rx="0.6" fill="#1a1a1a" />
      <rect x="7.4" y="8.6" width="1.2" height="4" rx="0.6" fill="#1a1a1a" />
      <circle cx="16" cy="10" r="1.1" fill="#1a1a1a" />
      <circle cx="18.4" cy="10" r="1.1" fill="#1a1a1a" />
      <circle cx="17.2" cy="8.2" r="1.1" fill="#1a1a1a" />
      <circle cx="17.2" cy="11.8" r="1.1" fill="#1a1a1a" />
      <rect x="10.5" y="15" width="3" height="0.8" rx="0.4" fill="#1a1a1a" />
    </svg>
  );
}
