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
 * - Only for THEIR OWN descent: the descent is searched with runId AND the session's userId.
 * - Only for a valid descent with real GPS (no demo runs).
 * - One review per descent: `reviews` has a unique partial index on descentId
 *   (scripts/seed.ts), so the database itself rejects a second one (error 11000).
 *
 * The trail's average rating is not stored anywhere: C5 computes it with $avg.
 *
 * Course concept: references between collections (the review stores trailId, userId
 * and descentId) and a partial unique index as a business rule.
 *
 * Compass equivalent:
 *   db.reviews.insertOne({
 *     trailId: ObjectId("..."), userId: ObjectId("..."), descentId: ObjectId("..."),
 *     rating: 4, comment: "Mucha piedra suelta", createdAt: new Date(), source: "app"
 *   })
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
    // runId AND userId: another rider's descent is never found.
    const descent = await db
      .collection("descents")
      .findOne({ runId: input.runId, userId }, { projection: { trailId: 1, validated: 1, isDemo: 1 } });
    if (!descent) {
      return Response.json({ ok: false, message: "No encontramos ese descenso." }, { status: 404 });
    }
    if (descent.isDemo === true) {
      return Response.json(
        { ok: false, message: "Las reseñas son solo para descensos con GPS real." },
        { status: 403 },
      );
    }
    if (descent.validated !== true) {
      return Response.json(
        { ok: false, message: "Solo se puede reseñar un descenso válido." },
        { status: 403 },
      );
    }

    await db.collection("reviews").insertOne({
      trailId: descent.trailId,
      userId,
      descentId: descent._id,
      rating: input.rating,
      comment: input.comment,
      createdAt: new Date(),
      source: "app",
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    // 11000 = duplicate key: the unique index on descentId already has a review.
    if ((error as { code?: number }).code === 11000) {
      return Response.json(
        { ok: false, message: "Ya dejaste una reseña para este descenso." },
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
