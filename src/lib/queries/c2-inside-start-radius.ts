import { getDb } from "@/lib/mongodb";

/*
 * C2 — Am I inside the start radius?
 *
 * What it does: tells whether the user's position is within `radiusM` meters of
 * the start of one trail. The timer's play button is enabled only when this is true.
 *
 * Course concept: geospatial filter with $geoWithin + $centerSphere (a circle on
 * the sphere). It can use the 2dsphere index on `start`. We use $geoWithin instead
 * of $near because $near is not allowed inside an aggregation $match.
 *
 * $centerSphere takes the radius in RADIANS, not meters:
 *   radians = meters / 6378100   (Earth radius in meters)
 *   30 m    = 30 / 6378100 = 0.0000047036
 *
 * Compass (collection `trails` → Aggregations → paste):
 *
 * [
 *   {
 *     $match: {
 *       slug: "circuito-dh-pequia",
 *       start: {
 *         $geoWithin: {
 *           $centerSphere: [[-68.89533, -32.8959], 0.0000047036]
 *         }
 *       }
 *     }
 *   },
 *   { $project: { _id: 0, slug: 1, name: 1 } }
 * ]
 *
 * Stages:
 * - $match: keeps the trail with that slug ONLY if its `start` point falls inside
 *   a 30 m circle centered on my position ([longitude, latitude]).
 * - $project: returns just the slug and name. One result means "inside",
 *   no results means "outside".
 */

const EARTH_RADIUS_M = 6_378_100;

export async function isInsideStartRadius(
  slug: string,
  lat: number,
  lng: number,
  radiusM = 30,
): Promise<boolean> {
  const pipeline = [
    {
      $match: {
        slug,
        start: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusM / EARTH_RADIUS_M],
          },
        },
      },
    },
    { $project: { _id: 0, slug: 1, name: 1 } },
  ];

  const results = await getDb().collection("trails").aggregate(pipeline).toArray();
  return results.length > 0;
}
