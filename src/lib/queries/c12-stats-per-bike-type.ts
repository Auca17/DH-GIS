import { getDb } from "@/lib/mongodb";

/*
 * C12 — Valid descents per bike type
 *
 * What it does: for DH, Enduro and Trail bikes, how many valid descents they have,
 * their average speed and the average front travel of the bikes used.
 * Answers "do DH bikes go faster down these trails?".
 *
 * Course concept: $lookup to the `bicis` collection through bajadas.biciId,
 * then $group with $avg over fields of BOTH collections.
 *
 * Compass (collection `bajadas` → Aggregations → paste):
 *
 * [
 *   { $match: { valida: true, biciId: { $type: "objectId" } } },
 *   { $lookup: { from: "bicis", localField: "biciId", foreignField: "_id", as: "bici" } },
 *   { $unwind: "$bici" },
 *   {
 *     $group: {
 *       _id: "$bici.tipo",
 *       bajadasValidas: { $sum: 1 },
 *       velocidadPromedioKmh: { $avg: "$velocidadPromedioKmh" },
 *       recorridoDelanteroPromedioMm: { $avg: "$bici.recorridoDelanteroMm" }
 *     }
 *   },
 *   {
 *     $project: {
 *       _id: 0,
 *       tipoBici: "$_id",
 *       bajadasValidas: 1,
 *       velocidadPromedioKmh: { $round: ["$velocidadPromedioKmh", 1] },
 *       recorridoDelanteroPromedioMm: { $round: ["$recorridoDelanteroPromedioMm", 0] }
 *     }
 *   },
 *   { $sort: { velocidadPromedioKmh: -1 } }
 * ]
 *
 * Stages:
 * - $match: valid descents that point to a bike (runs saved without a bike have no biciId).
 * - $lookup + $unwind: each descent gets the bike it was ridden with.
 * - $group: one row per bike type; $avg mixes a descent field (speed) and a bike
 *   field (front travel).
 * - $project: $round keeps the averages readable.
 * - $sort: fastest bike type first.
 */

export interface BikeTypeStats {
  tipoBici: string;
  bajadasValidas: number;
  velocidadPromedioKmh: number;
  recorridoDelanteroPromedioMm: number;
}

export async function getStatsPerBikeType(): Promise<BikeTypeStats[]> {
  const pipeline = [
    { $match: { valida: true, biciId: { $type: "objectId" } } },
    { $lookup: { from: "bicis", localField: "biciId", foreignField: "_id", as: "bici" } },
    { $unwind: "$bici" },
    {
      $group: {
        _id: "$bici.tipo",
        bajadasValidas: { $sum: 1 },
        velocidadPromedioKmh: { $avg: "$velocidadPromedioKmh" },
        recorridoDelanteroPromedioMm: { $avg: "$bici.recorridoDelanteroMm" },
      },
    },
    {
      $project: {
        _id: 0,
        tipoBici: "$_id",
        bajadasValidas: 1,
        velocidadPromedioKmh: { $round: ["$velocidadPromedioKmh", 1] },
        recorridoDelanteroPromedioMm: { $round: ["$recorridoDelanteroPromedioMm", 0] },
      },
    },
    { $sort: { velocidadPromedioKmh: -1 } },
  ];

  return getDb().collection("bajadas").aggregate<BikeTypeStats>(pipeline).toArray();
}
