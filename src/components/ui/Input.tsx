"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`rounded-xl border border-border bg-surface-muted px-4 py-3 text-base text-foreground outline-none placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/30 ${className}`}
        {...props}
      />
    </div>
  );
}
