import { getDb } from "@/lib/mongodb";

/*
 * C1 — Nearby trails
 *
 * What it does: given the user's position, returns the closest trails ordered
 * by distance (in meters), within a maximum radius.
 *
 * Course concept: geospatial query with $geoNear over a 2dsphere index
 * (trails.start). $geoNear must be the FIRST stage of the pipeline and it
 * already returns the documents sorted from nearest to farthest.
 *
 * Compass (collection `trails` → Aggregations → paste):
 *
 * [
 *   {
 *     $geoNear: {
 *       near: { type: "Point", coordinates: [-68.8953, -32.8959] },
 *       key: "start",
 *       distanceField: "distanceM",
 *       maxDistance: 10000,
 *       spherical: true
 *     }
 *   },
 *   { $limit: 5 },
 *   {
 *     $project: {
 *       slug: 1,
 *       name: 1,
 *       difficulty: 1,
 *       distanceM: { $round: ["$distanceM", 0] }
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $geoNear: uses the 2dsphere index on `start` to measure the distance from my
 *   position to each trail start, drops those farther than maxDistance and sorts by distance.
 * - $limit: keeps the first 5. Since $geoNear already sorted them, they are the 5
 *   closest ones (no $sort needed).
 * - $project: returns only the fields the screen needs and rounds the distance to
 *   whole meters, so heavy fields like `path` and `segments` are not sent.
 */

export interface NearbyTrail {
  slug: string;
  name: string;
  difficulty: string;
  distanceM: number;
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
        key: "start",
        distanceField: "distanceM",
        maxDistance: maxDistanceM,
        spherical: true,
      },
    },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        slug: 1,
        name: 1,
        difficulty: 1,
        distanceM: { $round: ["$distanceM", 0] },
      },
    },
  ];

  return getDb().collection("trails").aggregate<NearbyTrail>(pipeline).toArray();
}
