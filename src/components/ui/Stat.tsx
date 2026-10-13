import type { HTMLAttributes, ReactNode } from "react";

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  unit?: string;
  subtext?: string;
}

export function Stat({
  label,
  value,
  unit,
  subtext,
  className = "",
  ...props
}: StatProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 shadow-sm ${className}`}
      {...props}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-bold tracking-tight text-text tabular-nums lg:text-3xl">
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-medium text-text-muted">{unit}</span>
        ) : null}
      </div>
      {subtext ? (
        <span className="text-xs text-text-muted">{subtext}</span>
      ) : null}
    </div>
  );
}
