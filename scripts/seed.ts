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

  // Unique runId: POST /api/descents saves each run once, even if two identical
  // requests arrive at the same time. Seed descents have no runId, so the index
  // only covers documents that have one (partial index).
  await db
    .collection("descents")
    .createIndex({ runId: 1 }, { unique: true, partialFilterExpression: { runId: { $type: "string" } } });

  // Reviews of one trail, newest first: filter by trailId, sort by createdAt desc.
  await db.collection("reviews").createIndex({ trailId: 1, createdAt: -1 });

  // Unique email: two accounts can never share one. Seed riders have no email,
  // so the index only covers documents that have one (partial index).
  await db
    .collection("users")
    .createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

  // A rider's bikes, main bike first (C13 rider profile, the bike picker).
  await db.collection("bikes").createIndex({ userId: 1, isPrimary: -1 });

  // At most ONE main bike per rider, enforced by the database: unique on userId,
  // but only among the bikes with isPrimary: true (partial unique index).
  await db
    .collection("bikes")
    .createIndex(
      { userId: 1 },
      { unique: true, partialFilterExpression: { isPrimary: true }, name: "one_primary_bike_per_user" },
    );

  // Sessions are looked up by the hash of the cookie token on every request.
  await db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true });

  // TTL index: MongoDB deletes each session by itself once expiresAt has passed
  // (expireAfterSeconds: 0 = "at the date stored in the field").
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

// ---------- Validation ($jsonSchema) ----------

// The database itself rejects documents with a wrong shape, even if a bug in the app
// (or someone in Compass) tries to save them. The API validates too, with friendly
// messages; this is the last line of defense.
// "number" accepts int, long and double (the driver saves 2019 as an int).
const VALIDATORS: Record<string, object> = {
  users: {
    bsonType: "object",
    required: ["displayName", "createdAt"],
    properties: {
      displayName: { bsonType: "string", minLength: 1, maxLength: 30 },
      email: { bsonType: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
      passwordHash: { bsonType: "string" },
      passwordSalt: { bsonType: "string" },
      level: { enum: ["principiante", "intermedio", "avanzado"] },
      city: { bsonType: "string", minLength: 2, maxLength: 60 },
      ridingSinceYear: { bsonType: "number", minimum: 1950, maximum: 2100 },
      createdAt: { bsonType: "date" },
      source: { enum: ["seed", "app"] },
    },
  },
  bikes: {
    bsonType: "object",
    required: [
      "userId",
      "type",
      "brand",
      "model",
      "year",
      "wheelSize",
      "travelFrontMm",
      "travelRearMm",
      "isPrimary",
      "createdAt",
    ],
    properties: {
      userId: { bsonType: "objectId" },
      type: { enum: ["DH", "Enduro", "Trail"] },
      brand: { bsonType: "string", minLength: 1, maxLength: 40 },
      model: { bsonType: "string", minLength: 1, maxLength: 60 },
      year: { bsonType: "number", minimum: 1990, maximum: 2100 },
      wheelSize: { enum: ["27.5", "29", "mullet"] },
      travelFrontMm: { bsonType: "number", minimum: 80, maximum: 220 },
      travelRearMm: { bsonType: "number", minimum: 0, maximum: 220 },
      isPrimary: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
      source: { enum: ["seed", "app"] },
    },
  },
  sessions: {
    bsonType: "object",
    required: ["tokenHash", "userId", "createdAt", "expiresAt"],
    properties: {
      tokenHash: { bsonType: "string", minLength: 64, maxLength: 64 },
      userId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
      expiresAt: { bsonType: "date" },
    },
  },
};

async function applyValidators() {
  const db = client.db();
  for (const [name, schema] of Object.entries(VALIDATORS)) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    try {
      if (exists) {
        // collMod changes the rules of a collection that already has data.
        await db.command({ collMod: name, validator: { $jsonSchema: schema }, validationLevel: "strict" });
      } else {
        await db.createCollection(name, { validator: { $jsonSchema: schema } });
      }
    } catch (error) {
      // Code 13 = Unauthorized. In Atlas, a user with only "read and write" cannot run
      // collMod: the data still loads, only the validation is skipped.
      if ((error as { code?: number }).code === 13) {
        console.warn(
          `[seed] No permission to add the validator to "${name}". In Atlas, give the database user the "Atlas admin" role and run the seed again.`,
        );
        continue;
      }
      throw error;
    }
  }
}

// ---------- Users ----------

// Ratings for the mock comments (the frontend mock had no rating per comment).
const ratingByCommentId: Record<string, number> = {
  "c-pequia-1": 4,
  "c-pequia-2": 5,
  "c-lloron-1": 4,
  "c-lloron-2": 5,
  "c-gloria-1": 4,
  "c-gloria-2": 5,
};

// Profile of each seed rider (they cannot sign in: no email, no password).
const SEED_PROFILES: Record<string, { level: string; city: string; ridingSinceYear: number }> = {
  "Lucas R.": { level: "avanzado", city: "Mendoza", ridingSinceYear: 2012 },
  "Mica V.": { level: "intermedio", city: "Godoy Cruz", ridingSinceYear: 2018 },
  "Facu T.": { level: "avanzado", city: "Luján de Cuyo", ridingSinceYear: 2014 },
  "Romi S.": { level: "intermedio", city: "Mendoza", ridingSinceYear: 2017 },
  Dieguito: { level: "principiante", city: "Las Heras", ridingSinceYear: 2023 },
  "Ignacio P.": { level: "avanzado", city: "Godoy Cruz", ridingSinceYear: 2010 },
  "Bruno K.": { level: "intermedio", city: "Maipú", ridingSinceYear: 2016 },
  "Jime L.": { level: "principiante", city: "Luján de Cuyo", ridingSinceYear: 2022 },
  "Sol M.": { level: "intermedio", city: "Mendoza", ridingSinceYear: 2019 },
};

