import { getDb } from "@/lib/mongodb";

/*
 * C9 — Reviews of one trail
 *
 * What it does: returns the reviews of a trail, newest first, with the name
 * of the person who wrote each one.
 *
 * Course concept: reading an EMBEDDED document. Each review lives inside its descent
 * (bajadas.resena). $match + $sort run over the partial index
 * { senderoId, "resena.fecha": -1 } (it only holds descents WITH a review), and
 * $lookup brings the author (bajadas.usuarioId → usuarios._id).
 *
 * Compass (collection `bajadas` → Aggregations → paste).
 * Replace the ObjectId with Pequia's _id (copy it from the `senderos` collection):
 *
 * [
 *   { $match: { senderoId: ObjectId("PASTE_PEQUIA_ID_HERE"), resena: { $exists: true } } },
 *   { $sort: { "resena.fecha": -1 } },
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
 *       comentario: "$resena.comentario",
 *       calificacion: "$resena.calificacion",
 *       fecha: "$resena.fecha"
 *     }
 *   }
 * ]
 *
 * Stages:
 * - $match: the descents of this trail that have a review. `resena: { $exists: true }`
 *   is the partialFilterExpression of the index, which lets Mongo use it.
 * - $sort: newest first. The index already stores resena.fecha in descending
 *   order, so Mongo does not sort in memory.
 * - $lookup: brings the user whose _id equals the descent's usuarioId, like a JOIN.
 *   The result is an array called `usuario` with one element.
 * - $unwind: turns that one-element array into a plain object.
 * - $project: returns only what the screen shows, taking it out of the embedded review.
 */

export interface TrailReview {
  autor: string;
  comentario: string;
  calificacion: number;
  fecha: Date;
}

export async function getTrailReviews(slug: string): Promise<TrailReview[]> {
  const db = getDb();

  // Step 1: find the trail _id from its codigo (the descents store senderoId).
  const trail = await db.collection("senderos").findOne({ codigo: slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  const pipeline = [
    { $match: { senderoId: trail._id, resena: { $exists: true } } },
    { $sort: { "resena.fecha": -1 } },
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
        comentario: "$resena.comentario",
        calificacion: "$resena.calificacion",
        fecha: "$resena.fecha",
      },
    },
  ];

  return db.collection("bajadas").aggregate<TrailReview>(pipeline).toArray();
}
