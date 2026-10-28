import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Bici, NivelRider, PerfilRider, RodadoBici, TipoBici } from "@/lib/types";

/*
 * C13 — Rider profile with their bikes
 *
 * What it does: returns one rider with all their bikes (main bike first).
 * The "Mi perfil" screen and the bike picker read it through GET /api/me.
 *
 * Course concept: embedded one-to-few relation. Bikes live inside the user
 * (usuarios.bicis, at most 5) because they are always read together with the
 * rider. One document read brings everything: no $lookup needed.
 * (Compare with C12, which goes the other way: from bajadas to the embedded bikes.)
 *
 * Compass (collection `usuarios` → Aggregations → paste, with a real _id):
 *
 * [
 *   { $match: { _id: ObjectId("PASTE_USER_ID_HERE") } },
 *   { $set: { bicis: { $sortArray: { input: "$bicis", sortBy: { principal: -1, _id: 1 } } } } },
 *   { $project: { hashContrasena: 0, salContrasena: 0 } }
 * ]
 *
 * Stages:
 * - $match: the signed-in rider (the _id comes from the session, never from the client).
 * - $set + $sortArray: sorts the embedded array inside the document, main bike first
 *   and then the oldest (an ObjectId starts with its creation time, so sorting by
 *   _id is sorting by creation).
 * - $project: never send the password hash or salt out of the database.
 */

interface UserDoc {
  _id: ObjectId;
  nombre: string;
  email: string;
  nivel: NivelRider;
  ciudad: string;
  anioInicio: number;
  // null when the rider has no bikes (for example "Demo rider").
  bicis: BikeDoc[] | null;
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
    { $set: { bicis: { $sortArray: { input: "$bicis", sortBy: { principal: -1, _id: 1 } } } } },
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
    bicis: (doc.bicis ?? []).map(toBici),
  };
}
