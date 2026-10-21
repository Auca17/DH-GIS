import { connection } from "next/server";
import { endSession } from "@/lib/auth/session";
import { isDbAvailable } from "@/lib/mongodb";

/*
 * POST /api/auth/logout — signs out: deletes the session and the cookie.
 * Compass equivalent: db.sesiones.deleteOne({ hashToken: "..." })
 */
export async function POST() {
  await connection();
  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "No hay conexión con la base. Probá de nuevo en un rato." },
      { status: 503 },
    );
  }
  await endSession();
  return Response.json({ ok: true });
}
