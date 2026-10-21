import { getDb } from "@/lib/mongodb";

/*
 * C10 — Best time per rider level on one trail
 *
 * What it does: for one trail, the fastest valid time of each level
 * (principiante, intermedio, avanzado), who did it and how many valid descents
 * each level has. Shows if the levels people pick match how fast they ride.
 *
 * Course concept: $lookup to bring a field of another collection (the level lives
 * in `usuarios`, the time in `bajadas`) and then $group by that joined field.
 *
 * Compass (collection `bajadas` → Aggregations → paste, with Pequia's trail _id):
 *
 * [
 *   { $match: { senderoId: ObjectId("PASTE_TRAIL_ID_HERE"), estado: "completada", valida: true } },
 *   { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
 *   { $unwind: "$usuario" },
 *   { $match: { "usuario.nivel": { $exists: true } } },
 *   { $sort: { duracion: 1 } },
 *   {
 *     $group: {
 *       _id: "$usuario.nivel",
 *       mejorTiempo: { $first: "$duracion" },
 *       ciclista: { $first: "$usuario.nombre" },
 *       bajadasValidas: { $sum: 1 }
 *     }
 *   },
 *   { $project: { _id: 0, nivel: "$_id", mejorTiempo: 1, ciclista: 1, bajadasValidas: 1 } },
 *   { $sort: { mejorTiempo: 1 } }
 * ]
 *
 * Stages:
 * - $match: valid descents of the trail (uses the leaderboard index).
 * - $lookup + $unwind: each descent gets its rider as an object.
 * - $match: leaves out riders without a level ("Demo rider").
 * - $sort before $group: so $first takes the fastest descent of each level.
 * - $group: one row per level with the best time, its rider and the count.
 * - $project + $sort: readable names, fastest level first.
 */

export interface LevelBest {
  nivel: string;
  mejorTiempo: number;
  ciclista: string;
  bajadasValidas: number;
}

export async function getBestTimePerLevel(slug: string): Promise<LevelBest[]> {
  const db = getDb();
  const trail = await db.collection("senderos").findOne({ codigo: slug }, { projection: { _id: 1 } });
  if (!trail) return [];

  const pipeline = [
    { $match: { senderoId: trail._id, estado: "completada", valida: true } },
    { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
    { $unwind: "$usuario" },
    { $match: { "usuario.nivel": { $exists: true } } },
    { $sort: { duracion: 1 } },
    {
      $group: {
        _id: "$usuario.nivel",
        mejorTiempo: { $first: "$duracion" },
        ciclista: { $first: "$usuario.nombre" },
        bajadasValidas: { $sum: 1 },
      },
    },
    { $project: { _id: 0, nivel: "$_id", mejorTiempo: 1, ciclista: 1, bajadasValidas: 1 } },
    { $sort: { mejorTiempo: 1 } },
  ];

  return db.collection("bajadas").aggregate<LevelBest>(pipeline).toArray();
}
