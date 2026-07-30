/** Elementos decorativos em SVG usados na landing page. */

export function GridPattern({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className}>
      <defs>
        <pattern id="gc-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <radialGradient id="gc-grid-fade" cx="50%" cy="0%" r="85%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="gc-grid-mask">
          <rect width="100%" height="100%" fill="url(#gc-grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#gc-grid)" mask="url(#gc-grid-mask)" />
    </svg>
  );
}

export function Sparkline({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 90"
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id="gc-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 70 L40 58 L80 64 L120 40 L160 48 L200 26 L240 34 L280 14 L320 20 L320 90 L0 90 Z"
        fill="url(#gc-spark)"
      />
      <path
        d="M0 70 L40 58 L80 64 L120 40 L160 48 L200 26 L240 34 L280 14 L320 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RingChart({
  className,
  value = 68,
}: {
  className?: string;
  value?: number;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="7"
      />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}
