import type { SesionFreeride, PuntoFreeride } from "@/lib/types";

const SESSIONS_STORAGE_KEY = "dh_freeride_sessions";
const DRAFT_STORAGE_KEY = "dh_freeride_draft";

export function obtenerSesionesFreeride(): SesionFreeride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function guardarSesionFreeride(sesion: SesionFreeride): void {
  if (typeof window === "undefined") return;
  try {
    const actuales = obtenerSesionesFreeride();
    // Guardamos la nueva sesión al principio (la más reciente primero)
    const actualizadas = [sesion, ...actuales.filter((s) => s.id !== sesion.id)];
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(actualizadas));
    // Notificamos a otros componentes que el storage cambió
    window.dispatchEvent(new Event("storage"));
  } catch (error) {
    console.error("Error al guardar la sesión de freeride:", error);
  }
}

export function eliminarSesionFreeride(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const actuales = obtenerSesionesFreeride();
    const filtradas = actuales.filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtradas));
    window.dispatchEvent(new Event("storage"));
  } catch (error) {
    console.error("Error al eliminar la sesión de freeride:", error);
  }
}

export function guardarDraftFreeride(puntos: PuntoFreeride[], startedAt: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ puntos, startedAt }));
  } catch {
    // Si la cuota de sessionStorage se excede, simplemente no persistimos el draft
  }
}

export function obtenerDraftFreeride(): { puntos: PuntoFreeride[]; startedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function limpiarDraftFreeride(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
