import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { MAX_BIKES_PER_RIDER, setPrimaryBike } from "@/lib/bikes/set-primary-bike";
import { toBikeFields, validateBike } from "@/lib/bikes/validate-bike";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { toBici } from "@/lib/queries/c13-rider-profile";

/*
 * POST /api/bikes — adds a bike to the signed-in rider
 *
 * Body: the bike fields plus `isPrimary` (true to make it the main bike).
 * The owner is ALWAYS the session's user: a usuarioId sent by the client is ignored.
 *
 * Course concept: embedded one-to-few relation. Bikes live INSIDE the user document
 * (usuarios.bicis): a rider has at most 5 and they are always read together with
 * the rider, so one document read brings everything.
 * - The limit of 5 is enforced twice: the filter "bicis.4 does not exist" (there is no
 *   6th position to fill) and the $jsonSchema of usuarios (maxItems: 5).
 * - "Only one main bike" is kept by updating every bike of the array in ONE update
 *   with arrayFilters (see setPrimaryBike). A unique index cannot do it here: unique
 *   indexes compare different documents, not the items of one array.
 *
 * Compass equivalent (adding a bike that will be the main one):
 *   db.usuarios.updateOne(
 *     { _id: ObjectId("MY_USER_ID"), "bicis.4": { $exists: false } },
 *     { $push: { bicis: { _id: ObjectId(), tipo: "Enduro", ..., principal: false } } }
 *   )
 *   then setPrimaryBike (see src/lib/bikes/set-primary-bike.ts)
 */

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Los datos no llegaron bien." }, { status: 400 });
  }
  const check = validateBike(body);
  if (!check.ok) {
    return Response.json({ ok: false, message: check.message }, { status: 400 });
  }
  const isPrimary = (body as { isPrimary?: unknown }).isPrimary === true;

  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ ok: false, message: "Ingresá a tu cuenta para cargar una bici." }, { status: 401 });
  }

  // Typed collection: tells TypeScript that usuarios has a `bicis` array.
  const users = getDb().collection<{ bicis?: object[] }>("usuarios");
  const user = await users.findOne({ _id: userId }, { projection: { bicis: 1 } });
  const count = user?.bicis?.length ?? 0;
  const tooMany = { ok: false, message: `Podés tener hasta ${MAX_BIKES_PER_RIDER} bicis.` };
  if (count >= MAX_BIKES_PER_RIDER) {
    return Response.json(tooMany, { status: 400 });
  }

  // Each embedded bike gets its own _id: descents point to it with biciId.
  // The first bike is always the main one, saved like that in the same write.
  const doc = { _id: new ObjectId(), ...toBikeFields(check.value), principal: count === 0 };
  // "bicis.4" is the 5th position: only push while it does not exist yet.
  const result = await users.updateOne(
    { _id: userId, [`bicis.${MAX_BIKES_PER_RIDER - 1}`]: { $exists: false } },
    { $push: { bicis: doc } },
  );
  if (result.matchedCount === 0) {
    return Response.json(tooMany, { status: 400 });
  }

  // A new main bike when the rider already had one: move the mark in ONE update.
  if (isPrimary && !doc.principal) {
    await setPrimaryBike(userId, doc._id);
    doc.principal = true;
  }

  return Response.json({ ok: true, bici: toBici(doc) }, { status: 201 });
}
