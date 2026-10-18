"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Keeps the screen on during a descent with the Screen Wake Lock API.
// If the screen turns off, the browser stops the GPS and the run is lost.
//
// The browser releases the lock by itself when the tab is hidden (another app, screen
// locked). When the tab is visible again we ask for it again.
//
// Returns:
//   "inactivo"     -> not requested (activo = false)
//   "activo"       -> the screen will stay on
//   "no_soportado" -> this browser has no Wake Lock (show a warning)
//   "rechazado"    -> the browser said no (battery saver, for example)

export type EstadoWakeLock = "inactivo" | "activo" | "no_soportado" | "rechazado";

function sinSuscripcion() {
  return () => {};
}

export function useWakeLock(activo: boolean): EstadoWakeLock {
  const soportado = useSyncExternalStore(
    sinSuscripcion,
    () => "wakeLock" in navigator,
    () => true,
  );
  const [estado, setEstado] = useState<"activo" | "rechazado" | "inactivo">("inactivo");

  useEffect(() => {
    if (!activo || !soportado) return;

    let candado: WakeLockSentinel | null = null;
    let terminado = false;

    async function pedir() {
      try {
        const nuevo = await navigator.wakeLock.request("screen");
        if (terminado) {
          await nuevo.release(); // the run ended while we were waiting
          return;
        }
        candado = nuevo;
        setEstado("activo");
        nuevo.addEventListener("release", () => {
          if (!terminado) setEstado("inactivo");
        });
      } catch {
        if (!terminado) setEstado("rechazado");
      }
    }

    function alCambiarVisibilidad() {
      if (document.visibilityState === "visible" && (candado === null || candado.released)) {
        void pedir();
      }
    }

    void pedir();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      terminado = true;
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      void candado?.release();
    };
  }, [activo, soportado]);

  if (!activo) return "inactivo";
  if (!soportado) return "no_soportado";
  return estado;
}
