import { getDb } from "@/lib/mongodb";

/*
 * C9 — Reviews of one trail
 *
 * What it does: returns the reviews of a trail, newest first, with the name
 * of the person who wrote each one.
 *
 * Course concept: $match + $sort over the index { senderoId, fecha: -1 },
 * and a relation between collections with $lookup (resenas.usuarioId → usuarios._id).
 *
 * Compass (collection `resenas` → Aggregations → paste).
 * Replace the ObjectId with Pequia's _id (copy it from the `senderos` collection):
 *
 * [
 *   { $match: { senderoId: ObjectId("PASTE_PEQUIA_ID_HERE") } },
 *   { $sort: { fecha: -1 } },
 *   {
 *     $lookup: {
 *       from: "usuarios",
 *       localField: "usuarioId",
 *       foreignField: "_id",
 *       as: "usuario"
 *     }
 *   },
 *   { $unwind: "$usuario" },
 *   {
 *     $project: {
 *       _id: 0,
 *       autor: "$usuario.nombre",
 *       comentario: 1,
 *       calificacion: 1,
 *       fecha: 1
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $match: keeps only the reviews of this trail (first field of the index).
 * - $sort: newest first. The index already stores fecha in descending
 *   order, so Mongo does not sort in memory.
 * - $lookup: brings the user whose _id equals the review's usuarioId, like a JOIN.
 *   The result is an array called `usuario` with one element.
 * - $unwind: turns that one-element array into a plain object.
 * - $project: returns only what the screen shows: author, comment, rating, date.
 */

export interface TrailReview {
  autor: string;
  comentario: string;
  calificacion: number;
  fecha: Date;
}

export async function getTrailReviews(slug: string): Promise<TrailReview[]> {
  const db = getDb();

  // Step 1: find the trail _id from its codigo (the reviews store senderoId).
  const trail = await db.collection("senderos").findOne({ codigo: slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    { $match: { senderoId: trail._id } },
    { $sort: { fecha: -1 } },
    {
      $lookup: {
        from: "usuarios",
        localField: "usuarioId",
        foreignField: "_id",
        as: "usuario",
      },
    },
    { $unwind: "$usuario" },
    {
      $project: {
        _id: 0,
        autor: "$usuario.nombre",
        comentario: 1,
        calificacion: 1,
        fecha: 1,
      },
    },
  ];

  return db.collection("resenas").aggregate<TrailReview>(pipeline).toArray();
}
