import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { validateRegister } from "@/lib/auth/validate-auth";
import { toBikeFields } from "@/lib/bikes/validate-bike";
import { getDb, isDbAvailable } from "@/lib/mongodb";

/*
 * POST /api/auth/register — creates a rider, their first bike and a session
 *
 * The bike is required: every real descent must point to a bike.
 * The first bike is the main one (principal: true). It is embedded in the user
 * (usuarios.bicis), so the rider and the bike are saved in ONE insert.
 *
 * Course concept: unique indexes as the last word. We check for a repeated name or
 * email first (to give a clear message), but if two sign-ups arrive at the same time
 * the unique indexes on usuarios.nombre and usuarios.email reject the second one
 * (error code 11000).
 */

const OFFLINE = { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." };

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number }).code === 11000;
}

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Los datos no llegaron bien." }, { status: 400 });
  }
  const check = validateRegister(body);
  if (!check.ok) {
    return Response.json({ ok: false, message: check.message }, { status: 400 });
  }
  const input = check.value;

  if (!(await isDbAvailable())) {
    return Response.json(OFFLINE, { status: 503 });
  }

  const db = getDb();
  const users = db.collection("usuarios");

  const taken = await users.findOne(
    { $or: [{ nombre: input.displayName }, { email: input.email }] },
    { projection: { nombre: 1 } },
  );
  if (taken) {
    const message =
      taken.nombre === input.displayName
        ? "Ese nombre visible ya está en uso. Elegí otro."
        : "Ya hay una cuenta con ese email.";
    return Response.json({ ok: false, message }, { status: 409 });
  }

  const { hash, salt } = await hashPassword(input.password);
  const now = new Date();

  let userId: ObjectId;
  try {
    const result = await users.insertOne({
      nombre: input.displayName,
      email: input.email,
      hashContrasena: hash,
      salContrasena: salt,
      nivel: input.level,
      ciudad: input.city,
      anioInicio: input.ridingSinceYear,
      fechaCreacion: now,
      // Embedded: a single-document write is atomic, no need to undo anything by hand.
      bicis: [{ _id: new ObjectId(), ...toBikeFields(input.bike), principal: true }],
    });
    userId = result.insertedId;
  } catch (error) {
    if (isDuplicateKey(error)) {
      return Response.json(
        { ok: false, message: "Ese nombre o ese email ya están en uso." },
        { status: 409 },
      );
    }
    console.error("[api/auth/register] user insert failed:", (error as Error).message);
    return Response.json(OFFLINE, { status: 503 });
  }

  await startSession(userId);
  return Response.json({ ok: true }, { status: 201 });
}
