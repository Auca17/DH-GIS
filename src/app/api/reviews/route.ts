import { connection } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { validateReviewBody } from "@/lib/reviews/validate-review";

/*
 * POST /api/reviews — saves a review of a trail, from the result screen
 *
 * Body: { runId, rating (1 to 5), comment (optional, up to 500 characters) }.
 * Rules (all checked here, on the server):
 * - Only signed-in riders. The rider comes from the session cookie, never from the body.
 * - Only for THEIR OWN descent: the descent is searched with idCorrida AND the session's usuarioId.
 * - Only for a valid descent with real GPS (no demo runs).
 * - One review per descent: the update only matches a descent WITHOUT `resena`.
 * - One review per rider per trail: `bajadas` has a unique partial index on
 *   { usuarioId, senderoId } that only covers descents WITH `resena` (scripts/seed.ts),
 *   so the database itself rejects a second review of the same trail (error 11000).
 *
 * The trail's average rating is not stored anywhere: C5 computes it with $avg.
 *
 * Course concept: embedded one-to-one relation. A review belongs to exactly one
 * descent and is written together with it, so it lives INSIDE the descent
 * (bajadas.resena) instead of in its own collection. The descent already has
 * senderoId and usuarioId, so the review does not repeat them.
 *
 * Compass equivalent:
 *   db.bajadas.updateOne(
 *     { _id: ObjectId("DESCENT_ID"), resena: { $exists: false } },
 *     { $set: { resena: { calificacion: 4, comentario: "Mucha piedra suelta", fecha: new Date() } } }
 *   )
 */

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Los datos no llegaron bien." }, { status: 400 });
  }
  const check = validateReviewBody(body);
  if (!check.ok) {
    return Response.json({ ok: false, message: check.message }, { status: 400 });
  }
  const input = check.value;

  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }

  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return Response.json({ ok: false, message: "Ingresá a tu cuenta para dejar una reseña." }, { status: 401 });
    }

    const db = getDb();
    // idCorrida AND usuarioId: another rider's descent is never found.
    const descent = await db
      .collection("bajadas")
      .findOne({ idCorrida: input.runId, usuarioId: userId }, { projection: { senderoId: 1, valida: 1, esDemo: 1 } });
    if (!descent) {
      return Response.json({ ok: false, message: "No encontramos ese descenso." }, { status: 404 });
    }
    if (descent.esDemo === true) {
      return Response.json(
        { ok: false, message: "Las reseñas son solo para descensos con GPS real." },
        { status: 403 },
      );
    }
    if (descent.valida !== true) {
      return Response.json(
        { ok: false, message: "Solo se puede reseñar un descenso válido." },
        { status: 403 },
      );
    }

    const result = await db.collection("bajadas").updateOne(
      { _id: descent._id, resena: { $exists: false } },
      { $set: { resena: { calificacion: input.rating, comentario: input.comment, fecha: new Date() } } },
    );
    if (result.matchedCount === 0) {
      return Response.json(
        { ok: false, message: "Ya dejaste una reseña para este descenso." },
        { status: 409 },
      );
    }
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    // 11000 = duplicate key: another descent of this rider on this trail already has a review.
    if ((error as { code?: number }).code === 11000) {
      return Response.json(
        { ok: false, message: "Ya dejaste una reseña para este sendero." },
        { status: 409 },
      );
    }
    console.error("[api/reviews] save failed:", (error as Error).message);
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }
}
