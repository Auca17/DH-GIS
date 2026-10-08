import { getDb } from "@/lib/mongodb";

/*
 * C3 — Leaderboard: top-N riders of one trail
 *
 * What it does: returns the N best riders of a trail, ONE ROW PER RIDER with
 * their best VALID time (completed and validated, so SOS and suspicious times
 * are left out), with the rider's name.
 *
 * Course concept: filter + sort over the compound index
 * { trailId, status, validated, durationMs }, grouping with $group + $first,
 * and a relation between collections with $lookup (userId → users._id).
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
 *   {
 *     $group: {
 *       _id: "$userId",
 *       durationMs: { $first: "$durationMs" },
 *       avgSpeedKmh: { $first: "$avgSpeedKmh" },
 *       bikeType: { $first: "$bikeType" },
 *       startedAt: { $first: "$startedAt" },
 *       isDemo: { $first: "$isDemo" }
 *     }
 *   },
 *   { $sort: { durationMs: 1 } },
 *   { $limit: 10 },
 *   {
 *     $lookup: {
 *       from: "users",
 *       localField: "_id",
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
 *       startedAt: 1,
 *       isDemo: 1
 *     }
 *   }
 * ]
 *
 * To leave demo runs out, add isDemo: { $ne: true } to the $match (see INCLUDE_DEMO_RUNS).
 *
 * Stages:
 * - $match: keeps only the descents of this trail that were completed and validated.
 *   The three equality fields are the first three fields of the compound index.
 * - $sort: orders by time, fastest first. The index already has durationMs as its
 *   last field, so Mongo reads them in order instead of sorting in memory.
 * - $group: one group per rider (userId). Since the input is already sorted,
 *   $first takes the values of each rider's FASTEST descent (time, speed, bike, date).
 * - $sort (again): $group does not keep any order, so we sort the riders by their
 *   best time.
 * - $limit: keeps the top N riders. It goes BEFORE $lookup so we only join N documents.
 * - $lookup: brings the user whose _id equals the group _id (the userId), like a
 *   JOIN. The result is an array called `user` with one element.
 * - $unwind: turns that one-element array into a plain object, so we can
 *   write "$user.displayName".
 * - $project: shapes the row the leaderboard shows: rider, time, speed, bike, date and
 *   isDemo (so the screen can tag simulated runs).
 */

// The only place to change if demo runs must be excluded from the leaderboard.
// true: simulated runs (isDemo: true) rank like any other run and the screen tags them DEMO.
// false: the $match below also adds isDemo: { $ne: true }.
export const INCLUDE_DEMO_RUNS = true;

export interface LeaderboardRow {
  rider: string;
  durationMs: number;
  avgSpeedKmh: number;
  bikeType: string;
  startedAt: Date;
  // Missing (undefined) in seed descents; true for simulated runs.
  isDemo?: boolean;
}

export async function getLeaderboard(slug: string, limit = 10): Promise<LeaderboardRow[]> {
  const db = getDb();

  // Step 1: find the trail _id from its slug (the descents store trailId).
  const trail = await db.collection("trails").findOne({ slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  // With INCLUDE_DEMO_RUNS = false we also skip the demo runs (isDemo: { $ne: true }
  // matches false and missing, so the seed descents stay).
  const match = { trailId: trail._id, status: "completed", validated: true };
  const filter = INCLUDE_DEMO_RUNS ? match : { ...match, isDemo: { $ne: true } };
  const pipeline = [
    { $match: filter },
    { $sort: { durationMs: 1 } },
    {
      $group: {
        _id: "$userId",
        durationMs: { $first: "$durationMs" },
        avgSpeedKmh: { $first: "$avgSpeedKmh" },
        bikeType: { $first: "$bikeType" },
        startedAt: { $first: "$startedAt" },
        isDemo: { $first: "$isDemo" },
      },
    },
    { $sort: { durationMs: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
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
        isDemo: 1,
      },
    },
  ];

  return db.collection("descents").aggregate<LeaderboardRow>(pipeline).toArray();
}
