"use client";

import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-5 shadow-sm text-text ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
