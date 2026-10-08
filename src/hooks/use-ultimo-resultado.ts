"use client";

import { useContext, useMemo, useSyncExternalStore } from "react";
import { leerResultadoCrudo, parsearResultado } from "@/lib/resultado-storage";
import type { ResultadoDescenso } from "@/lib/types";
import { DescentContext } from "@/providers/descent-provider";

// sessionStorage never notifies same-tab listeners, so there is nothing to subscribe
// to; useSyncExternalStore is used purely for its SSR-safe snapshot semantics
// (getServerSnapshot keeps the server render at `null`, deterministically, while the
// client is allowed to read the real value without a hydration-mismatch error).
function sinSuscripcion() {
  return () => {};
}

/**
 * Returns the last descent result for `cerroId`, preferring the live Context (richer:
 * includes the full path) and falling back to the sessionStorage snapshot written at
 * STOP/SOS time. Safe to call with no DescentProvider mounted, or on a fresh page
 * load/refresh where the Context has reset to "idle" — in that case the sessionStorage
 * fallback takes over, or this returns null so the caller can render an honest empty
 * state.
 */
export function useUltimoResultado(cerroId: string): ResultadoDescenso | null {
  const ctx = useContext(DescentContext);
  // The snapshot is the raw string (stable between reads); it is parsed only
  // when that string changes.
  const raw = useSyncExternalStore(
    sinSuscripcion,
    () => leerResultadoCrudo(cerroId),
    () => null,
  );
  const snapshot = useMemo(() => parsearResultado(raw), [raw]);

  if (ctx && ctx.state.cerroId === cerroId && ctx.state.estado === "detenido") {
    const { state } = ctx;
    const distanciaRecorridaM = state.path.at(-1)?.distanciaRecorridaM ?? 0;
    const velocidadPromedioKmh =
      state.elapsedMs > 0
        ? distanciaRecorridaM / (state.elapsedMs / 3_600_000) / 1000
        : 0;
    const primero = state.path[0];
    const ultimo = state.path.at(-1);
    const cambioElevacionM =
      primero && ultimo ? primero.elevacionM - ultimo.elevacionM : 0;

    return {
      cerroId: state.cerroId,
      tiempoMs: state.elapsedMs,
      velocidadPromedioKmh,
      cambioElevacionM,
      interrumpidoPorSos: state.interrumpidoPorSos,
      path: state.path,
      // Derived purely from state (start + elapsed), not wall-clock-at-render: this
      // approximates the stop timestamp and keeps the hook's render body pure.
      guardadoEn: (state.startedAt ?? 0) + state.elapsedMs,
    };
  }

  return snapshot;
}
