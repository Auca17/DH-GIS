import type { ResultadoDescenso } from "@/lib/types";

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

function storageKey(cerroId: string): string {
  return `ultimoDescenso:${cerroId}`;
}

export function guardarResultado(resultado: ResultadoDescenso): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      storageKey(resultado.cerroId),
      JSON.stringify(resultado),
    );
  } catch {
    // sessionStorage can throw (private mode, quota, disabled) — mock feature, safe to no-op.
  }
}

export function leerResultado(cerroId: string): ResultadoDescenso | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey(cerroId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ResultadoDescenso>;
    if (
      typeof parsed.cerroId !== "string" ||
      typeof parsed.tiempoMs !== "number" ||
      typeof parsed.velocidadPromedioKmh !== "number" ||
      typeof parsed.cambioElevacionM !== "number" ||
      typeof parsed.interrumpidoPorSos !== "boolean" ||
      !Array.isArray(parsed.path) ||
      typeof parsed.guardadoEn !== "number"
    ) {
      return null;
    }

    const esVencido = Date.now() - parsed.guardadoEn > DOS_HORAS_MS;
    if (esVencido) return null;

    return parsed as ResultadoDescenso;
  } catch {
    return null;
  }
}

export function limpiarResultado(cerroId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(cerroId));
  } catch {
    // no-op: see guardarResultado.
  }
}
