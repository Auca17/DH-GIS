// "DH" wordmark: amber tile with the letters and a burnt-orange slope stroke
// that reads as a downhill line. Pure SVG, so it works in Server Components.

interface DhLogoProps {
  size?: number;
  className?: string;
  /** Accessible name. Pass "" when a visible text label already names it. */
  title?: string;
}

export function DhLogo({ size = 32, className = "", title = "DH" }: DhLogoProps) {
  const decorative = title === "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      <rect width="64" height="64" rx="10" fill="var(--primary)" />
      {/* Downhill slope: from top-left to bottom-right, behind the letters. */}
      <path d="M4 18 L60 54" stroke="var(--secondary)" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="28"
        fontWeight="700"
        fill="var(--text)"
        letterSpacing="-1"
      >
        DH
      </text>
    </svg>
  );
}
