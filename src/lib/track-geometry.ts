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

/** Initial bearing (0-360°, 0 = north, clockwise) from `a` to `b`. */
function calcularRumboDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function puntoEnDistancia(flat: PuntoPlano[], distanceM: number): PuntoPlano {
  for (let i = 0; i < flat.length - 1; i += 1) {
    if (distanceM <= flat[i + 1].distanciaAcumuladaM) return flat[i];
  }
  return flat[flat.length - 1];
}

export interface FlechaDireccion {
  lat: number;
  lng: number;
  rumboDeg: number;
}

/** Evenly-spaced direction arrows along the track, pointing toward the next stretch. */
export function obtenerFlechasDeDireccion(pista: TramoPista[], cantidad = 5): FlechaDireccion[] {
  const flat = flattenPista(pista);
  if (flat.length < 2) return [];
  const total = getTotalDistanceM(flat);
  if (total === 0) return [];

  const flechas: FlechaDireccion[] = [];
  for (let i = 1; i <= cantidad; i += 1) {
    const distanciaObjetivo = (total * i) / (cantidad + 1);
    const punto = puntoEnDistancia(flat, distanciaObjetivo);
    const indice = flat.indexOf(punto);
    const siguiente = flat[Math.min(indice + 1, flat.length - 1)];
    flechas.push({ lat: punto.lat, lng: punto.lng, rumboDeg: calcularRumboDeg(punto, siguiente) });
  }
  return flechas;
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
