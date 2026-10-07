import { getDb } from "@/lib/mongodb";

/*
 * C4 — Personal best of one rider on one trail
 *
 * What it does: from all the valid descents of a rider on a trail, returns the
 * best (lowest) time and how many valid descents they have.
 *
 * Course concept: grouping with $group and accumulators ($min, $sum).
 *
 * Compass (collection `descents` → Aggregations → paste).
 * Replace both ObjectIds: Pequia's _id (from `trails`) and Lucas R.'s _id (from `users`):
 *
 * [
 *   {
 *     $match: {
 *       trailId: ObjectId("PASTE_PEQUIA_ID_HERE"),
 *       userId: ObjectId("PASTE_USER_ID_HERE"),
 *       status: "completed",
 *       validated: true
 *     }
 *   },
 *   {
 *     $group: {
 *       _id: "$userId",
 *       bestMs: { $min: "$durationMs" },
 *       validDescents: { $sum: 1 }
 *     }
 *   },
 *   { $project: { _id: 0, bestMs: 1, validDescents: 1 } }
 * ]
 *
 * Stages:
 * - $match: keeps only this rider's completed and validated descents on this trail
 *   (an SOS or an invalid time can never be a personal best).
 * - $group: puts all those descents in ONE group (same userId) and computes the
 *   minimum durationMs ($min) and how many there are ($sum: 1 adds 1 per document).
 * - $project: hides the group _id and returns only the two computed values.
 */

export interface PersonalBest {
  bestMs: number;
  validDescents: number;
}

export async function getPersonalBest(
  slug: string,
  displayName: string,
): Promise<PersonalBest | null> {
  const db = getDb();

  // Step 1: find the ids (descents store trailId and userId, not names).
  const trail = await db.collection("trails").findOne({ slug }, { projection: { _id: 1 } });
  const user = await db.collection("users").findOne({ displayName }, { projection: { _id: 1 } });
  if (!trail || !user) {
    return null;
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    {
      $match: {
        trailId: trail._id,
        userId: user._id,
        status: "completed",
        validated: true,
      },
    },
    {
      $group: {
        _id: "$userId",
        bestMs: { $min: "$durationMs" },
        validDescents: { $sum: 1 },
      },
    },
    { $project: { _id: 0, bestMs: 1, validDescents: 1 } },
  ];

  const results = await db.collection("descents").aggregate<PersonalBest>(pipeline).toArray();
  // No valid descents → no personal best yet.
  return results[0] ?? null;
}
