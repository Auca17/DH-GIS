import { getDb } from "@/lib/mongodb";

/*
 * C9 — Reviews of one trail
 *
 * What it does: returns the reviews of a trail, newest first, with the name
 * of the person who wrote each one.
 *
 * Course concept: $match + $sort over the index { trailId, createdAt: -1 },
 * and a relation between collections with $lookup (reviews.userId → users._id).
 *
 * Compass (collection `reviews` → Aggregations → paste).
 * Replace the ObjectId with Pequia's _id (copy it from the `trails` collection):
 *
 * [
 *   { $match: { trailId: ObjectId("PASTE_PEQUIA_ID_HERE") } },
 *   { $sort: { createdAt: -1 } },
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
 *       author: "$user.displayName",
 *       comment: 1,
 *       rating: 1,
 *       createdAt: 1
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $match: keeps only the reviews of this trail (first field of the index).
 * - $sort: newest first. The index already stores createdAt in descending
 *   order, so Mongo does not sort in memory.
 * - $lookup: brings the user whose _id equals the review's userId, like a JOIN.
 *   The result is an array called `user` with one element.
 * - $unwind: turns that one-element array into a plain object.
 * - $project: returns only what the screen shows: author, comment, rating, date.
 */

export interface TrailReview {
  author: string;
  comment: string;
  rating: number;
  createdAt: Date;
}

export async function getTrailReviews(slug: string): Promise<TrailReview[]> {
  const db = getDb();

  // Step 1: find the trail _id from its slug (the reviews store trailId).
  const trail = await db.collection("trails").findOne({ slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    { $match: { trailId: trail._id } },
    { $sort: { createdAt: -1 } },
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
        author: "$user.displayName",
        comment: 1,
        rating: 1,
        createdAt: 1,
      },
    },
  ];

  return db.collection("reviews").aggregate<TrailReview>(pipeline).toArray();
}
