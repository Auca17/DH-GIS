import type { Dificultad, TramoPista } from "@/lib/types";

export interface PuntoPlano {
  lat: number;
  lng: number;
  elevacionM: number;
  dificultad: Dificultad;
  distanciaAcumuladaM: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in meters. */
function haversineDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Flattens the per-difficulty segments into a single ordered point list with
 * cumulative distance. Segments are expected to share their boundary point
 * (last point of segment N === first point of segment N+1); that shared point
 * is only emitted once.
 */
export function flattenPista(pista: TramoPista[]): PuntoPlano[] {
  const flat: PuntoPlano[] = [];
  let distanciaAcumuladaM = 0;

  for (const tramo of pista) {
    for (const punto of tramo.puntos) {
      const anterior = flat.at(-1);
      if (anterior) {
        const esMismoPunto =
          anterior.lat === punto.lat && anterior.lng === punto.lng;
        if (esMismoPunto) {
          // Shared boundary point between segments: skip the duplicate node.
          continue;
        }
        distanciaAcumuladaM += haversineDistanceM(anterior, punto);
      }

      flat.push({
        lat: punto.lat,
        lng: punto.lng,
        elevacionM: punto.elevacionM,
        dificultad: tramo.dificultad,
        distanciaAcumuladaM,
      });
    }
  }

  return flat;
}

export function getTotalDistanceM(flat: PuntoPlano[]): number {
  return flat.at(-1)?.distanciaAcumuladaM ?? 0;
}

/** Bounding box in Leaflet's `[[south, west], [north, east]]` shape, for `fitBounds`. */
export function getBounds(pista: TramoPista[]): [[number, number], [number, number]] {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (const tramo of pista) {
    for (const punto of tramo.puntos) {
      minLat = Math.min(minLat, punto.lat);
      maxLat = Math.max(maxLat, punto.lat);
      minLng = Math.min(minLng, punto.lng);
      maxLng = Math.max(maxLng, punto.lng);
    }
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
