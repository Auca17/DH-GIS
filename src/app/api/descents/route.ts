import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUserId } from "@/lib/auth/session";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { evaluarDescenso } from "@/lib/descents/descent-rules";
import { validateDescentBody } from "@/lib/descents/validate-descent";
import { START_RADIUS_M, START_TOLERANCE_M } from "@/lib/gps/config";
import { isInsideStartRadius } from "@/lib/queries/c2-inside-start-radius";

/*
 * POST /api/descents — saves a finished descent
 *
 * What it does: receives a run from the client, validates it ON THE SERVER and
 * saves it in `descents`, with its track ([lng, lat, ms] points). The server (not the
 * client) decides if the run counts, with the rules of lib/descents/descent-rules.ts:
 * SOS, too fast, did not start at the start (checked with C2, $geoWithin on the
 * 2dsphere index), did not reach the finish, implausible speed, GPS lost, time mismatch.
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
 *       isDemo: false,
 *       track: [[-68.89533, -32.8959, 0], [-68.89357, -32.89347, 45000]],
 *       source: "app",
 *       runId: "circuito-dh-pequia-1760000000000",
 *       createdAt: new Date()
 *     }
 *   },
 *   { upsert: true }
 * )
 */

// Demo runs of people without an account are saved under this user (created by the seed).
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

    // 3. Find the trail that the descent will reference.
    const trail = await db.collection("trails").findOne({ slug: input.trailSlug });
    if (!trail) {
      return Response.json({ ok: false, message: "Trail not found." }, { status: 404 });
    }

    // 3b. Who is saving it. The rider ALWAYS comes from the session cookie, never
    // from the body. With a session: that rider and one of THEIR bikes (the bike is
    // searched with its _id AND the rider's userId, so another rider's bike is not
    // found). Without a session: only demo runs, saved as "Demo rider" with no bike.
    let userId: ObjectId;
    let bike: { _id: ObjectId; type?: string } | null = null;
    const sessionUserId = await getSessionUserId();
    if (sessionUserId) {
      userId = sessionUserId;
      const bikes = db.collection("bikes");
      bike = input.bikeId
        ? await bikes.findOne(
            { _id: new ObjectId(input.bikeId), userId: sessionUserId },
            { projection: { type: 1 } },
          )
        : await bikes.findOne({ userId: sessionUserId, isPrimary: true }, { projection: { type: 1 } });
      if (input.bikeId && !bike) {
        return Response.json({ ok: false, message: "Esa bici no es tuya." }, { status: 403 });
      }
    } else {
      if (!input.isDemo) {
        return Response.json(
          { ok: false, message: "Ingresá a tu cuenta para guardar un descenso con GPS real." },
          { status: 401 },
        );
      }
      const demoUser = await db.collection("users").findOne({ displayName: DEMO_USER_NAME });
      if (!demoUser) {
        return Response.json(
          { ok: false, dbStatus: "empty", message: 'Run "npm run seed" to create the demo user.' },
          { status: 503 },
        );
      }
      userId = demoUser._id;
    }

    // 4. The server decides if the run counts.
    // Did the first track point start inside the start circle? C2 asks MongoDB
    // ($geoWithin + $centerSphere), with START_TOLERANCE_M extra for GPS error.
    const primero = input.track[0];
    const empiezaEnLaSalida =
      primero !== undefined &&
      (await isInsideStartRadius(
        input.trailSlug,
        primero[1], // lat
        primero[0], // lng
        START_RADIUS_M + START_TOLERANCE_M,
      ));
    // An older trail document may have no minValidTimeS: we treat it as 0 (no minimum).
    const { status, validated, invalidReason } = evaluarDescenso(
      input,
      {
        fin: (trail.end as { coordinates: [number, number] }).coordinates,
        minValidTimeS: (trail.minValidTimeS as number | undefined) ?? 0,
      },
      empiezaEnLaSalida,
    );

    // 5. Save. $setOnInsert only writes when the runId is new, so sending the
    // same run twice does not create a second descent.
    const descent = {
      trailId: trail._id,
      userId,
      // Reference to the bike, plus a copy of its type so the leaderboard (C3)
      // can show it without another $lookup.
      bikeId: bike?._id ?? null,
      startedAt: input.startedAt,
      durationMs: input.durationMs,
      avgSpeedKmh: input.avgSpeedKmh,
      elevationChangeM: input.elevationChangeM,
      bikeType: bike?.type ?? null,
      status,
      validated,
      invalidReason,
      isDemo: input.isDemo,
      track: input.track,
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
