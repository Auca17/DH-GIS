import { connection } from "next/server";
import { loadTrail } from "@/lib/data/trail-data";

// GET /api/trails/circuito-dh-pequia -> one trail
export async function GET(_request: Request, ctx: RouteContext<"/api/trails/[slug]">) {
  await connection();

  const { slug } = await ctx.params;
  const { dbStatus, data } = await loadTrail(slug);

  // "empty" has no data on purpose (the screen shows the seed message).
  // With "ok" or "offline", no data means the trail does not exist.
  if (data === null && dbStatus !== "empty") {
    return Response.json({ ok: false, dbStatus, message: "Trail not found." }, { status: 404 });
  }
  return Response.json({ ok: true, dbStatus, data });
}
