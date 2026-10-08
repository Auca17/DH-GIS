import { connection } from "next/server";
import { loadTrails } from "@/lib/data/trail-data";

// GET /api/trails -> all trails. The response always tells the database state.
export async function GET() {
  await connection();

  const { dbStatus, data } = await loadTrails();
  return Response.json({ ok: true, dbStatus, data });
}
