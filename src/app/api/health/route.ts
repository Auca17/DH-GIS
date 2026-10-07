import { connection } from "next/server";
import { getDb, isDbAvailable } from "@/lib/mongodb";

// GET /api/health — checks that the local MongoDB answers.
export async function GET() {
  // Run on every request (never prerendered at build time).
  await connection();

  const ok = await isDbAvailable();

  if (!ok) {
    return Response.json(
      {
        ok: false,
        message:
          "MongoDB is not responding. Start the MongoDB service and check MONGODB_URI in .env.local.",
      },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, database: getDb().databaseName });
}
