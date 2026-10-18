"use client";

import type { SelectHTMLAttributes } from "react";

// Same look as Input, for a closed list of options (level, bike type, wheel size).

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function Select({ id, label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        className={`min-h-11 rounded border border-border bg-surface-muted px-4 py-2.5 text-base text-text outline-none transition-colors duration-150 focus:border-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
