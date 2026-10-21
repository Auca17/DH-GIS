import { getDb } from "@/lib/mongodb";

/*
 * C4 — Personal best of one rider on one trail
 *
 * What it does: from all the valid descents of a rider on a trail, returns the
 * best (lowest) time and how many valid descents they have.
 *
 * Course concept: grouping with $group and accumulators ($min, $sum).
 *
 * Compass (collection `bajadas` → Aggregations → paste).
 * Replace both ObjectIds: Pequia's _id (from `senderos`) and Lucas R.'s _id (from `usuarios`):
 *
 * [
 *   {
 *     $match: {
 *       senderoId: ObjectId("PASTE_PEQUIA_ID_HERE"),
 *       usuarioId: ObjectId("PASTE_USER_ID_HERE"),
 *       estado: "completada",
 *       valida: true
 *     }
 *   },
 *   {
 *     $group: {
 *       _id: "$usuarioId",
 *       mejorTiempo: { $min: "$duracion" },
 *       bajadasValidas: { $sum: 1 }
 *     }
 *   },
 *   { $project: { _id: 0, mejorTiempo: 1, bajadasValidas: 1 } }
 * ]
 *
 * Stages:
 * - $match: keeps only this rider's completed and validated descents on this trail
 *   (an SOS or an invalid time can never be a personal best).
 * - $group: puts all those descents in ONE group (same usuarioId) and computes the
 *   minimum duracion ($min) and how many there are ($sum: 1 adds 1 per document).
 * - $project: hides the group _id and returns only the two computed values.
 */

export interface PersonalBest {
  mejorTiempo: number;
  bajadasValidas: number;
}

export async function getPersonalBest(
  slug: string,
  displayName: string,
): Promise<PersonalBest | null> {
  const db = getDb();

  // Step 1: find the ids (descents store senderoId and usuarioId, not names).
  const trail = await db.collection("senderos").findOne({ codigo: slug }, { projection: { _id: 1 } });
  const user = await db.collection("usuarios").findOne({ nombre: displayName }, { projection: { _id: 1 } });
  if (!trail || !user) {
    return null;
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    {
      $match: {
        senderoId: trail._id,
        usuarioId: user._id,
        estado: "completada",
        valida: true,
      },
    },
    {
      $group: {
        _id: "$usuarioId",
        mejorTiempo: { $min: "$duracion" },
        bajadasValidas: { $sum: 1 },
      },
    },
    { $project: { _id: 0, mejorTiempo: 1, bajadasValidas: 1 } },
  ];

  const results = await db.collection("bajadas").aggregate<PersonalBest>(pipeline).toArray();
  // No valid descents → no personal best yet.
  return results[0] ?? null;
}
