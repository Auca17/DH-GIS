import type { HTMLAttributes, ReactNode } from "react";
import type { Dificultad } from "@/lib/types";
import { getDifficulty } from "@/lib/difficulty";

export type BadgeVariant =
  | "difficulty"
  | "demo"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  difficulty?: Dificultad;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<Exclude<BadgeVariant, "difficulty">, string> = {
  demo: "border-secondary/40 bg-secondary/10 text-secondary font-mono tracking-wider font-bold",
  success: "border-green-300 bg-green-50 text-green-800 font-medium",
  warning: "border-amber-300 bg-amber-50 text-amber-900 font-medium",
  danger: "border-red-300 bg-red-50 text-red-800 font-medium",
  neutral: "border-border bg-surface-muted text-text-muted font-medium",
};

export function Badge({
  variant = "neutral",
  difficulty = "facil",
  className = "",
  children,
  ...props
}: BadgeProps) {
  if (variant === "difficulty") {
    const config = getDifficulty(difficulty);
    const difficultyClasses: Record<Dificultad, string> = {
      facil: "border-blue-300 bg-blue-50 text-blue-800",
      intermedia: "border-amber-300 bg-amber-50 text-amber-900",
      dificil: "border-red-300 bg-red-50 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold ${difficultyClasses[difficulty]} ${className}`}
        {...props}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: config.hex }}
          aria-hidden="true"
        />
        {children ?? config.label}
      </span>
    );
  }

  if (variant === "demo") {
    return (
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${VARIANT_STYLES.demo} ${className}`}
        {...props}
      >
        {children ?? "MODO DEMO"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${VARIANT_STYLES[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
