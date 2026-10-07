import { getDb } from "@/lib/mongodb";

/*
 * C3 — Leaderboard: top-N times of one trail
 *
 * What it does: returns the N best VALID times of a trail (completed and
 * validated, so SOS and suspicious times are left out), with the rider's name.
 *
 * Course concept: filter + sort + limit over the compound index
 * { trailId, status, validated, durationMs }, and a relation between
 * collections with $lookup (descents.userId → users._id).
 *
 * Compass (collection `descents` → Aggregations → paste).
 * Replace the ObjectId with Pequia's _id (copy it from the `trails` collection):
 *
 * [
 *   {
 *     $match: {
 *       trailId: ObjectId("PASTE_PEQUIA_ID_HERE"),
 *       status: "completed",
 *       validated: true
 *     }
 *   },
 *   { $sort: { durationMs: 1 } },
 *   { $limit: 10 },
 *   {
 *     $lookup: {
 *       from: "users",
 *       localField: "userId",
 *       foreignField: "_id",
 *       as: "user"
 *     }
 *   },
 *   { $unwind: "$user" },
 *   {
 *     $project: {
 *       _id: 0,
 *       rider: "$user.displayName",
 *       durationMs: 1,
 *       avgSpeedKmh: 1,
 *       bikeType: 1,
 *       startedAt: 1
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $match: keeps only the descents of this trail that were completed and validated.
 *   The three equality fields are the first three fields of the compound index.
 * - $sort: orders by time, fastest first. The index already has durationMs as its
 *   last field, so Mongo reads them in order instead of sorting in memory.
 * - $limit: keeps the top N. It goes BEFORE $lookup so we only join N documents.
 * - $lookup: brings the matching user from `users` (like a JOIN). The result is an
 *   array called `user` with one element.
 * - $unwind: turns that one-element array into a plain object, so we can
 *   write "$user.displayName".
 * - $project: shapes the row the leaderboard shows: rider, time, speed, bike, date.
 */

export interface LeaderboardRow {
  rider: string;
  durationMs: number;
  avgSpeedKmh: number;
  bikeType: string;
  startedAt: Date;
}

export async function getLeaderboard(slug: string, limit = 10): Promise<LeaderboardRow[]> {
  const db = getDb();

  // Step 1: find the trail _id from its slug (the descents store trailId).
  const trail = await db.collection("trails").findOne({ slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    { $match: { trailId: trail._id, status: "completed", validated: true } },
    { $sort: { durationMs: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        rider: "$user.displayName",
        durationMs: 1,
        avgSpeedKmh: 1,
        bikeType: 1,
        startedAt: 1,
      },
    },
  ];

  return db.collection("descents").aggregate<LeaderboardRow>(pipeline).toArray();
}