async function seedUsers(): Promise<Map<string, ObjectId>> {
  const users = client.db().collection("users");

  // Every name that appears in the leaderboard or in a comment.
  const names = new Set<string>();
  for (const entries of Object.values(leaderboardPorCerro)) {
    for (const entry of entries) names.add(entry.usuario);
  }
  for (const comment of comentarios) names.add(comment.autor);
  // The user that POST /api/descents saves demo runs under when nobody is signed in.
  names.add("Demo rider");

  const idByName = new Map<string, ObjectId>();
  for (const displayName of names) {
    // upsert: update if it exists, insert if it doesn't.
    // $setOnInsert only writes when the document is new.
    // $set the profile (level, city...) so queries C10 and C11 have data to group.
    const profile = SEED_PROFILES[displayName] ?? {};
    const result = await users.findOneAndUpdate(
      { displayName },
      { $set: profile, $setOnInsert: { displayName, createdAt: new Date(), source: "seed" } },
      { upsert: true, returnDocument: "after" },
    );
    idByName.set(displayName, result!._id);
  }
  return idByName;
}

// ---------- Trails ----------

async function seedTrails(): Promise<Map<string, ObjectId>> {
  const trails = client.db().collection("trails");

  // Clean out any seed trails that are no longer in the active dataset
  const activeSlugs = cerros.map((c) => c.slug);
  await trails.deleteMany({ source: "seed", slug: { $nin: activeSlugs } });

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
      // Fastest time the server accepts as valid (anti-cheat).
      minValidTimeS: cerro.tiempoMinimoValidoS,
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

// ---------- Bikes ----------

// One typical build per bike type. Two seed riders with the same type get the same
// build: each one is still a separate document (a bike is a rider's own bike, not a model).
const SEED_BIKE_BY_TYPE: Record<TipoBici, object> = {
  DH: { brand: "Specialized", model: "Demo", year: 2024, wheelSize: "29", travelFrontMm: 200, travelRearMm: 200 },
  Enduro: { brand: "Santa Cruz", model: "Megatower", year: 2023, wheelSize: "29", travelFrontMm: 170, travelRearMm: 165 },
  Trail: { brand: "Trek", model: "Fuel EX", year: 2022, wheelSize: "29", travelFrontMm: 140, travelRearMm: 130 },
};

/** Key of the bike map: rider name + bike type ("Romi S.|Enduro"). */
function bikeKey(user: string, type: TipoBici): string {
  return `${user}|${type}`;
}

// Each seed rider gets one bike per bike type they rode in the seed descents,
// so "Romi S." (Trail and Enduro) has TWO bikes. The first one is the main bike.
async function seedBikes(
  userIds: Map<string, ObjectId>,
  descents: SeedDescent[],
): Promise<Map<string, ObjectId>> {
  const bikes = client.db().collection("bikes");
  const now = new Date();

  const documents: Array<Record<string, unknown>> = [];
  const keys: string[] = [];
  const hasPrimary = new Set<string>();
  for (const d of descents) {
    const key = bikeKey(d.user, d.bikeType);
    if (keys.includes(key)) continue;
    keys.push(key);
    documents.push({
      userId: userIds.get(d.user)!,
      type: d.bikeType,
      ...SEED_BIKE_BY_TYPE[d.bikeType],
      isPrimary: !hasPrimary.has(d.user),
      createdAt: now,
      source: "seed",
    });
    hasPrimary.add(d.user);
  }

  // Same idea as descents: only seed bikes are deleted and inserted again.
  await bikes.deleteMany({ source: "seed" });
  const result = await bikes.insertMany(documents);

  const idByKey = new Map<string, ObjectId>();
  keys.forEach((key, i) => idByKey.set(key, result.insertedIds[i]));
  return idByKey;
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
  { trailMockId: "el-lloron", user: "Romi S.", durationMs: 79_800, avgSpeedKmh: 23.8, day: "2026-09-11", bikeType: "Enduro", status: "completed", validated: true },
  { trailMockId: "escarpado-gloria", user: "Sol M.", durationMs: 64_200, avgSpeedKmh: 27.1, day: "2026-09-08", bikeType: "DH", status: "completed", validated: true },
];

/** Every seed descent: the mock leaderboard entries plus the extra ones. */
function allSeedDescents(): SeedDescent[] {
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
  return all;
}

async function seedDescents(
  trailIds: Map<string, ObjectId>,
  userIds: Map<string, ObjectId>,
  bikeIds: Map<string, ObjectId>,
) {
  const descents = client.db().collection("descents");
  const all = allSeedDescents();

  const dropByMockId = new Map(cerros.map((c) => [c.id, c.desnivelM]));

  const documents = all.map((d) => ({
    // Referenced, not embedded: descents grow without limit.
    trailId: trailIds.get(d.trailMockId)!,
    userId: userIds.get(d.user)!,
    bikeId: bikeIds.get(bikeKey(d.user, d.bikeType))!,
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

  // Validators first: the documents inserted below must already follow them.
  await applyValidators();
  await createIndexes();
  const userIds = await seedUsers();
  const trailIds = await seedTrails();
  const bikeIds = await seedBikes(userIds, allSeedDescents());
  const descentCount = await seedDescents(trailIds, userIds, bikeIds);
  const reviewCount = await seedReviews(trailIds, userIds);

  console.log(`Database: ${client.db().databaseName}`);
  console.log(`users:    ${userIds.size}`);
  console.log(`trails:   ${trailIds.size}`);
  console.log(`bikes:    ${bikeIds.size} (seed)`);
  console.log(`descents: ${descentCount} (seed)`);
  console.log(`reviews:  ${reviewCount} (seed)`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
