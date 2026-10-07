import { getDb } from "@/lib/mongodb";

/*
 * C6 — Number of descents per trail
 *
 * What it does: for every trail, counts all its descents and how many of them
 * are valid (the ones that count for the leaderboard), most ridden first.
 *
 * Course concept: cross count between collections. $group counts per trailId
 * inside `descents`, and $lookup joins each count with its trail in `trails`.
 *
 * Compass (collection `descents` → Aggregations → paste):
 *
 * [
 *   {
 *     $group: {
 *       _id: "$trailId",
 *       totalDescents: { $sum: 1 },
 *       validDescents: { $sum: { $cond: ["$validated", 1, 0] } }
 *     }
 *   },
 *   {
 *     $lookup: {
 *       from: "trails",
 *       localField: "_id",
 *       foreignField: "_id",
 *       as: "trail"
 *     }
 *   },
 *   { $unwind: "$trail" },
 *   {
 *     $project: {
 *       _id: 0,
 *       trail: "$trail.name",
 *       totalDescents: 1,
 *       validDescents: 1
 *     }
 *   },
 *   { $sort: { totalDescents: -1, trail: 1 } }
 * ]
 *
 * Stages:
 * - $group: one group per trailId. `totalDescents` adds 1 per descent; `validDescents`
 *   adds 1 only when validated is true ($cond works like an if/else) and 0 otherwise.
 * - $lookup: brings the trail whose _id equals the group _id (the trailId), so we
 *   can show its name. This is the "cross" part: data from two collections.
 * - $unwind: turns the one-element `trail` array into a plain object.
 * - $project: returns trail name and both counts, hiding the ObjectId.
 * - $sort: most ridden trail first; ties are ordered alphabetically by name.
 */

export interface TrailDescentCount {
  trail: string;
  totalDescents: number;
  validDescents: number;
}

export async function getDescentsPerTrail(): Promise<TrailDescentCount[]> {
  const pipeline = [
    {
      $group: {
        _id: "$trailId",
        totalDescents: { $sum: 1 },
        validDescents: { $sum: { $cond: ["$validated", 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "trails",
        localField: "_id",
        foreignField: "_id",
        as: "trail",
      },
    },
    { $unwind: "$trail" },
    {
      $project: {
        _id: 0,
        trail: "$trail.name",
        totalDescents: 1,
        validDescents: 1,
      },
    },
    { $sort: { totalDescents: -1, trail: 1 } },
  ];

  return getDb().collection("descents").aggregate<TrailDescentCount>(pipeline).toArray();
}
