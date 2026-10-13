"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-b-2 border-black/20 bg-primary text-text shadow-sm hover:brightness-105 active:translate-y-px active:border-b active:brightness-95",
  secondary:
    "border-b-2 border-black/20 bg-secondary text-white shadow-sm hover:brightness-105 active:translate-y-px active:border-b active:brightness-95",
  danger:
    "border-b-2 border-black/20 bg-danger text-white shadow-sm hover:brightness-105 active:translate-y-px active:border-b active:brightness-95",
  ghost:
    "border border-border bg-transparent text-text hover:bg-surface-muted hover:border-text-muted active:translate-y-px",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded font-semibold tracking-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
