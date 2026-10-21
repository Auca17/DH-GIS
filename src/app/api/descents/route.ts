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
 * saves it in `bajadas`, with its track ([lng, lat, ms] points). The server (not the
 * client) decides if the run counts, with the rules of lib/descents/descent-rules.ts:
 * SOS, too fast, did not start at the start (checked with C2, $geoWithin on the
 * 2dsphere index), did not reach the finish, implausible speed, GPS lost, time mismatch.
 * Runs that are not validated stay in the database but never reach the leaderboard (C3).
 *
 * Course concept: server-side validation (never trust the client) and references
 * between collections (the descent stores senderoId and usuarioId, the _id of a
 * document in `senderos` and `usuarios`).
 *
 * Equivalent in Compass / mongosh (idCorrida makes it idempotent: the same run sent
 * twice, for example a double click or a retry, is saved only once):
 *
 * db.bajadas.updateOne(
 *   { idCorrida: "circuito-dh-pequia-1760000000000" },
 *   {
 *     $setOnInsert: {
 *       senderoId: ObjectId("PASTE_TRAIL_ID_HERE"),
 *       usuarioId: ObjectId("PASTE_USER_ID_HERE"),
 *       fechaInicio: new Date(),
 *       duracion: 45000,
 *       velocidadPromedioKmh: 24,
 *       desnivelM: 70,
 *       estado: "completada",
 *       valida: true,
 *       esDemo: false,
 *       recorrido: [[-68.89533, -32.8959, 0], [-68.89357, -32.89347, 45000]],
 *       idCorrida: "circuito-dh-pequia-1760000000000",
 *       fechaCreacion: new Date()
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
    return Response.json({ ok: false, message: "Los datos no llegaron bien." }, { status: 400 });
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
    const trail = await db.collection("senderos").findOne({ codigo: input.trailSlug });
    if (!trail) {
      return Response.json({ ok: false, message: "No encontramos ese sendero." }, { status: 404 });
    }

    // 3b. Who is saving it. The rider ALWAYS comes from the session cookie, never
    // from the body. With a session: that rider and one of THEIR bikes (the bike is
    // searched with its _id AND the rider's usuarioId, so another rider's bike is not
    // found). Without a session: only demo runs, saved as "Demo rider" with no bike.
    let userId: ObjectId;
    let bike: { _id: ObjectId; tipo?: string } | null = null;
    const sessionUserId = await getSessionUserId();
    if (sessionUserId) {
      userId = sessionUserId;
      const bikes = db.collection("bicis");
      bike = input.bikeId
        ? await bikes.findOne(
            { _id: new ObjectId(input.bikeId), usuarioId: sessionUserId },
            { projection: { tipo: 1 } },
          )
        : await bikes.findOne({ usuarioId: sessionUserId, principal: true }, { projection: { tipo: 1 } });
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
      const demoUser = await db.collection("usuarios").findOne({ nombre: DEMO_USER_NAME });
      if (!demoUser) {
        return Response.json(
          { ok: false, dbStatus: "empty", message: "Falta cargar los datos de ejemplo (npm run seed)." },
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
    // An older trail document may have no tiempoMinimoS: we treat it as 0 (no minimum).
    const { status, validated, invalidReason } = evaluarDescenso(
      input,
      {
        fin: (trail.fin as { coordinates: [number, number] }).coordinates,
        minValidTimeS: (trail.tiempoMinimoS as number | undefined) ?? 0,
      },
      empiezaEnLaSalida,
    );

    // 5. Save. $setOnInsert only writes when the idCorrida is new, so sending the
    // same run twice does not create a second descent.
    const descent: Record<string, unknown> = {
      senderoId: trail._id,
      usuarioId: userId,
      fechaInicio: input.startedAt,
      duracion: input.durationMs,
      velocidadPromedioKmh: input.avgSpeedKmh,
      desnivelM: input.elevationChangeM,
      // The rules work in English; the database stores the state in Spanish.
      estado: status === "completed" ? "completada" : "interrumpida",
      valida: validated,
      esDemo: input.isDemo,
      recorrido: input.track,
      idCorrida: input.runId,
      fechaCreacion: new Date(),
    };
    // Reference to the bike, plus a copy of its type so the leaderboard (C3) can show
    // it without another $lookup. A run without a bike simply has no such fields.
    if (bike) {
      descent.biciId = bike._id;
      descent.tipoBici = bike.tipo;
    }
    // The reason is only stored when the run does not count.
    if (invalidReason) {
      descent.motivoInvalida = invalidReason;
    }
    const result = await db
      .collection("bajadas")
      .updateOne({ idCorrida: input.runId }, { $setOnInsert: descent }, { upsert: true });

    // On a repeated idCorrida we answer with what was stored the first time.
    const saved =
      result.upsertedCount === 1
        ? descent
        : await db.collection("bajadas").findOne({ idCorrida: input.runId });
    const savedStatus = saved ? (saved.estado === "completada" ? "completed" : "interrupted") : status;

    return Response.json(
      {
        ok: true,
        dbStatus: "ok",
        data: {
          validated: (saved?.valida as boolean | undefined) ?? validated,
          status: savedStatus,
          invalidReason: (saved?.motivoInvalida as string | undefined) ?? invalidReason ?? null,
        },
      },
      { status: result.upsertedCount === 1 ? 201 : 200 },
    );
  } catch (error) {
    console.error("[api/descents] save failed:", (error as Error).message);
    return offlineResponse();
  }
}
