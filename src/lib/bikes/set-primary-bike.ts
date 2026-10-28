import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

/** Bikes are embedded in the user; the $jsonSchema of usuarios uses the same limit (maxItems). */
export const MAX_BIKES_PER_RIDER = 5;

/*
 * Makes one bike of the rider the main one, in ONE update of the user document.
 *
 * arrayFilters name groups of array items: `otra` = every bike except the chosen one,
 * `elegida` = the chosen one. Both changes happen in the same write, so the rider
 * never ends up with two main bikes (or none).
 *
 * The filter has BOTH the rider's _id and the bike's _id: a bike of another rider
 * is not in this document, so nothing matches (matchedCount 0 = "not your bike").
 *
 * Compass equivalent:
 *   db.usuarios.updateOne(
 *     { _id: ObjectId("MY_USER_ID"), "bicis._id": ObjectId("BIKE_ID") },
 *     { $set: { "bicis.$[otra].principal": false, "bicis.$[elegida].principal": true } },
 *     { arrayFilters: [{ "otra._id": { $ne: ObjectId("BIKE_ID") } }, { "elegida._id": ObjectId("BIKE_ID") }] }
 *   )
 *
 * Returns false when the rider has no bike with that _id.
 */
export async function setPrimaryBike(userId: ObjectId, bikeId: ObjectId): Promise<boolean> {
  const result = await getDb()
    .collection("usuarios")
    .updateOne(
      { _id: userId, "bicis._id": bikeId },
      { $set: { "bicis.$[otra].principal": false, "bicis.$[elegida].principal": true } },
      { arrayFilters: [{ "otra._id": { $ne: bikeId } }, { "elegida._id": bikeId }] },
    );
  return result.matchedCount === 1;
}
