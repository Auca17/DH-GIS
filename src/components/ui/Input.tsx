"use client";

import type { InputHTMLAttributes } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
}

export function Input({
  id,
  label,
  helperText,
  error,
  className = "",
  ...props
}: InputProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 rounded border px-4 py-2.5 text-base text-text outline-none transition-colors duration-150 placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-danger bg-red-50/30 focus-visible:ring-danger"
            : "border-border bg-surface-muted focus:border-text-muted"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
