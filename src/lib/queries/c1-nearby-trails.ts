import { getDb } from "@/lib/mongodb";

/*
 * C1 — Nearby trails
 *
 * What it does: given the user's position, returns the closest trails ordered
 * by distance (in meters), within a maximum radius.
 *
 * Course concept: geospatial query with $geoNear over a 2dsphere index
 * (senderos.inicio). $geoNear must be the FIRST stage of the pipeline and it
 * already returns the documents sorted from nearest to farthest.
 *
 * Compass (collection `senderos` → Aggregations → paste):
 *
 * [
 *   {
 *     $geoNear: {
 *       near: { type: "Point", coordinates: [-68.8953, -32.8959] },
 *       key: "inicio",
 *       distanceField: "distanciaM",
 *       maxDistance: 10000,
 *       spherical: true
 *     }
 *   },
 *   { $limit: 5 },
 *   {
 *     $project: {
 *       codigo: 1,
 *       nombre: 1,
 *       dificultad: 1,
 *       distanciaM: { $round: ["$distanciaM", 0] }
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $geoNear: uses the 2dsphere index on `inicio` to measure the distance from my
 *   position to each trail start, drops those farther than maxDistance and sorts by distance.
 * - $limit: keeps the first 5. Since $geoNear already sorted them, they are the 5
 *   closest ones (no $sort needed).
 * - $project: returns only the fields the screen needs and rounds the distance to
 *   whole meters, so the heavy `tramos` field is not sent.
 */

export interface NearbyTrail {
  codigo: string;
  nombre: string;
  dificultad: string;
  distanciaM: number;
}

export async function findNearbyTrails(
  lat: number,
  lng: number,
  maxDistanceM = 10_000,
  limit = 5,
): Promise<NearbyTrail[]> {
  const pipeline = [
    {
      $geoNear: {
        // GeoJSON order: [longitude, latitude]
        near: { type: "Point", coordinates: [lng, lat] },
        key: "inicio",
        distanceField: "distanciaM",
        maxDistance: maxDistanceM,
        spherical: true,
      },
    },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        codigo: 1,
        nombre: 1,
        dificultad: 1,
        distanciaM: { $round: ["$distanciaM", 0] },
      },
    },
  ];

  return getDb().collection("senderos").aggregate<NearbyTrail>(pipeline).toArray();
}
