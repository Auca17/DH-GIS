import type { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  ariaLabel?: string;
}

export function Skeleton({
  ariaLabel = "Cargando...",
  className = "",
  ...props
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`animate-pulse rounded bg-surface-muted/90 ${className}`}
      {...props}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
