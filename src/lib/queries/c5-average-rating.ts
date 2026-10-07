import { getDb } from "@/lib/mongodb";

/*
 * C5 — Average rating per trail
 *
 * What it does: for every trail that has reviews, returns its average rating
 * (rounded to 1 decimal) and how many reviews it has, best rated first.
 *
 * Course concept: $group with the $avg accumulator, plus $lookup to bring the
 * trail name (reviews.trailId → trails._id).
 *
 * Compass (collection `reviews` → Aggregations → paste):
 *
 * [
 *   {
 *     $group: {
 *       _id: "$trailId",
 *       avgRating: { $avg: "$rating" },
 *       reviews: { $sum: 1 }
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
 *       avgRating: { $round: ["$avgRating", 1] },
 *       reviews: 1
 *     }
 *   },
 *   { $sort: { avgRating: -1, trail: 1 } }
 * ]
 *
 * Stages:
 * - $group: makes one group per trailId and, inside each group, averages the
 *   `rating` field ($avg) and counts the reviews ($sum: 1).
 * - $lookup: for each group, brings the trail whose _id equals the group _id
 *   (the trailId), so we can show its name instead of an ObjectId.
 * - $unwind: turns the one-element `trail` array into a plain object.
 * - $project: returns trail name, average rounded to 1 decimal, and review count.
 * - $sort: best rated first; ties are ordered alphabetically by name.
 */

export interface TrailRating {
  trail: string;
  avgRating: number;
  reviews: number;
}

export async function getAverageRatings(): Promise<TrailRating[]> {
  const pipeline = [
    {
      $group: {
        _id: "$trailId",
        avgRating: { $avg: "$rating" },
        reviews: { $sum: 1 },
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
        avgRating: { $round: ["$avgRating", 1] },
        reviews: 1,
      },
    },
    { $sort: { avgRating: -1, trail: 1 } },
  ];

  return getDb().collection("reviews").aggregate<TrailRating>(pipeline).toArray();
}
