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
import { advanceSimulation } from "@/lib/gps-simulator";
import { guardarResultado } from "@/lib/resultado-storage";
import { flattenPista } from "@/lib/track-geometry";
import type { PuntoDescenso, ResultadoDescenso, TramoPista } from "@/lib/types";

export type DescentEstado = "idle" | "corriendo" | "detenido";

export interface DescentState {
  cerroId: string;
  estado: DescentEstado;
  startedAt: number | null;
  elapsedMs: number;
  path: PuntoDescenso[];
  puntoActual: PuntoDescenso | null;
  interrumpidoPorSos: boolean;
}

type DescentAction =
  | { type: "START"; startedAt: number }
  | { type: "TICK"; punto: PuntoDescenso; elapsedMs: number }
  | { type: "STOP" }
  | { type: "SOS" }
  | { type: "RESET" };

function crearEstadoInicial(cerroId: string): DescentState {
  return {
    cerroId,
    estado: "idle",
    startedAt: null,
    elapsedMs: 0,
    path: [],
    puntoActual: null,
    interrumpidoPorSos: false,
  };
}

function reducer(state: DescentState, action: DescentAction): DescentState {
  switch (action.type) {
    case "START":
      return {
        cerroId: state.cerroId,
        estado: "corriendo",
        startedAt: action.startedAt,
        elapsedMs: 0,
        path: [],
        puntoActual: null,
        interrumpidoPorSos: false,
      };
    case "TICK":
      if (state.estado !== "corriendo") return state;
      return {
        ...state,
        elapsedMs: action.elapsedMs,
        path: [...state.path, action.punto],
        puntoActual: action.punto,
      };
    case "STOP":
      // SOS also lands here conceptually (see SOS below): both end the run, STOP alone
      // never flips the interrupted flag.
      if (state.estado !== "corriendo") return state;
      return { ...state, estado: "detenido" };
    case "SOS":
      if (state.estado !== "corriendo") return state;
      return { ...state, estado: "detenido", interrumpidoPorSos: true };
    case "RESET":
      return crearEstadoInicial(state.cerroId);
    default:
      return state;
  }
}

export interface DescentContextValue {
  state: DescentState;
  start: () => void;
  stop: () => void;
  sos: () => void;
  reset: () => void;
}

export const DescentContext = createContext<DescentContextValue | null>(null);

const SIMULATION_TICK_MS = 1000;

export function DescentProvider({
  cerroId,
  pista,
  children,
}: {
  cerroId: string;
  pista: TramoPista[];
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, cerroId, crearEstadoInicial);

  const flatRef = useRef(flattenPista(pista));
  useEffect(() => {
    flatRef.current = flattenPista(pista);
  }, [pista]);

  // Read inside the interval below via a ref so the effect doesn't need to restart
  // (and drift its timing) on every single tick.
  const ultimoPuntoRef = useRef<PuntoDescenso | null>(null);
  useEffect(() => {
    ultimoPuntoRef.current = state.puntoActual;
  }, [state.puntoActual]);

  // GPS simulation loop, fixed at 1Hz. This is the ONLY thing allowed to recompute
  // position/elevation/speed — the fast on-screen clock (use-elapsed-time) is purely
  // a display tick and must never call advanceSimulation itself.
  useEffect(() => {
    if (state.estado !== "corriendo" || state.startedAt === null) return;
    const startedAt = state.startedAt;

    const intervalId = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const prevDistanceM = ultimoPuntoRef.current?.distanciaRecorridaM ?? 0;
      const { punto, completo } = advanceSimulation(
        flatRef.current,
        prevDistanceM,
        elapsedMs,
        SIMULATION_TICK_MS,
      );
      dispatch({ type: "TICK", punto, elapsedMs });
      if (completo) {
        dispatch({ type: "STOP" });
      }
    }, SIMULATION_TICK_MS);

    return () => clearInterval(intervalId);
  }, [state.estado, state.startedAt]);

  // Side effect reacting to the STOP/SOS transition: compute the derived result and
  // snapshot it to sessionStorage, once per run (guarded by startedAt, unique per START).
  const guardadoParaRunRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.estado !== "detenido" || state.startedAt === null) return;
    if (guardadoParaRunRef.current === state.startedAt) return;
    guardadoParaRunRef.current = state.startedAt;

    // Use distance actually covered (not the full track length) so an SOS-interrupted
    // run reports an honest average speed instead of one inflated by the untraveled rest.
    const distanciaRecorridaM = state.path.at(-1)?.distanciaRecorridaM ?? 0;
    const velocidadPromedioKmh =
      state.elapsedMs > 0
        ? distanciaRecorridaM / (state.elapsedMs / 3_600_000) / 1000
        : 0;
    const primero = state.path[0];
    const ultimo = state.path.at(-1);
    const cambioElevacionM =
      primero && ultimo ? primero.elevacionM - ultimo.elevacionM : 0;

    const resultado: ResultadoDescenso = {
      cerroId,
      tiempoMs: state.elapsedMs,
      velocidadPromedioKmh,
      cambioElevacionM,
      interrumpidoPorSos: state.interrumpidoPorSos,
      path: state.path,
      guardadoEn: Date.now(),
    };

    guardarResultado(resultado);
  }, [
    cerroId,
    state.estado,
    state.startedAt,
    state.elapsedMs,
    state.path,
    state.interrumpidoPorSos,
  ]);

  const start = useCallback(() => {
    dispatch({ type: "START", startedAt: Date.now() });
  }, []);
  const stop = useCallback(() => dispatch({ type: "STOP" }), []);
  const sos = useCallback(() => dispatch({ type: "SOS" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo<DescentContextValue>(
    () => ({ state, start, stop, sos, reset }),
    [state, start, stop, sos, reset],
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
