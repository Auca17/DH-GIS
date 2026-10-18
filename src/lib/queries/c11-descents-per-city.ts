import { getDb } from "@/lib/mongodb";

/*
 * C11 — Descents per city
 *
 * What it does: for each city, how many descents its riders made, how many are
 * valid and how many different riders there are. Most active city first.
 *
 * Course concept: $lookup + $group by a field of the joined collection, and
 * $addToSet + $size to count DIFFERENT riders (not descents).
 *
 * Compass (collection `descents` → Aggregations → paste):
 *
 * [
 *   { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
 *   { $unwind: "$user" },
 *   { $match: { "user.city": { $exists: true } } },
 *   {
 *     $group: {
 *       _id: "$user.city",
 *       totalDescents: { $sum: 1 },
 *       validDescents: { $sum: { $cond: ["$validated", 1, 0] } },
 *       riders: { $addToSet: "$userId" }
 *     }
 *   },
 *   {
 *     $project: {
 *       _id: 0,
 *       city: "$_id",
 *       totalDescents: 1,
 *       validDescents: 1,
 *       riders: { $size: "$riders" }
 *     }
 *   },
 *   { $sort: { totalDescents: -1, city: 1 } }
 * ]
 *
 * Stages:
 * - $lookup + $unwind: each descent gets its rider (the city lives in `users`).
 * - $match: leaves out riders without a city ("Demo rider").
 * - $group: one row per city. $addToSet keeps each userId once, so its size is
 *   the number of different riders.
 * - $project: $size turns the set of ids into a number.
 * - $sort: most descents first; ties in alphabetical order.
 */

export interface CityCount {
  city: string;
  totalDescents: number;
  validDescents: number;
  riders: number;
}

export async function getDescentsPerCity(): Promise<CityCount[]> {
  const pipeline = [
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.city": { $exists: true } } },
    {
      $group: {
        _id: "$user.city",
        totalDescents: { $sum: 1 },
        validDescents: { $sum: { $cond: ["$validated", 1, 0] } },
        riders: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        city: "$_id",
        totalDescents: 1,
        validDescents: 1,
        riders: { $size: "$riders" },
      },
    },
    { $sort: { totalDescents: -1, city: 1 } },
  ];

  return getDb().collection("descents").aggregate<CityCount>(pipeline).toArray();
}
