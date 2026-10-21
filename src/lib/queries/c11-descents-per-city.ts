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
 * Compass (collection `bajadas` → Aggregations → paste):
 *
 * [
 *   { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
 *   { $unwind: "$usuario" },
 *   { $match: { "usuario.ciudad": { $exists: true } } },
 *   {
 *     $group: {
 *       _id: "$usuario.ciudad",
 *       totalBajadas: { $sum: 1 },
 *       bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } },
 *       ciclistas: { $addToSet: "$usuarioId" }
 *     }
 *   },
 *   {
 *     $project: {
 *       _id: 0,
 *       ciudad: "$_id",
 *       totalBajadas: 1,
 *       bajadasValidas: 1,
 *       ciclistas: { $size: "$ciclistas" }
 *     }
 *   },
 *   { $sort: { totalBajadas: -1, ciudad: 1 } }
 * ]
 *
 * Stages:
 * - $lookup + $unwind: each descent gets its rider (the city lives in `usuarios`).
 * - $match: leaves out riders without a city ("Demo rider").
 * - $group: one row per city. $addToSet keeps each usuarioId once, so its size is
 *   the number of different riders.
 * - $project: $size turns the set of ids into a number.
 * - $sort: most descents first; ties in alphabetical order.
 */

export interface CityCount {
  ciudad: string;
  totalBajadas: number;
  bajadasValidas: number;
  ciclistas: number;
}

export async function getDescentsPerCity(): Promise<CityCount[]> {
  const pipeline = [
    { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
    { $unwind: "$usuario" },
    { $match: { "usuario.ciudad": { $exists: true } } },
    {
      $group: {
        _id: "$usuario.ciudad",
        totalBajadas: { $sum: 1 },
        bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } },
        ciclistas: { $addToSet: "$usuarioId" },
      },
    },
    {
      $project: {
        _id: 0,
        ciudad: "$_id",
        totalBajadas: 1,
        bajadasValidas: 1,
        ciclistas: { $size: "$ciclistas" },
      },
    },
    { $sort: { totalBajadas: -1, ciudad: 1 } },
  ];

  return getDb().collection("bajadas").aggregate<CityCount>(pipeline).toArray();
}
