import type { HTMLAttributes, ReactNode } from "react";

export type NoticeVariant = "info" | "warning" | "error" | "success";

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: NoticeVariant;
  title?: string;
  role?: "status" | "alert";
  children: ReactNode;
}

const VARIANT_CONFIG: Record<
  NoticeVariant,
  {
    container: string;
    titleColor: string;
    icon: (className: string) => ReactNode;
  }
> = {
  info: {
    container: "border-border bg-surface-muted text-text",
    titleColor: "text-text font-semibold",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    container: "border-amber-300 bg-amber-50 text-amber-950",
    titleColor: "text-amber-950 font-semibold",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    container: "border-red-300 bg-red-50 text-red-950",
    titleColor: "text-red-950 font-semibold",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    container: "border-green-300 bg-green-50 text-green-950",
    titleColor: "text-green-950 font-semibold",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export function Notice({
  variant = "info",
  title,
  role,
  className = "",
  children,
  ...props
}: NoticeProps) {
  const config = VARIANT_CONFIG[variant];
  const effectiveRole = role ?? (variant === "error" ? "alert" : "status");

  return (
    <div
      role={effectiveRole}
      className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${config.container} ${className}`}
      {...props}
    >
      <div className="shrink-0 mt-0.5" aria-hidden="true">
        {config.icon("h-5 w-5")}
      </div>
      <div className="flex-1 space-y-1">
        {title ? <h4 className={`text-sm ${config.titleColor}`}>{title}</h4> : null}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
