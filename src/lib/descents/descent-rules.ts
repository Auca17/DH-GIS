// Server rules that decide if a descent counts for the ranking (anti-cheat).
// Pure function: the route gives it the data, it answers the verdict.
// The phone is never trusted: these rules only look at what was sent and at the trail.
//
// Rules, in order (the first one that fails is the invalidReason):
//   1. "sos"                           ended with SOS
//   2. "empty track"                   fewer than 2 track points
//   3. "too fast"                      durationMs < trail.minValidTimeS
//   4. "did not start at the start"    first point farther than 30 + 25 m from the start (C2, in the route)
//   5. "did not reach the finish"      last point farther than 15 + 20 m from the finish
//   6. "implausible speed"             more than 90 km/h between two points 1 s or more apart
//   7. "gps signal lost"               more than 15 s between two track points
//   8. "track does not match the time" durationMs and the last track time differ by more than 15 s
import {
  END_RADIUS_M,
  END_TOLERANCE_M,
  MAX_SPEED_KMH,
  MAX_TRACK_GAP_MS,
  TRACK_SAMPLE_MS,
} from "@/lib/gps/config";
import { distanciaMetros, type LngLat } from "@/lib/gps/gps-math";
import type { DescentInput } from "@/lib/descents/validate-descent";

export interface Veredicto {
  status: "completed" | "interrupted";
  validated: boolean;
  invalidReason: string | null;
}

export interface DatosDelSendero {
  /** Finish of the trail, GeoJSON order [lng, lat] (trail.end.coordinates). */
  fin: LngLat;
  /** Fastest valid time in seconds (trail.minValidTimeS). */
  minValidTimeS: number;
}

function invalido(invalidReason: string): Veredicto {
  return { status: "interrupted", validated: false, invalidReason };
}

export function evaluarDescenso(
  input: Pick<DescentInput, "endedBySos" | "durationMs" | "track">,
  sendero: DatosDelSendero,
  /** Result of C2 for the first track point (computed in the route with MongoDB). */
  empiezaEnLaSalida: boolean,
): Veredicto {
  const { track } = input;

  if (input.endedBySos) return invalido("sos");
  if (track.length < 2) return invalido("empty track");
  if (input.durationMs < sendero.minValidTimeS * 1000) return invalido("too fast");
  if (!empiezaEnLaSalida) return invalido("did not start at the start");

  const ultimo = track[track.length - 1];
  if (distanciaMetros([ultimo[0], ultimo[1]], sendero.fin) > END_RADIUS_M + END_TOLERANCE_M) {
    return invalido("did not reach the finish");
  }

  for (let i = 1; i < track.length; i += 1) {
    const [lngA, latA, tA] = track[i - 1];
    const [lngB, latB, tB] = track[i];
    const dtMs = tB - tA;
    if (dtMs > MAX_TRACK_GAP_MS) return invalido("gps signal lost");
    // Points closer than 1 s in time (only the final one can be) are skipped:
    // GPS noise over a few hundred ms looks like a huge speed.
    if (dtMs >= TRACK_SAMPLE_MS) {
      const kmh = (distanciaMetros([lngA, latA], [lngB, latB]) / dtMs) * 3600;
      if (kmh > MAX_SPEED_KMH) return invalido("implausible speed");
    }
  }

  if (Math.abs(input.durationMs - ultimo[2]) > MAX_TRACK_GAP_MS) {
    return invalido("track does not match the time");
  }

  return { status: "completed", validated: true, invalidReason: null };
}
