"use client";

interface RatingStarsProps {
  rating: number;
  className?: string;
}

const TOTAL_STARS = 5;

export function RatingStars({ rating, className = "" }: RatingStarsProps) {
  const estrellasLlenas = Math.round(rating);

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`${rating.toFixed(1)} de 5 estrellas`}
    >
      {Array.from({ length: TOTAL_STARS }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i < estrellasLlenas ? "text-brand" : "text-border"}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-foreground/60">{rating.toFixed(1)}</span>
    </div>
  );
}
