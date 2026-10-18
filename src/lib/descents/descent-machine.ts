// State machine of one descent, for both modes:
//   - "demo": the simulated route (gps-simulator.ts), one TICK per second.
//   - "gps":  the phone's real GPS, one LECTURA per good reading.
//
//   idle --ARMAR--> armado --LECTURA (moved > 3 m)--> corriendo --LECTURA (finish)--> detenido
//   idle --START_DEMO---------------------------------> corriendo --TICK (finish)----> detenido
//   corriendo --STOP--> detenido      armado --CANCELAR--> idle      any --RESET--> idle
//
// It is a pure reducer (no React, no browser), so tests/descent-machine.test.ts can
// play a whole descent with plain objects.
import { MAX_JUMPS_IN_A_ROW, SIGNAL_LOST_MS } from "@/lib/gps/config";
import {
  debeGuardarEnRastro,
  elevacionMasCercana,
  lecturaEsConfiable,
  llegoALaMeta,
  salioDeLaSalida,
  velocidadKmh,
  type LecturaGps,
} from "@/lib/gps/gps-math";
import { advanceSimulation } from "@/lib/gps-simulator";
import { getTotalDistanceM, haversineDistanceM, type PuntoPlano } from "@/lib/track-geometry";
import type {
  ModoCorrida,
  PuntoDescenso,
  PuntoRastro,
  ResultadoDescenso,
} from "@/lib/types";

export type DescentEstado = "idle" | "armado" | "corriendo" | "detenido";
export type MotivoFin = "meta" | "parar";

export interface DescentState {
  cerroId: string;
  modo: ModoCorrida;
  estado: DescentEstado;
  /** Where "Jugar" was pressed (gps mode). The clock starts 3 m away from here. */
  puntoJugar: { lat: number; lng: number } | null;
  startedAt: number | null;
  elapsedMs: number;
  path: PuntoDescenso[];
  track: PuntoRastro[];
  puntoActual: PuntoDescenso | null;
  motivoFin: MotivoFin | null;
  /** Clock time (Date.now()) of the last good GPS reading. */
  ultimaLecturaMs: number | null;
  /** True after SIGNAL_LOST_MS without good readings while running. */
  senalPerdida: boolean;
  /** Absurd jumps rejected in a row (see MAX_JUMPS_IN_A_ROW). */
  saltosSeguidos: number;
}

export type DescentAction =
  | { type: "START_DEMO"; ahora: number }
  | { type: "TICK"; ahora: number; flat: PuntoPlano[] }
  | { type: "ARMAR"; puntoJugar: { lat: number; lng: number } }
  | { type: "LECTURA"; lectura: LecturaGps; ahora: number; flat: PuntoPlano[] }
  | { type: "REVISAR_SENAL"; ahora: number }
  | { type: "STOP"; ahora: number }
  | { type: "CANCELAR" }
  | { type: "RESET" };

/** The demo route advances once per second. */
export const DEMO_TICK_MS = 1000;

export function crearEstadoInicial(cerroId: string): DescentState {
  return {
    cerroId,
    modo: "demo",
    estado: "idle",
    puntoJugar: null,
    startedAt: null,
    elapsedMs: 0,
    path: [],
    track: [],
    puntoActual: null,
    motivoFin: null,
    ultimaLecturaMs: null,
    senalPerdida: false,
    saltosSeguidos: 0,
  };
}

/** Adds a point to the path (always) and to the track (one per second, plus the last one). */
function agregarPunto(
  state: DescentState,
  punto: PuntoDescenso,
  esUltimo: boolean,
): Pick<DescentState, "path" | "track" | "puntoActual"> {
  const ultimoT = state.track.at(-1)?.[2] ?? null;
  const tMs = Math.round(punto.timestampMs);
  const guardar = esUltimo || debeGuardarEnRastro(ultimoT, tMs);
  // 6 decimals = about 10 cm: enough, and the document stays small.
  const nuevo: PuntoRastro = [Number(punto.lng.toFixed(6)), Number(punto.lat.toFixed(6)), tMs];
  return {
    path: [...state.path, punto],
    track: guardar ? [...state.track, nuevo] : state.track,
    puntoActual: punto,
  };
}

/** Ends a running descent with the Parar button. The time counts until `ahora`. */
function terminar(state: DescentState, ahora: number, motivo: MotivoFin): DescentState {
  const elapsedMs =
    state.startedAt === null ? state.elapsedMs : Math.max(state.elapsedMs, ahora - state.startedAt);
  return {
    ...state,
    estado: "detenido",
    elapsedMs,
    motivoFin: motivo,
  };
}

