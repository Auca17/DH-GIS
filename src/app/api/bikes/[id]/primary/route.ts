import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { setPrimaryBike } from "@/lib/bikes/set-primary-bike";
import { isDbAvailable } from "@/lib/mongodb";

/*
 * PATCH /api/bikes/:id/primary — makes one of MY bikes the main one
 *
 * Ownership check ("only my rows"): bikes are embedded in the user document, so the
 * update filters by the session's usuario _id AND the bike's _id. Another rider's
 * bike id is not inside my document: nothing matches (404). MongoDB has no row-level
 * security for app users: this filter is how we get the same effect.
 *
 * Compass equivalent: see src/lib/bikes/set-primary-bike.ts.
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

  const found = await setPrimaryBike(userId, new ObjectId(id));
  if (!found) {
    return Response.json({ ok: false, message: "Esa bici no existe." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
