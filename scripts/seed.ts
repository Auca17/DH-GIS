// Seed for the local MongoDB database. Run with: npm run seed
//
// Idempotent: it can run many times without duplicating data.
// - users and trails are upserted by a natural key (displayName / slug), so their
//   _id never changes and real descents that point to them keep working.
// - seed descents and reviews are tagged with source: "seed"; we delete only those
//   and insert them again. Data created by the app (no source: "seed") is kept.
//
// Data comes from src/lib/mock-data.ts (the same data the frontend mock shows).
import { MongoClient, type ObjectId } from "mongodb";
import { cerros, comentarios, leaderboardPorCerro } from "@/lib/mock-data";
import type { TipoBici, TramoPista } from "@/lib/types";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI. Copy .env.example to .env.local.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });

// ---------- Helpers ----------

// GeoJSON always uses [longitude, latitude] (the opposite of how we usually say it).
function toPoint(lat: number, lng: number) {
  return { type: "Point", coordinates: [lng, lat] };
}

// Joins all segments into one line. Consecutive segments share their joint point,
// so we skip a point when it is identical to the previous one.
function toLineString(segments: TramoPista[]) {
  const coordinates: number[][] = [];
  for (const segment of segments) {
    for (const p of segment.puntos) {
      const last = coordinates[coordinates.length - 1];
      if (!last || last[0] !== p.lng || last[1] !== p.lat) {
        coordinates.push([p.lng, p.lat]);
      }
    }
  }
  return { type: "LineString", coordinates };
}

// Mock dates are "YYYY-MM-DD"; we store real Date objects (Mendoza time, 10 AM).
function toDate(day: string) {
  return new Date(`${day}T10:00:00-03:00`);
}

// ---------- Indexes ----------

async function createIndexes() {
  const db = client.db();

  // 2dsphere on trails.start: needed by $geoNear / $near / $geoWithin
  // (C1 nearby trails, C2 "am I inside the start radius?").
  await db.collection("trails").createIndex({ start: "2dsphere" });

  // Unique on trails.slug: direct access to a trail by its URL name, and the
  // database itself rejects two trails with the same slug.
  await db.collection("trails").createIndex({ slug: 1 }, { unique: true });

  // Unique on users.displayName: the seed upserts users by this name, so it
  // must never repeat.
  await db.collection("users").createIndex({ displayName: 1 }, { unique: true });

  // Compound index for the leaderboard (C3): equality filters first
  // (trailId, status, validated) and the sort field last (durationMs), so
  // Mongo reads the best times already in order without sorting in memory.
  await db
    .collection("descents")
    .createIndex({ trailId: 1, status: 1, validated: 1, durationMs: 1 });

  // Reviews of one trail, newest first: filter by trailId, sort by createdAt desc.
  await db.collection("reviews").createIndex({ trailId: 1, createdAt: -1 });
}

// ---------- Users ----------

// Ratings for the mock comments (the frontend mock had no rating per comment).
const ratingByCommentId: Record<string, number> = {
  "c-pequia-1": 4,
  "c-pequia-2": 5,
  "c-cantera-1": 4,
  "c-cantera-2": 4,
  "c-zampal-1": 4,
  "c-quebrada-1": 5,
};

async function seedUsers(): Promise<Map<string, ObjectId>> {
  const users = client.db().collection("users");

  // Every name that appears in the leaderboard or in a comment.
  const names = new Set<string>();
  for (const entries of Object.values(leaderboardPorCerro)) {
    for (const entry of entries) names.add(entry.usuario);
  }
  for (const comment of comentarios) names.add(comment.autor);

  const idByName = new Map<string, ObjectId>();
  for (const displayName of names) {
    // upsert: update if it exists, insert if it doesn't.
    // $setOnInsert only writes when the document is new.
    const result = await users.findOneAndUpdate(
      { displayName },
      { $setOnInsert: { displayName, createdAt: new Date(), source: "seed" } },
      { upsert: true, returnDocument: "after" },
    );
    idByName.set(displayName, result!._id);
  }
  return idByName;
}

// ---------- Trails ----------

async function seedTrails(): Promise<Map<string, ObjectId>> {
  const trails = client.db().collection("trails");

  // Key: the mock id ("pequia"), value: the Mongo _id.
  const idByMockId = new Map<string, ObjectId>();

  for (const cerro of cerros) {
    const firstSegment = cerro.pista[0];
    const lastSegment = cerro.pista[cerro.pista.length - 1];
    const firstPoint = firstSegment.puntos[0];
    const lastPoint = lastSegment.puntos[lastSegment.puntos.length - 1];

    const trail = {
      slug: cerro.slug,
      name: cerro.nombre,
      description: cerro.descripcion,
      difficulty: cerro.dificultadGeneral,
      terrain: cerro.terreno,
      start: toPoint(firstPoint.lat, firstPoint.lng),
      end: toPoint(lastPoint.lat, lastPoint.lng),
      path: toLineString(cerro.pista),
      // Embedded: segments are always read together with the trail.
      segments: cerro.pista.map((segment) => ({
        difficulty: segment.dificultad,
        points: segment.puntos.map((p) => ({
          location: toPoint(p.lat, p.lng),
          elevationM: p.elevacionM,
        })),
      })),
      startRadiusM: 30, // play is enabled within this distance of `start`
      endRadiusM: 15, // the timer stops within this distance of `end`
      stats: {
        lengthM: cerro.largoM,
        dropM: cerro.desnivelM,
        avgGradePct: cerro.pendientePromedioPct,
        avgTimeS: cerro.tiempoPromedioS,
      },
      isPlaceholder: cerro.isPlaceholder,
      visibleOnMap: cerro.visibleEnMapa,
      dataSource: cerro.fuenteDatos ?? null,
      source: "seed",
    };

    const result = await trails.findOneAndUpdate(
      { slug: cerro.slug },
      { $set: trail },
      { upsert: true, returnDocument: "after" },
    );
    idByMockId.set(cerro.id, result!._id);
  }
  return idByMockId;
}

