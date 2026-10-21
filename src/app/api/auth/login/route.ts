import { connection } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { validateLogin } from "@/lib/auth/validate-auth";
import { getDb, isDbAvailable } from "@/lib/mongodb";

/*
 * POST /api/auth/login — signs a rider in with email and password
 *
 * The same message for "no such email" and "wrong password": telling them apart
 * would let anyone find out which emails have an account.
 *
 * Compass equivalent of the lookup (unique index on email):
 *   db.usuarios.findOne({ email: "augu@mail.com" })
 */

const WRONG = { ok: false, message: "Email o contraseña incorrectos." };

export async function POST(request: Request) {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Los datos no llegaron bien." }, { status: 400 });
  }
  const check = validateLogin(body);
  if (!check.ok) {
    return Response.json({ ok: false, message: check.message }, { status: 400 });
  }

  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }

  const user = await getDb()
    .collection("usuarios")
    .findOne({ email: check.value.email }, { projection: { hashContrasena: 1, salContrasena: 1 } });
  // Seed users have no password: they can never sign in.
  if (!user || typeof user.hashContrasena !== "string" || typeof user.salContrasena !== "string") {
    return Response.json(WRONG, { status: 401 });
  }
  if (!(await verifyPassword(check.value.password, user.hashContrasena, user.salContrasena))) {
    return Response.json(WRONG, { status: 401 });
  }

  await startSession(user._id);
  return Response.json({ ok: true });
}
