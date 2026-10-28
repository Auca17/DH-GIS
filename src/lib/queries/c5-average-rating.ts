import { getDb } from "@/lib/mongodb";

/*
 * C5 — Average rating per trail
 *
 * What it does: for every trail that has reviews, returns its average rating
 * (rounded to 1 decimal) and how many reviews it has, best rated first.
 *
 * Course concept: $group with the $avg accumulator over a field of an EMBEDDED
 * document (bajadas.resena.calificacion), plus $lookup to bring the trail name
 * (bajadas.senderoId → senderos._id).
 *
 * Compass (collection `bajadas` → Aggregations → paste):
 *
 * [
 *   { $match: { resena: { $exists: true } } },
 *   {
 *     $group: {
 *       _id: "$senderoId",
 *       promedio: { $avg: "$resena.calificacion" },
 *       cantidad: { $sum: 1 }
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
 *       codigo: "$sendero.codigo",
 *       promedio: { $round: ["$promedio", 1] },
 *       cantidad: 1
 *     }
 *   },
 *   { $sort: { promedio: -1, sendero: 1 } }
 * ]
 *
 * Stages:
 * - $match: only the descents that have a review.
 * - $group: makes one group per senderoId and, inside each group, averages
 *   `resena.calificacion` ($avg) and counts the reviews ($sum: 1).
 * - $lookup: for each group, brings the trail whose _id equals the group _id
 *   (the senderoId), so we can show its name instead of an ObjectId.
 * - $unwind: turns the one-element `sendero` array into a plain object.
 * - $project: returns trail name and codigo (the codigo lets the screens match the rating to a trail), average rounded to 1 decimal, and review count.
 * - $sort: best rated first; ties are ordered alphabetically by name.
 */

export interface TrailRating {
  sendero: string;
  codigo: string;
  promedio: number;
  cantidad: number;
}

export async function getAverageRatings(): Promise<TrailRating[]> {
  const pipeline = [
    { $match: { resena: { $exists: true } } },
    {
      $group: {
        _id: "$senderoId",
        promedio: { $avg: "$resena.calificacion" },
        cantidad: { $sum: 1 },
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
        codigo: "$sendero.codigo",
        promedio: { $round: ["$promedio", 1] },
        cantidad: 1,
      },
    },
    { $sort: { promedio: -1, sendero: 1 } },
  ];

  return getDb().collection("bajadas").aggregate<TrailRating>(pipeline).toArray();
}