// ---------- Descents ----------

interface SeedDescent {
  trailMockId: string;
  user: string;
  durationMs: number;
  avgSpeedKmh: number;
  day: string;
  bikeType: TipoBici;
  status: "completed" | "interrupted";
  validated: boolean;
  invalidReason?: string;
}

// Extra descents so the queries have something interesting to show:
// slower attempts (C4 personal best), one SOS and one invalid time
// (both must stay out of the leaderboard).
const extraDescents: SeedDescent[] = [
  { trailMockId: "pequia", user: "Lucas R.", durationMs: 52_400, avgSpeedKmh: 24.9, day: "2026-09-05", bikeType: "DH", status: "completed", validated: true },
  { trailMockId: "pequia", user: "Lucas R.", durationMs: 54_100, avgSpeedKmh: 24.2, day: "2026-08-22", bikeType: "DH", status: "completed", validated: true },
  { trailMockId: "pequia", user: "Facu T.", durationMs: 56_000, avgSpeedKmh: 23.3, day: "2026-09-14", bikeType: "DH", status: "completed", validated: true },
  { trailMockId: "pequia", user: "Mica V.", durationMs: 21_000, avgSpeedKmh: 0, day: "2026-09-27", bikeType: "Enduro", status: "interrupted", validated: false, invalidReason: "SOS" },
  { trailMockId: "pequia", user: "Dieguito", durationMs: 31_000, avgSpeedKmh: 42.1, day: "2026-09-30", bikeType: "Enduro", status: "completed", validated: false, invalidReason: "max speed not plausible" },
  { trailMockId: "cantera", user: "Romi S.", durationMs: 93_800, avgSpeedKmh: 20.8, day: "2026-09-11", bikeType: "Enduro", status: "completed", validated: true },
];

async function seedDescents(trailIds: Map<string, ObjectId>, userIds: Map<string, ObjectId>) {
  const descents = client.db().collection("descents");

  // Leaderboard entries from the mock: all completed and valid.
  const all: SeedDescent[] = [];
  for (const entries of Object.values(leaderboardPorCerro)) {
    for (const e of entries) {
      all.push({
        trailMockId: e.cerroId,
        user: e.usuario,
        durationMs: e.tiempoMs,
        avgSpeedKmh: e.velocidadPromedioKmh,
        day: e.fecha,
        bikeType: e.bikeType,
        status: "completed",
        validated: true,
      });
    }
  }
  all.push(...extraDescents);

  const dropByMockId = new Map(cerros.map((c) => [c.id, c.desnivelM]));

  const documents = all.map((d) => ({
    // Referenced, not embedded: descents grow without limit.
    trailId: trailIds.get(d.trailMockId)!,
    userId: userIds.get(d.user)!,
    startedAt: toDate(d.day),
    durationMs: d.durationMs,
    avgSpeedKmh: d.avgSpeedKmh,
    elevationChangeM: dropByMockId.get(d.trailMockId)!,
    bikeType: d.bikeType,
    status: d.status,
    validated: d.validated,
    invalidReason: d.invalidReason ?? null,
    source: "seed",
  }));

  await descents.deleteMany({ source: "seed" });
  await descents.insertMany(documents);
  return documents.length;
}

// ---------- Reviews ----------

async function seedReviews(trailIds: Map<string, ObjectId>, userIds: Map<string, ObjectId>) {
  const reviews = client.db().collection("reviews");

  const documents = comentarios.map((c) => ({
    trailId: trailIds.get(c.cerroId)!,
    userId: userIds.get(c.autor)!,
    rating: ratingByCommentId[c.id],
    comment: c.texto,
    createdAt: toDate(c.fecha),
    source: "seed",
  }));

  await reviews.deleteMany({ source: "seed" });
  await reviews.insertMany(documents);
  return documents.length;
}

// ---------- Main ----------

async function main() {
  try {
    await client.db().command({ ping: 1 });
  } catch {
    console.error("MongoDB is not responding. Start the MongoDB service and try again.");
    process.exit(1);
  }

  await createIndexes();
  const userIds = await seedUsers();
  const trailIds = await seedTrails();
  const descentCount = await seedDescents(trailIds, userIds);
  const reviewCount = await seedReviews(trailIds, userIds);

  console.log(`Database: ${client.db().databaseName}`);
  console.log(`users:    ${userIds.size}`);
  console.log(`trails:   ${trailIds.size}`);
  console.log(`descents: ${descentCount} (seed)`);
  console.log(`reviews:  ${reviewCount} (seed)`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
