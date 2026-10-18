import { getDb } from "@/lib/mongodb";

/*
 * C10 — Best time per rider level on one trail
 *
 * What it does: for one trail, the fastest valid time of each level
 * (principiante, intermedio, avanzado), who did it and how many valid descents
 * each level has. Shows if the levels people pick match how fast they ride.
 *
 * Course concept: $lookup to bring a field of another collection (the level lives
 * in `users`, the time in `descents`) and then $group by that joined field.
 *
 * Compass (collection `descents` → Aggregations → paste, with Pequia's trail _id):
 *
 * [
 *   { $match: { trailId: ObjectId("PASTE_TRAIL_ID_HERE"), status: "completed", validated: true } },
 *   { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
 *   { $unwind: "$user" },
 *   { $match: { "user.level": { $exists: true } } },
 *   { $sort: { durationMs: 1 } },
 *   {
 *     $group: {
 *       _id: "$user.level",
 *       bestMs: { $first: "$durationMs" },
 *       rider: { $first: "$user.displayName" },
 *       validDescents: { $sum: 1 }
 *     }
 *   },
 *   { $project: { _id: 0, level: "$_id", bestMs: 1, rider: 1, validDescents: 1 } },
 *   { $sort: { bestMs: 1 } }
 * ]
 *
 * Stages:
 * - $match: valid descents of the trail (uses the leaderboard index).
 * - $lookup + $unwind: each descent gets its rider as an object.
 * - $match: leaves out riders without a level ("Demo rider").
 * - $sort before $group: so $first takes the fastest descent of each level.
 * - $group: one row per level with the best time, its rider and the count.
 * - $project + $sort: readable names, fastest level first.
 */

export interface LevelBest {
  level: string;
  bestMs: number;
  rider: string;
  validDescents: number;
}

export async function getBestTimePerLevel(slug: string): Promise<LevelBest[]> {
  const db = getDb();
  const trail = await db.collection("trails").findOne({ slug }, { projection: { _id: 1 } });
  if (!trail) return [];

  const pipeline = [
    { $match: { trailId: trail._id, status: "completed", validated: true } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.level": { $exists: true } } },
    { $sort: { durationMs: 1 } },
    {
      $group: {
        _id: "$user.level",
        bestMs: { $first: "$durationMs" },
        rider: { $first: "$user.displayName" },
        validDescents: { $sum: 1 },
      },
    },
    { $project: { _id: 0, level: "$_id", bestMs: 1, rider: 1, validDescents: 1 } },
    { $sort: { bestMs: 1 } },
  ];

  return db.collection("descents").aggregate<LevelBest>(pipeline).toArray();
}
