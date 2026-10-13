// Original side-view illustration of a downhill rider in attack position.
// Drawn with simple shapes so it scales and themes with the CSS tokens.
// `animated` spins the wheels and adds a small suspension bob (see the
// dh-spin / dh-bob keyframes in globals.css; both stop with reduced motion).

interface DownhillRiderProps {
  className?: string;
  animated?: boolean;
  /** Accessible name. Pass "" to mark it as decorative. */
  title?: string;
}

function Wheel({ cx, cy, animated }: { cx: number; cy: number; animated: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="24" fill="none" stroke="var(--text)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r="18" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
      <g className={animated ? "dh-spin" : undefined}>
        <line x1={cx - 18} y1={cy} x2={cx + 18} y2={cy} stroke="var(--text-muted)" strokeWidth="1.5" />
        <line x1={cx} y1={cy - 18} x2={cx} y2={cy + 18} stroke="var(--text-muted)" strokeWidth="1.5" />
        <line x1={cx - 13} y1={cy - 13} x2={cx + 13} y2={cy + 13} stroke="var(--text-muted)" strokeWidth="1.5" />
        <line x1={cx - 13} y1={cy + 13} x2={cx + 13} y2={cy - 13} stroke="var(--text-muted)" strokeWidth="1.5" />
      </g>
      <circle cx={cx} cy={cy} r="3" fill="var(--text)" />
    </g>
  );
}

export function DownhillRider({ className = "", animated = true, title = "Rider de downhill" }: DownhillRiderProps) {
  const decorative = title === "";
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {/* Tilt the whole bike forward: it is going down a slope. */}
      <g transform="rotate(10 100 100)">
        <Wheel cx={50} cy={100} animated={animated} />
        <Wheel cx={152} cy={100} animated={animated} />

        <g className={animated ? "dh-bob" : undefined}>
          {/* Frame */}
          <g stroke="var(--secondary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M50 100 L96 103" />
            <path d="M50 100 L84 64" />
            <path d="M96 103 L84 64" />
            <path d="M96 103 L136 72" />
            <path d="M84 64 L132 58" />
            <path d="M132 58 L138 72" />
          </g>
          {/* Fork and stem */}
          <path d="M136 66 L152 100" stroke="var(--text)" strokeWidth="5" strokeLinecap="round" />
          <path d="M132 58 L136 47 M128 46 L144 48" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
          {/* Saddle */}
          <path d="M76 61 L90 61" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />

          {/* Rider: legs, torso, arms */}
          <g stroke="var(--text)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M90 46 L106 72 L106 99" />
            <path d="M90 46 L92 76 L86 104" />
          </g>
          <path d="M90 46 L116 28" stroke="var(--secondary)" strokeWidth="13" strokeLinecap="round" />
          <path d="M116 30 L128 41 L138 47" stroke="var(--text)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Full-face helmet with visor */}
          <circle cx="127" cy="19" r="10" fill="var(--primary)" stroke="var(--text)" strokeWidth="2" />
          <path d="M120 12 L140 12" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
          <path d="M131 21 L137 21 L136 27 L129 27 Z" fill="var(--text)" />
        </g>
      </g>
    </svg>
  );
}
