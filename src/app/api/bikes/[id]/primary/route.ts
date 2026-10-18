import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { getDb, isDbAvailable } from "@/lib/mongodb";

/*
 * PATCH /api/bikes/:id/primary — makes one of MY bikes the main one
 *
 * Ownership check ("only my rows"): the bike is searched with BOTH its _id and the
 * session's userId. Another rider's bike id simply finds nothing (404), so nobody
 * can touch bikes that are not theirs. MongoDB has no row-level security for app
 * users: this filter is how we get the same effect.
 *
 * Compass equivalent:
 *   db.bikes.findOne({ _id: ObjectId("BIKE_ID"), userId: ObjectId("MY_USER_ID") })
 *   db.bikes.updateMany({ userId: ObjectId("MY_USER_ID"), isPrimary: true }, { $set: { isPrimary: false } })
 *   db.bikes.updateOne({ _id: ObjectId("BIKE_ID") }, { $set: { isPrimary: true } })
 */

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  if (!OBJECT_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, message: "Esa bici no existe." }, { status: 404 });
  }
  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ ok: false, message: "Ingresá a tu cuenta." }, { status: 401 });
  }

  const bikes = getDb().collection("bikes");
  const bikeId = new ObjectId(id);
  const bike = await bikes.findOne({ _id: bikeId, userId }, { projection: { _id: 1 } });
  if (!bike) {
    return Response.json({ ok: false, message: "Esa bici no existe." }, { status: 404 });
  }

  // First take the mark off, then set it: the partial unique index allows only one.
  await bikes.updateMany({ userId, isPrimary: true }, { $set: { isPrimary: false } });
  await bikes.updateOne({ _id: bikeId }, { $set: { isPrimary: true } });
  return Response.json({ ok: true });
}
