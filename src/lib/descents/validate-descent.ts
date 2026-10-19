// Checks the body of POST /api/descents. The client is never trusted: every field
// is checked here before anything is written to the database.
// Messages are in Spanish because the result screen shows them as they are.
//
// This function only checks that the data is well formed (types, numbers, dates).
// Deciding if the run is VALID for the ranking (too fast, SOS, track rules) is done
// in descent-rules.ts and the route.
//
// NoSQL injection: every field must have the exact type we expect. An object such as
// { "$ne": null } is never a string or a number, so it is rejected here and never
// reaches a MongoDB filter. The client sends no ObjectId: the server looks the trail
// up by slug and the user by name.
import { MAX_DURATION_MS, MAX_TRACK_POINTS } from "@/lib/gps/config";
import type { PuntoRastro } from "@/lib/types";

export interface DescentInput {
  runId: string;
  trailSlug: string;
  startedAt: Date;
  durationMs: number;
  avgSpeedKmh: number;
  elevationChangeM: number;
  endedBySos: boolean;
  isDemo: boolean;
  track: PuntoRastro[];
  /** Bike chosen before the run (24-character hex id), or null. */
  bikeId: string | null;
}

export type DescentCheck = { ok: true; value: DescentInput } | { ok: false; message: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Lowercase letters, digits and dashes only: "circuito-dh-pequia", "circuito-dh-pequia-1760000000000".
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const RUN_ID_PATTERN = /^[a-z0-9-]{1,120}$/;
// The text form of an ObjectId: exactly 24 hexadecimal characters.
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

/**
 * Checks the track: an array of [lng, lat, t] with finite numbers, valid coordinates
 * and times that never go back. Returns an error message, or null when it is fine.
 */
function checkTrack(track: unknown): string | null {
  if (!Array.isArray(track)) return "El rastro GPS tiene que ser una lista de puntos.";
  if (track.length > MAX_TRACK_POINTS) {
    return `El rastro GPS puede tener hasta ${MAX_TRACK_POINTS} puntos.`;
  }
  let lastT = -1;
  for (const point of track) {
    if (!Array.isArray(point) || point.length !== 3 || !point.every(isFiniteNumber)) {
      return "Cada punto del rastro GPS tiene que ser [lng, lat, t] con números.";
    }
    const [lng, lat, t] = point as number[];
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return "El rastro GPS tiene un punto con coordenadas inválidas.";
    }
    if (t < 0 || t < lastT) return "Los tiempos del rastro GPS tienen que empezar en 0 o más y nunca ir hacia atrás.";
    lastT = t;
  }
  return null;
}

export function validateDescentBody(body: unknown): DescentCheck {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Faltan los datos del descenso." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.runId !== "string" || !RUN_ID_PATTERN.test(b.runId)) {
    return { ok: false, message: "El identificador de la corrida no es válido." };
  }
  if (typeof b.trailSlug !== "string" || !SLUG_PATTERN.test(b.trailSlug)) {
    return { ok: false, message: "El sendero no es válido." };
  }
  // startedAt may be an ISO string or milliseconds since 1970.
  if (typeof b.startedAt !== "string" && typeof b.startedAt !== "number") {
    return { ok: false, message: "Falta la hora de inicio del descenso." };
  }
  const startedAt = new Date(b.startedAt);
  if (Number.isNaN(startedAt.getTime())) {
    return { ok: false, message: "La hora de inicio del descenso no es una fecha válida." };
  }
  if (!isFiniteNumber(b.durationMs) || b.durationMs <= 0 || b.durationMs > MAX_DURATION_MS) {
    return { ok: false, message: "El tiempo del descenso tiene que estar entre 1 ms y 2 horas." };
  }
  if (!isFiniteNumber(b.avgSpeedKmh) || b.avgSpeedKmh < 0) {
    return { ok: false, message: "La velocidad promedio tiene que ser un número mayor o igual a 0." };
  }
  if (!isFiniteNumber(b.elevationChangeM)) {
    return { ok: false, message: "El desnivel tiene que ser un número." };
  }
  if (typeof b.endedBySos !== "boolean") {
    return { ok: false, message: "Falta indicar si el descenso terminó por SOS." };
  }
  if (typeof b.isDemo !== "boolean") {
    return { ok: false, message: "Falta indicar si el descenso es de modo demo." };
  }
  const trackError = checkTrack(b.track);
  if (trackError) {
    return { ok: false, message: trackError };
  }
  // Missing or null = no bike (signed out, or an older client).
  const bikeId = b.bikeId ?? null;
  if (bikeId !== null && (typeof bikeId !== "string" || !OBJECT_ID_PATTERN.test(bikeId))) {
    return { ok: false, message: "La bici elegida no es válida." };
  }

  return {
    ok: true,
    value: {
      runId: b.runId,
      trailSlug: b.trailSlug,
      startedAt,
      durationMs: b.durationMs,
      avgSpeedKmh: b.avgSpeedKmh,
      elevationChangeM: b.elevationChangeM,
      endedBySos: b.endedBySos,
      isDemo: b.isDemo,
      track: b.track as PuntoRastro[],
      bikeId,
    },
  };
}
