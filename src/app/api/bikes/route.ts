import { connection } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { toBikeFields, validateBike } from "@/lib/bikes/validate-bike";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { toBici } from "@/lib/queries/c13-rider-profile";

/*
 * POST /api/bikes — adds a bike to the signed-in rider
 *
 * Body: the bike fields plus `isPrimary` (true to make it the main bike).
 * The owner is ALWAYS the session's user: a usuarioId sent by the client is ignored.
 *
 * Course concept: partial unique index. `bicis` has a unique index on usuarioId that
 * only covers documents with principal: true, so the database itself makes sure each
 * rider has at most ONE main bike. That is why we first take the mark off the old
 * main bike and only then insert the new one.
 *
 * Compass equivalent (making the new bike the main one):
 *   db.bicis.updateMany({ usuarioId: ObjectId("..."), principal: true }, { $set: { principal: false } })
 *   db.bicis.insertOne({ usuarioId: ObjectId("..."), tipo: "Enduro", ..., principal: true })
 */

/** More than enough for a rider; stops someone from filling the database. */
const MAX_BIKES_PER_RIDER = 10;

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

  const bikes = getDb().collection("bicis");
  const count = await bikes.countDocuments({ usuarioId: userId });
  if (count >= MAX_BIKES_PER_RIDER) {
    return Response.json(
      { ok: false, message: `Podés tener hasta ${MAX_BIKES_PER_RIDER} bicis.` },
      { status: 400 },
    );
  }

  // The first bike is always the main one.
  const willBePrimary = isPrimary || count === 0;
  if (willBePrimary) {
    await bikes.updateMany({ usuarioId: userId, principal: true }, { $set: { principal: false } });
  }
  const doc = { usuarioId: userId, ...toBikeFields(check.value), principal: willBePrimary };
  const result = await bikes.insertOne(doc);

  return Response.json({ ok: true, bici: toBici({ ...doc, _id: result.insertedId }) }, { status: 201 });
}
