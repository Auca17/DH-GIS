import { connection } from "next/server";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { validateDescentBody } from "@/lib/descents/validate-descent";

/*
 * POST /api/descents — saves a finished descent
 *
 * What it does: receives a run from the client, validates it ON THE SERVER and
 * saves it in `descents`. The server (not the client) decides if the run counts:
 *  - ended by SOS            -> interrupted, not validated ("sos")
 *  - faster than the trail's minValidTimeS -> interrupted, not validated ("too fast")
 *  - otherwise               -> completed and validated
 * Runs that are not validated stay in the database but never reach the leaderboard (C3).
 *
 * Course concept: server-side validation (never trust the client) and references
 * between collections (the descent stores trailId and userId, the _id of a
 * document in `trails` and `users`).
 *
 * Equivalent in Compass / mongosh (runId makes it idempotent: the same run sent
 * twice, for example a double click or a retry, is saved only once):
 *
 * db.descents.updateOne(
 *   { runId: "circuito-dh-pequia-1760000000000" },
 *   {
 *     $setOnInsert: {
 *       trailId: ObjectId("PASTE_TRAIL_ID_HERE"),
 *       userId: ObjectId("PASTE_USER_ID_HERE"),
 *       startedAt: new Date(),
 *       durationMs: 45000,
 *       avgSpeedKmh: 24,
 *       elevationChangeM: 70,
 *       bikeType: null,
 *       status: "completed",
 *       validated: true,
 *       invalidReason: null,
 *       isDemo: true,
 *       source: "app",
 *       runId: "circuito-dh-pequia-1760000000000",
 *       createdAt: new Date()
 *     }
 *   },
 *   { upsert: true }
 * )
 */

// There is no login yet, so every run is saved under this user (created by the seed).
const DEMO_USER_NAME = "Demo rider";

const OFFLINE_MESSAGE = "No se pudo guardar el descenso (sin conexión a la base)";

function offlineResponse() {
  return Response.json(
    { ok: false, dbStatus: "offline", message: OFFLINE_MESSAGE },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  // Tells Next.js this route belongs to the request, so it is not prerendered.
  await connection();

  // 1. Read and check the body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "The body is not valid JSON." }, { status: 400 });
  }
  const check = validateDescentBody(body);
  if (!check.ok) {
    return Response.json({ ok: false, message: check.message }, { status: 400 });
  }
  const input = check.value;

  // 2. The database must answer.
  if (!(await isDbAvailable())) {
    return offlineResponse();
  }

  try {
    const db = getDb();

    // 3. Find the trail and the user that the descent will reference.
    const trail = await db.collection("trails").findOne({ slug: input.trailSlug });
    if (!trail) {
      return Response.json({ ok: false, message: "Trail not found." }, { status: 404 });
    }
    const user = await db.collection("users").findOne({ displayName: DEMO_USER_NAME });
    if (!user) {
      return Response.json(
        { ok: false, dbStatus: "empty", message: 'Run "npm run seed" to create the demo user.' },
        { status: 503 },
      );
    }

    // 4. The server decides if the run counts.
    // An older trail document may have no minValidTimeS: we treat it as 0 (no minimum).
    const minValidMs = ((trail.minValidTimeS as number | undefined) ?? 0) * 1000;
    let status: "completed" | "interrupted" = "completed";
    let validated = true;
    let invalidReason: string | null = null;
    if (input.endedBySos) {
      status = "interrupted";
      validated = false;
      invalidReason = "sos";
    } else if (input.durationMs < minValidMs) {
      status = "interrupted";
      validated = false;
      invalidReason = "too fast";
    }

    // 5. Save. $setOnInsert only writes when the runId is new, so sending the
    // same run twice does not create a second descent.
    const descent = {
      trailId: trail._id,
      userId: user._id,
      startedAt: input.startedAt,
      durationMs: input.durationMs,
      avgSpeedKmh: input.avgSpeedKmh,
      elevationChangeM: input.elevationChangeM,
      bikeType: null,
      status,
      validated,
      invalidReason,
      isDemo: input.isDemo,
      source: "app",
      runId: input.runId,
      createdAt: new Date(),
    };
    const result = await db
      .collection("descents")
      .updateOne({ runId: input.runId }, { $setOnInsert: descent }, { upsert: true });

    // On a repeated runId we answer with what was stored the first time.
    const saved =
      result.upsertedCount === 1
        ? descent
        : await db.collection("descents").findOne({ runId: input.runId });

    return Response.json(
      {
        ok: true,
        dbStatus: "ok",
        data: {
          validated: saved?.validated ?? validated,
          status: saved?.status ?? status,
          invalidReason: saved?.invalidReason ?? invalidReason,
        },
      },
      { status: result.upsertedCount === 1 ? 201 : 200 },
    );
  } catch (error) {
    console.error("[api/descents] save failed:", (error as Error).message);
    return offlineResponse();
  }
}
