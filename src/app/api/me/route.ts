import { connection } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { isDbAvailable } from "@/lib/mongodb";
import { getRiderProfile } from "@/lib/queries/c13-rider-profile";

/*
 * GET /api/me — who is signed in, with their bikes (query C13)
 *
 * Signed out is not an error: { ok: true, usuario: null, bicis: [] }.
 * The screens use it to show "Ingresar" or the rider's name, and the bike picker.
 */
export async function GET() {
  await connection();

  if (!(await isDbAvailable())) {
    return Response.json({ ok: false, dbStatus: "offline", usuario: null, bicis: [] }, { status: 503 });
  }

  const userId = await getSessionUserId();
  const profile = userId ? await getRiderProfile(userId) : null;
  return Response.json({
    ok: true,
    usuario: profile?.usuario ?? null,
    bicis: profile?.bicis ?? [],
  });
}