export function descentReducer(state: DescentState, action: DescentAction): DescentState {
  switch (action.type) {
    case "START_DEMO":
      return {
        ...crearEstadoInicial(state.cerroId),
        modo: "demo",
        estado: "corriendo",
        startedAt: action.ahora,
      };

    case "TICK": {
      if (state.modo !== "demo" || state.estado !== "corriendo" || state.startedAt === null) {
        return state;
      }
      const elapsedMs = action.ahora - state.startedAt;
      const { punto, completo } = advanceSimulation(
        action.flat,
        state.puntoActual?.distanciaRecorridaM ?? 0,
        elapsedMs,
        DEMO_TICK_MS,
      );
      return {
        ...state,
        ...agregarPunto(state, punto, completo),
        elapsedMs,
        estado: completo ? "detenido" : "corriendo",
        motivoFin: completo ? "meta" : null,
      };
    }

    case "ARMAR":
      return {
        ...crearEstadoInicial(state.cerroId),
        modo: "gps",
        estado: "armado",
        puntoJugar: action.puntoJugar,
      };

    case "LECTURA": {
      const { lectura, ahora, flat } = action;
      if (state.modo !== "gps" || !lecturaEsConfiable(lectura)) return state;

      // Armed: wait until the rider moves more than 3 m from the "Jugar" point.
      if (state.estado === "armado") {
        if (state.puntoJugar === null || !salioDeLaSalida(state.puntoJugar, lectura)) {
          return { ...state, ultimaLecturaMs: ahora };
        }
        const primero: PuntoDescenso = {
          lat: lectura.lat,
          lng: lectura.lng,
          elevacionM: elevacionMasCercana(flat, lectura),
          distanciaRecorridaM: 0,
          timestampMs: 0,
          velocidadKmh: 0,
        };
        const vacio = { ...state, path: [], track: [] };
        return {
          ...state,
          ...agregarPunto(vacio, primero, false),
          estado: "corriendo",
          startedAt: ahora,
          elapsedMs: 0,
          ultimaLecturaMs: ahora,
          senalPerdida: false,
          saltosSeguidos: 0,
        };
      }

      if (state.estado !== "corriendo" || state.startedAt === null || state.puntoActual === null) {
        return state;
      }

      const anterior = state.puntoActual;
      const tMs = ahora - state.startedAt;
      let velocidad = velocidadKmh(anterior, { lat: lectura.lat, lng: lectura.lng, timestampMs: tMs });
      let tramoM = haversineDistanceM(anterior, lectura);

      if (velocidad === null) {
        // Absurd jump: ignore it, unless it keeps happening (then the GPS really moved).
        if (state.saltosSeguidos + 1 < MAX_JUMPS_IN_A_ROW) {
          return { ...state, saltosSeguidos: state.saltosSeguidos + 1, ultimaLecturaMs: ahora };
        }
        // Accept the new position, but the jump adds no distance and no speed.
        velocidad = anterior.velocidadKmh;
        tramoM = 0;
      }

      const punto: PuntoDescenso = {
        lat: lectura.lat,
        lng: lectura.lng,
        elevacionM: elevacionMasCercana(flat, lectura),
        distanciaRecorridaM: anterior.distanciaRecorridaM + tramoM,
        timestampMs: tMs,
        velocidadKmh: velocidad,
      };
      const meta = flat.at(-1);
      const llego =
        meta !== undefined &&
        llegoALaMeta(lectura, meta, punto.distanciaRecorridaM, getTotalDistanceM(flat));

      return {
        ...state,
        ...agregarPunto(state, punto, llego),
        elapsedMs: tMs,
        ultimaLecturaMs: ahora,
        senalPerdida: false,
        saltosSeguidos: 0,
        estado: llego ? "detenido" : "corriendo",
        motivoFin: llego ? "meta" : null,
      };
    }

    case "REVISAR_SENAL": {
      if (state.modo !== "gps" || state.estado !== "corriendo" || state.ultimaLecturaMs === null) {
        return state;
      }
      const perdida = action.ahora - state.ultimaLecturaMs > SIGNAL_LOST_MS;
      // Same value: return the same object so React does not re-render.
      return perdida === state.senalPerdida ? state : { ...state, senalPerdida: perdida };
    }

    case "STOP":
      return state.estado === "corriendo" ? terminar(state, action.ahora, "parar") : state;

    case "CANCELAR":
      return state.estado === "armado" ? crearEstadoInicial(state.cerroId) : state;

    case "RESET":
      return crearEstadoInicial(state.cerroId);

    default:
      return state;
  }
}

/**
 * The result of a finished descent, or null if it has not finished.
 * Used by the provider (to keep it in sessionStorage) and by useUltimoResultado.
 * guardadoEn = startedAt + elapsedMs (not Date.now()): it is the same value every
 * time, so the runId built from it never changes and the run is saved only once.
 */
export function crearResultado(state: DescentState): ResultadoDescenso | null {
  if (state.estado !== "detenido" || state.startedAt === null) return null;

  // Distance actually covered (not the full trail), so an early stop gives an honest speed.
  const distanciaRecorridaM = state.path.at(-1)?.distanciaRecorridaM ?? 0;
  const velocidadPromedioKmh =
    state.elapsedMs > 0 ? (distanciaRecorridaM / state.elapsedMs) * 3600 : 0;
  const primero = state.path[0];
  const ultimo = state.path.at(-1);

  return {
    cerroId: state.cerroId,
    modo: state.modo,
    tiempoMs: state.elapsedMs,
    velocidadPromedioKmh,
    cambioElevacionM: primero && ultimo ? primero.elevacionM - ultimo.elevacionM : 0,
    // There is no SOS button: a run never ends by SOS. The field stays because the
    // result screen and the server still understand older runs saved with SOS.
    interrumpidoPorSos: false,
    path: state.path,
    track: state.track,
    guardadoEn: state.startedAt + state.elapsedMs,
  };
}
