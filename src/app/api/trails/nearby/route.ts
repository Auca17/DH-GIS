import { connection } from "next/server";
import { isDbAvailable } from "@/lib/mongodb";
import { findNearbyTrails } from "@/lib/queries/c1-nearby-trails";

// GET /api/trails/nearby?lat=-32.8959&lng=-68.8953&maxDistanceM=10000
export async function GET(request: Request) {
  await connection();

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const maxDistanceM = Number(params.get("maxDistanceM") ?? 10_000);

  if (!params.get("lat") || !params.get("lng") || Number.isNaN(lat) || Number.isNaN(lng)) {
    return Response.json(
      { ok: false, message: "Send lat and lng, e.g. ?lat=-32.8959&lng=-68.8953" },
      { status: 400 },
    );
  }

  // Check first: if Mongo is down we answer a clear message instead of an error page.
  if (!(await isDbAvailable())) {
    return Response.json(
      { ok: false, message: "The database is not responding. Try again in a moment." },
      { status: 503 },
    );
  }

  const trails = await findNearbyTrails(lat, lng, maxDistanceM);
  return Response.json({ ok: true, trails });
}
