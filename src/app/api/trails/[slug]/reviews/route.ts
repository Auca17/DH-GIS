import { connection } from "next/server";
import { loadReviews } from "@/lib/data/trail-data";

// GET /api/trails/circuito-dh-pequia/reviews -> reviews, newest first
export async function GET(_request: Request, ctx: RouteContext<"/api/trails/[slug]/reviews">) {
  await connection();

  const { slug } = await ctx.params;
  const { dbStatus, data } = await loadReviews(slug);

  // "empty" has no data on purpose (the screen shows the seed message).
  // With "ok" or "offline", no data means the trail does not exist.
  if (data === null && dbStatus !== "empty") {
    return Response.json({ ok: false, dbStatus, message: "Trail not found." }, { status: 404 });
  }
  return Response.json({ ok: true, dbStatus, data });
}
