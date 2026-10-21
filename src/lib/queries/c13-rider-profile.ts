import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Bici, NivelRider, PerfilRider, RodadoBici, TipoBici } from "@/lib/types";

/*
 * C13 — Rider profile with their bikes
 *
 * What it does: returns one rider and, inside it, all their bikes (main bike first).
 * The "Mi perfil" screen and the bike picker read it through GET /api/me.
 *
 * Course concept: one-to-many relation with references. `bicis` stores usuarioId
 * (bikes grow, so they are not embedded in the user); $lookup with a pipeline
 * joins them back and sorts them inside the join.
 *
 * Compass (collection `usuarios` → Aggregations → paste, with a real _id):
 *
 * [
 *   { $match: { _id: ObjectId("PASTE_USER_ID_HERE") } },
 *   {
 *     $lookup: {
 *       from: "bicis",
 *       localField: "_id",
 *       foreignField: "usuarioId",
 *       pipeline: [{ $sort: { principal: -1, _id: 1 } }],
 *       as: "bicis"
 *     }
 *   },
 *   { $project: { hashContrasena: 0, salContrasena: 0 } }
 * ]
 *
 * Stages:
 * - $match: the signed-in rider (the _id comes from the session, never from the client).
 * - $lookup: every bike whose usuarioId is this rider's _id. The inner $sort puts the
 *   main bike first and then the oldest (an ObjectId starts with its creation time,
 *   so sorting by _id is sorting by creation). It can use the { usuarioId, principal } index.
 * - $project: never send the password hash or salt out of the database.
 */

interface UserDoc {
  _id: ObjectId;
  nombre: string;
  email: string;
  nivel: NivelRider;
  ciudad: string;
  anioInicio: number;
  bicis: BikeDoc[];
}

interface BikeDoc {
  _id: ObjectId;
  tipo: TipoBici;
  marca: string;
  modelo: string;
  anio: number;
  rodado: RodadoBici;
  recorridoDelanteroMm: number;
  recorridoTraseroMm: number;
  principal: boolean;
}

export function toBici(doc: BikeDoc): Bici {
  return {
    id: doc._id.toHexString(),
    tipo: doc.tipo,
    marca: doc.marca,
    modelo: doc.modelo,
    anio: doc.anio,
    rodado: doc.rodado,
    recorridoDelanteroMm: doc.recorridoDelanteroMm,
    recorridoTraseroMm: doc.recorridoTraseroMm,
    principal: doc.principal,
  };
}

export async function getRiderProfile(
  userId: ObjectId,
): Promise<{ usuario: PerfilRider; bicis: Bici[] } | null> {
  const pipeline = [
    { $match: { _id: userId } },
    {
      $lookup: {
        from: "bicis",
        localField: "_id",
        foreignField: "usuarioId",
        pipeline: [{ $sort: { principal: -1, _id: 1 } }],
        as: "bicis",
      },
    },
    { $project: { hashContrasena: 0, salContrasena: 0 } },
  ];

  const [doc] = await getDb().collection("usuarios").aggregate<UserDoc>(pipeline).toArray();
  if (!doc) return null;

  return {
    usuario: {
      id: doc._id.toHexString(),
      nombre: doc.nombre,
      email: doc.email,
      nivel: doc.nivel,
      ciudad: doc.ciudad,
      andaDesde: doc.anioInicio,
    },
    bicis: doc.bicis.map(toBici),
  };
}
