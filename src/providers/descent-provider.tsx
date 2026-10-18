"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  crearEstadoInicial,
  crearResultado,
  DEMO_TICK_MS,
  descentReducer,
  type DescentState,
} from "@/lib/descents/descent-machine";
import { useGeolocation, type InfoGps } from "@/hooks/use-geolocation";
import { useWakeLock, type EstadoWakeLock } from "@/hooks/use-wake-lock";
import { guardarResultado } from "@/lib/resultado-storage";
import { flattenPista } from "@/lib/track-geometry";
import type { TramoPista } from "@/lib/types";

// The descent lives here, in the /cerro/[id] layout, and not in a page: Next.js hides
// pages with <Activity> when you navigate and cleans up their effects. The layout is
// never hidden, so the GPS watch and the demo timer keep running across
// /cronometro -> /resultado. The rules themselves are in lib/descents/descent-machine.ts.

export type { DescentEstado, DescentState } from "@/lib/descents/descent-machine";

export interface DescentContextValue {
  state: DescentState;
  /** GPS of the current run (only on while a real run is armed or running). */
  gps: InfoGps;
  wakeLock: EstadoWakeLock;
  /** Starts the simulated run (demo mode). */
  startDemo: () => void;
  /** Real run: "Jugar" was pressed at this point; the clock starts 3 m away. */
  armar: (puntoJugar: { lat: number; lng: number }) => void;
  stop: () => void;
  /** Leaves the armed state without running. */
  cancelar: () => void;
  reset: () => void;
}

export const DescentContext = createContext<DescentContextValue | null>(null);

/** How often we check if the GPS signal was lost. */
const SIGNAL_CHECK_MS = 1000;

export function DescentProvider({
  cerroId,
  pista,
  children,
}: {
  cerroId: string;
  pista: TramoPista[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(descentReducer, cerroId, crearEstadoInicial);
  const flat = useMemo(() => flattenPista(pista), [pista]);

  const enCurso = state.estado === "armado" || state.estado === "corriendo";

  // Real GPS: every good reading goes to the reducer, which decides what to do.
  const gps = useGeolocation(state.modo === "gps" && enCurso, (lectura) => {
    dispatch({ type: "LECTURA", lectura, ahora: Date.now(), flat });
  });

  // Screen always on while armed or running (both modes).
  const wakeLock = useWakeLock(enCurso);

  // Demo mode: the simulated route advances once per second.
  useEffect(() => {
    if (state.modo !== "demo" || state.estado !== "corriendo") return;
    const intervalId = setInterval(() => {
      dispatch({ type: "TICK", ahora: Date.now(), flat });
    }, DEMO_TICK_MS);
    return () => clearInterval(intervalId);
  }, [state.modo, state.estado, flat]);

  // Real mode: once per second, check if the GPS went silent (signal lost).
  useEffect(() => {
    if (state.modo !== "gps" || state.estado !== "corriendo") return;
    const intervalId = setInterval(() => {
      dispatch({ type: "REVISAR_SENAL", ahora: Date.now() });
    }, SIGNAL_CHECK_MS);
    return () => clearInterval(intervalId);
  }, [state.modo, state.estado]);

  // When the run ends, keep the result in sessionStorage (once per run).
  const guardadoParaRunRef = useRef<number | null>(null);
  useEffect(() => {
    const resultado = crearResultado(state);
    if (resultado === null || state.startedAt === null) return;
    if (guardadoParaRunRef.current === state.startedAt) return;
    guardadoParaRunRef.current = state.startedAt;
    guardarResultado(resultado);
  }, [state]);

  const startDemo = useCallback(() => dispatch({ type: "START_DEMO", ahora: Date.now() }), []);
  const armar = useCallback(
    (puntoJugar: { lat: number; lng: number }) => dispatch({ type: "ARMAR", puntoJugar }),
    [],
  );
  const stop = useCallback(() => dispatch({ type: "STOP", ahora: Date.now() }), []);
  const cancelar = useCallback(() => dispatch({ type: "CANCELAR" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo<DescentContextValue>(
    () => ({ state, gps, wakeLock, startDemo, armar, stop, cancelar, reset }),
    [state, gps, wakeLock, startDemo, armar, stop, cancelar, reset],
  );

  return <DescentContext.Provider value={value}>{children}</DescentContext.Provider>;
}

export function useDescent(): DescentContextValue {
  const ctx = useContext(DescentContext);
  if (!ctx) {
    throw new Error("useDescent must be used within a DescentProvider");
  }
  return ctx;
}
