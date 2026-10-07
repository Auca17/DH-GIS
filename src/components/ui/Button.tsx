"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

// Borde inferior marcado + el button-press (active:translate-y-px) dan una sensación
// "de instrumento" -- tecla física que se hunde -- en vez del botón plano genérico de
// Tailwind. El ghost usa tinte de marca en hover en vez de gris, para que se sienta
// parte del mismo sistema y no un control default.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-b-2 border-black/20 bg-brand text-brand-foreground shadow-lg shadow-brand/20 hover:brightness-110 active:translate-y-px active:border-b active:brightness-95",
  danger:
    "border-b-2 border-black/20 bg-danger text-white shadow-lg shadow-danger/20 hover:brightness-110 active:translate-y-px active:border-b active:brightness-95",
  ghost:
    "border border-border bg-transparent text-foreground hover:border-brand/50 hover:bg-brand/10 hover:text-brand active:translate-y-px",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold tracking-wide uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
