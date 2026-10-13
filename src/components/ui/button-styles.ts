// Button look shared by <Button> and by links that must look like buttons.
// This file has no "use client" so Server Components (not-found, about) can
// call buttonClassName() too. A link styled as a button avoids nesting a
// <button> inside an <a>, which is invalid HTML and confuses screen readers.

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "md" | "lg";

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

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded font-semibold tracking-normal transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${extra}`.trim();
}
