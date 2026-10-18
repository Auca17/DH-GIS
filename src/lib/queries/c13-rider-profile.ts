import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Bici, NivelRider, PerfilRider, RodadoBici, TipoBici } from "@/lib/types";

/*
 * C13 — Rider profile with their bikes
 *
 * What it does: returns one rider and, inside it, all their bikes (main bike first).
 * The "Mi perfil" screen and the bike picker read it through GET /api/me.
 *
 * Course concept: one-to-many relation with references. `bikes` stores userId
 * (bikes grow, so they are not embedded in the user); $lookup with a pipeline
 * joins them back and sorts them inside the join.
 *
 * Compass (collection `users` → Aggregations → paste, with a real _id):
 *
 * [
 *   { $match: { _id: ObjectId("PASTE_USER_ID_HERE") } },
 *   {
 *     $lookup: {
 *       from: "bikes",
 *       localField: "_id",
 *       foreignField: "userId",
 *       pipeline: [{ $sort: { isPrimary: -1, createdAt: 1 } }],
 *       as: "bikes"
 *     }
 *   },
 *   { $project: { passwordHash: 0, passwordSalt: 0 } }
 * ]
 *
 * Stages:
 * - $match: the signed-in rider (the _id comes from the session, never from the client).
 * - $lookup: every bike whose userId is this rider's _id. The inner $sort puts the
 *   main bike first and then the oldest. It can use the { userId, isPrimary } index.
 * - $project: never send the password hash or salt out of the database.
 */

interface UserDoc {
  _id: ObjectId;
  displayName: string;
  email: string;
  level: NivelRider;
  city: string;
  ridingSinceYear: number;
  bikes: BikeDoc[];
}

interface BikeDoc {
  _id: ObjectId;
  type: TipoBici;
  brand: string;
  model: string;
  year: number;
  wheelSize: RodadoBici;
  travelFrontMm: number;
  travelRearMm: number;
  isPrimary: boolean;
}

export function toBici(doc: BikeDoc): Bici {
  return {
    id: doc._id.toHexString(),
    tipo: doc.type,
    marca: doc.brand,
    modelo: doc.model,
    anio: doc.year,
    rodado: doc.wheelSize,
    recorridoDelanteroMm: doc.travelFrontMm,
    recorridoTraseroMm: doc.travelRearMm,
    principal: doc.isPrimary,
  };
}

export async function getRiderProfile(
  userId: ObjectId,
): Promise<{ usuario: PerfilRider; bicis: Bici[] } | null> {
  const pipeline = [
    { $match: { _id: userId } },
    {
      $lookup: {
        from: "bikes",
        localField: "_id",
        foreignField: "userId",
        pipeline: [{ $sort: { isPrimary: -1, createdAt: 1 } }],
        as: "bikes",
      },
    },
    { $project: { passwordHash: 0, passwordSalt: 0 } },
  ];

  const [doc] = await getDb().collection("users").aggregate<UserDoc>(pipeline).toArray();
  if (!doc) return null;

  return {
    usuario: {
      id: doc._id.toHexString(),
      nombre: doc.displayName,
      email: doc.email,
      nivel: doc.level,
      ciudad: doc.city,
      andaDesde: doc.ridingSinceYear,
    },
    bicis: doc.bikes.map(toBici),
  };
}
