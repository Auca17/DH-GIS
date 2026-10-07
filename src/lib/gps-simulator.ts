import { getTotalDistanceM, type PuntoPlano } from "@/lib/track-geometry";
import type { Dificultad, PuntoDescenso } from "@/lib/types";

const BASE_SPEED_KMH: Record<Dificultad, number> = {
  facil: 18,
  intermedia: 28,
  dificil: 38,
};

export function getBaseSpeedKmh(dificultad: Dificultad): number {
  return BASE_SPEED_KMH[dificultad];
}

// Slow sine wobble so speed feels alive without being jittery; one full cycle
// every ~10s. Kept well under the 1Hz simulation tick so each tick sees a
// smoothly moving value rather than a step function.
const OSCILLATION_PERIOD_MS = 10_000;
const OSCILLATION_AMPLITUDE_KMH = 4;
const NOISE_AMPLITUDE_KMH = 2;
const MAX_DEVIATION_KMH = 6;
const MIN_SPEED_KMH = 8;

export function computeInstantSpeedKmh(
  dificultad: Dificultad,
  elapsedMs: number,
): number {
  const base = getBaseSpeedKmh(dificultad);
  const oscillation =
    Math.sin((2 * Math.PI * elapsedMs) / OSCILLATION_PERIOD_MS) *
    OSCILLATION_AMPLITUDE_KMH;
  const noise = (Math.random() * 2 - 1) * NOISE_AMPLITUDE_KMH;
  const raw = base + oscillation + noise;

  const clamped = Math.min(
    base + MAX_DEVIATION_KMH,
    Math.max(base - MAX_DEVIATION_KMH, raw),
  );
  return Math.max(MIN_SPEED_KMH, clamped);
}

/** Difficulty of the track stretch the rider is currently on, at a given cumulative distance. */
function findDificultadAt(flat: PuntoPlano[], distanceM: number): Dificultad {
  let actual = flat[0].dificultad;
  for (const punto of flat) {
    if (punto.distanciaAcumuladaM > distanceM) break;
    actual = punto.dificultad;
  }
  return actual;
}

interface PosicionInterpolada {
  lat: number;
  lng: number;
  elevacionM: number;
}

/** Linearly interpolates lat/lng/elevation between the two flattened points bracketing `distanceM`. */
function interpolarEn(flat: PuntoPlano[], distanceM: number): PosicionInterpolada {
  const primero = flat[0];
  if (distanceM <= primero.distanciaAcumuladaM) {
    return primero;
  }

  for (let i = 0; i < flat.length - 1; i += 1) {
    const a = flat[i];
    const b = flat[i + 1];
    if (distanceM <= b.distanciaAcumuladaM) {
      const largoTramoM = b.distanciaAcumuladaM - a.distanciaAcumuladaM;
      const t = largoTramoM === 0 ? 0 : (distanceM - a.distanciaAcumuladaM) / largoTramoM;
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
        elevacionM: a.elevacionM + (b.elevacionM - a.elevacionM) * t,
      };
    }
  }

  return flat[flat.length - 1];
}

export interface ResultadoAvance {
  punto: PuntoDescenso;
  completo: boolean;
}

/**
 * Advances the simulated descent by one tick. Pure function: given the flattened
 * track and the previous cumulative distance, computes the new position/speed and
 * whether the track has been fully covered.
 */
export function advanceSimulation(
  flat: PuntoPlano[],
  prevDistanceM: number,
  elapsedMs: number,
  tickMs: number,
): ResultadoAvance {
  const totalDistanceM = getTotalDistanceM(flat);
  const dificultadActual = findDificultadAt(flat, prevDistanceM);
  const velocidadKmh = computeInstantSpeedKmh(dificultadActual, elapsedMs);

  const avanceM = (velocidadKmh * tickMs) / 3_600_000 * 1000;
  const nuevaDistanciaM = Math.min(totalDistanceM, prevDistanceM + avanceM);
  const { lat, lng, elevacionM } = interpolarEn(flat, nuevaDistanciaM);

  const punto: PuntoDescenso = {
    lat,
    lng,
    elevacionM,
    distanciaRecorridaM: nuevaDistanciaM,
    timestampMs: elapsedMs,
    velocidadKmh,
  };

  return { punto, completo: nuevaDistanciaM >= totalDistanceM };
}
