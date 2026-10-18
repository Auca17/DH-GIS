"use client";

import { useContext, useMemo, useSyncExternalStore } from "react";
import { crearResultado } from "@/lib/descents/descent-machine";
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

  // Same function the provider uses, so both give the same guardadoEn (and runId).
  if (ctx && ctx.state.cerroId === cerroId) {
    const enVivo = crearResultado(ctx.state);
    if (enVivo) return enVivo;
  }

  return snapshot;
}
