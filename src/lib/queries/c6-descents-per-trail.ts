import { getDb } from "@/lib/mongodb";

/*
 * C6 — Number of descents per trail
 *
 * What it does: for every trail, counts all its descents and how many of them
 * are valid (the ones that count for the leaderboard), most ridden first.
 *
 * Course concept: cross count between collections. $group counts per senderoId
 * inside `bajadas`, and $lookup joins each count with its trail in `senderos`.
 *
 * Compass (collection `bajadas` → Aggregations → paste):
 *
 * [
 *   {
 *     $group: {
 *       _id: "$senderoId",
 *       totalBajadas: { $sum: 1 },
 *       bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } }
 *     }
 *   },
 *   {
 *     $lookup: {
 *       from: "senderos",
 *       localField: "_id",
 *       foreignField: "_id",
 *       as: "sendero"
 *     }
 *   },
 *   { $unwind: "$sendero" },
 *   {
 *     $project: {
 *       _id: 0,
 *       sendero: "$sendero.nombre",
 *       totalBajadas: 1,
 *       bajadasValidas: 1
 *     }
 *   },
 *   { $sort: { totalBajadas: -1, sendero: 1 } }
 * ]
 *
 * Stages:
 * - $group: one group per senderoId. `totalBajadas` adds 1 per descent; `bajadasValidas`
 *   adds 1 only when valida is true ($cond works like an if/else) and 0 otherwise.
 * - $lookup: brings the trail whose _id equals the group _id (the senderoId), so we
 *   can show its name. This is the "cross" part: data from two collections.
 * - $unwind: turns the one-element `sendero` array into a plain object.
 * - $project: returns trail name and both counts, hiding the ObjectId.
 * - $sort: most ridden trail first; ties are ordered alphabetically by name.
 */

export interface TrailDescentCount {
  sendero: string;
  totalBajadas: number;
  bajadasValidas: number;
}

export async function getDescentsPerTrail(): Promise<TrailDescentCount[]> {
  const pipeline = [
    {
      $group: {
        _id: "$senderoId",
        totalBajadas: { $sum: 1 },
        bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "senderos",
        localField: "_id",
        foreignField: "_id",
        as: "sendero",
      },
    },
    { $unwind: "$sendero" },
    {
      $project: {
        _id: 0,
        sendero: "$sendero.nombre",
        totalBajadas: 1,
        bajadasValidas: 1,
      },
    },
    { $sort: { totalBajadas: -1, sendero: 1 } },
  ];

  return getDb().collection("bajadas").aggregate<TrailDescentCount>(pipeline).toArray();
}
