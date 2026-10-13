"use client";

import { type TextareaHTMLAttributes, useState } from "react";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  showCounter?: boolean;
}

export function Textarea({
  id,
  label,
  helperText,
  error,
  showCounter = false,
  maxLength,
  value,
  defaultValue,
  onChange,
  className = "",
  rows = 3,
  ...props
}: TextareaProps) {
  const [internalLength, setInternalLength] = useState(() => {
    if (typeof value === "string") return value.length;
    if (typeof defaultValue === "string") return defaultValue.length;
    return 0;
  });

  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const counterId = showCounter ? `${id}-counter` : undefined;
  const describedBy =
    [errorId, helperId, counterId].filter(Boolean).join(" ") || undefined;

  const currentLength =
    typeof value === "string" ? value.length : internalLength;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        {showCounter && maxLength ? (
          <span
            id={counterId}
            aria-live="polite"
            className="font-mono text-xs text-text-muted tabular-nums"
          >
            {`${currentLength}/${maxLength}`}
          </span>
        ) : null}
      </div>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setInternalLength(e.target.value.length);
          onChange?.(e);
        }}
        className={`rounded border px-4 py-2.5 text-base text-text outline-none transition-colors duration-150 placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed ${
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
