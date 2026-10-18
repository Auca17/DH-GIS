import { getDb } from "@/lib/mongodb";

/*
 * C12 — Valid descents per bike type
 *
 * What it does: for DH, Enduro and Trail bikes, how many valid descents they have,
 * their average speed and the average front travel of the bikes used.
 * Answers "do DH bikes go faster down these trails?".
 *
 * Course concept: $lookup to the new `bikes` collection through descents.bikeId,
 * then $group with $avg over fields of BOTH collections.
 *
 * Compass (collection `descents` → Aggregations → paste):
 *
 * [
 *   { $match: { validated: true, bikeId: { $type: "objectId" } } },
 *   { $lookup: { from: "bikes", localField: "bikeId", foreignField: "_id", as: "bike" } },
 *   { $unwind: "$bike" },
 *   {
 *     $group: {
 *       _id: "$bike.type",
 *       validDescents: { $sum: 1 },
 *       avgSpeedKmh: { $avg: "$avgSpeedKmh" },
 *       avgFrontTravelMm: { $avg: "$bike.travelFrontMm" }
 *     }
 *   },
 *   {
 *     $project: {
 *       _id: 0,
 *       bikeType: "$_id",
 *       validDescents: 1,
 *       avgSpeedKmh: { $round: ["$avgSpeedKmh", 1] },
 *       avgFrontTravelMm: { $round: ["$avgFrontTravelMm", 0] }
 *     }
 *   },
 *   { $sort: { avgSpeedKmh: -1 } }
 * ]
 *
 * Stages:
 * - $match: valid descents that point to a bike (older ones have no bikeId).
 * - $lookup + $unwind: each descent gets the bike it was ridden with.
 * - $group: one row per bike type; $avg mixes a descent field (speed) and a bike
 *   field (front travel).
 * - $project: $round keeps the averages readable.
 * - $sort: fastest bike type first.
 */

export interface BikeTypeStats {
  bikeType: string;
  validDescents: number;
  avgSpeedKmh: number;
  avgFrontTravelMm: number;
}

export async function getStatsPerBikeType(): Promise<BikeTypeStats[]> {
  const pipeline = [
    { $match: { validated: true, bikeId: { $type: "objectId" } } },
    { $lookup: { from: "bikes", localField: "bikeId", foreignField: "_id", as: "bike" } },
    { $unwind: "$bike" },
    {
      $group: {
        _id: "$bike.type",
        validDescents: { $sum: 1 },
        avgSpeedKmh: { $avg: "$avgSpeedKmh" },
        avgFrontTravelMm: { $avg: "$bike.travelFrontMm" },
      },
    },
    {
      $project: {
        _id: 0,
        bikeType: "$_id",
        validDescents: 1,
        avgSpeedKmh: { $round: ["$avgSpeedKmh", 1] },
        avgFrontTravelMm: { $round: ["$avgFrontTravelMm", 0] },
      },
    },
    { $sort: { avgSpeedKmh: -1 } },
  ];

  return getDb().collection("descents").aggregate<BikeTypeStats>(pipeline).toArray();
}
