// Small pure functions for the real GPS descent. No React, no browser APIs:
// they can be tested with plain numbers (tests/gps-math.test.ts).
import {
  END_RADIUS_M,
  MAX_ACCURACY_M,
  MAX_SPEED_KMH,
  MIN_PROGRESS_FOR_AUTO_END,
  SPEED_SMOOTHING,
  START_MOVE_M,
  TRACK_SAMPLE_MS,
} from "@/lib/gps/config";
import { haversineDistanceM, type PuntoPlano } from "@/lib/track-geometry";

/** A position as GeoJSON stores it: [longitude, latitude]. */
export type LngLat = [number, number];

/** One good GPS reading, already copied out of the browser's GeolocationPosition. */
export interface LecturaGps {
  lat: number;
  lng: number;
  /** Radius of the error circle, in meters (coords.accuracy). */
  accuracyM: number;
}

/** A position with a time, used to compute speed. */
export interface PuntoConTiempo {
  lat: number;
  lng: number;
  timestampMs: number;
}

/** Haversine distance in meters between two [lng, lat] positions. */
export function distanciaMetros(a: LngLat, b: LngLat): number {
  return haversineDistanceM({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] });
}

/** True when the reading is precise enough to use (accuracy of MAX_ACCURACY_M or better). */
export function lecturaEsConfiable(lectura: { accuracyM: number }): boolean {
  return Number.isFinite(lectura.accuracyM) && lectura.accuracyM <= MAX_ACCURACY_M;
}

/**
 * Smoothed speed in km/h from the previous point to the current one.
 * Returns null when the jump is absurd (faster than MAX_SPEED_KMH): the caller
 * must ignore that reading. Returns the previous speed when no time has passed.
 */
export function velocidadKmh(
  anterior: PuntoConTiempo & { velocidadKmh: number },
  actual: PuntoConTiempo,
): number | null {
  const dtMs = actual.timestampMs - anterior.timestampMs;
  if (dtMs <= 0) return anterior.velocidadKmh;

  const metros = haversineDistanceM(anterior, actual);
  const instantaneaKmh = (metros / dtMs) * 3600; // m/ms -> km/h
  if (instantaneaKmh > MAX_SPEED_KMH) return null;

  // Moving average: mostly the old speed, a bit of the new one. Removes the zigzag.
  const suavizada =
    anterior.velocidadKmh + SPEED_SMOOTHING * (instantaneaKmh - anterior.velocidadKmh);
  return Math.round(suavizada * 10) / 10;
}

/** True when the rider moved more than START_MOVE_M from the point where "Jugar" was pressed. */
export function salioDeLaSalida(
  puntoJugar: { lat: number; lng: number },
  lectura: { lat: number; lng: number },
): boolean {
  return haversineDistanceM(puntoJugar, lectura) > START_MOVE_M;
}

/**
 * True when the run must end by itself: the rider is within END_RADIUS_M of the
 * finish AND has covered at least MIN_PROGRESS_FOR_AUTO_END of the trail.
 */
export function llegoALaMeta(
  lectura: { lat: number; lng: number },
  meta: { lat: number; lng: number },
  recorridoM: number,
  largoTotalM: number,
): boolean {
  const cercaDeLaMeta = haversineDistanceM(lectura, meta) <= END_RADIUS_M;
  const avanzoLoSuficiente = recorridoM >= largoTotalM * MIN_PROGRESS_FOR_AUTO_END;
  return cercaDeLaMeta && avanzoLoSuficiente;
}

/**
 * Track sampling: true when the new point must be saved in the track.
 * The first point is always saved; after that, one point per TRACK_SAMPLE_MS at most.
 */
export function debeGuardarEnRastro(ultimoTMs: number | null, nuevoTMs: number): boolean {
  if (ultimoTMs === null) return true;
  return nuevoTMs - ultimoTMs >= TRACK_SAMPLE_MS;
}

/**
 * Elevation of the trail point closest to the reading. The phone's altitude is
 * usually null or wrong, so the spec says to take the elevation from the trail data.
 */
export function elevacionMasCercana(
  flat: PuntoPlano[],
  lectura: { lat: number; lng: number },
): number {
  let mejor = flat[0];
  let mejorDistanciaM = Infinity;
  for (const punto of flat) {
    const d = haversineDistanceM(punto, lectura);
    if (d < mejorDistanciaM) {
      mejorDistanciaM = d;
      mejor = punto;
    }
  }
  return mejor?.elevacionM ?? 0;
}
