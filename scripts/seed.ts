// Seed for the local MongoDB database. Run with: npm run seed
//
// Idempotent: it can run many times without duplicating data.
// - usuarios and senderos are upserted by a natural key (nombre / codigo), so their
//   _id never changes and real descents that point to them keep working.
// - Seed riders are the usuarios WITHOUT email (they cannot sign in). Their bicis,
//   bajadas and resenas are deleted and inserted again. Data of real accounts
//   (usuarios with email) is kept.
//
// Data comes from src/lib/mock-data.ts (the same data the frontend mock shows).
import { MongoClient, type ObjectId } from "mongodb";
import { cerros, comentarios, leaderboardPorCerro } from "@/lib/mock-data";
import type { TipoBici } from "@/lib/types";
import { generateVolume, type VolumeDescent, type VolumeReview, type VolumeRider } from "./seed-volume";

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

// Mock dates are "YYYY-MM-DD"; we store real Date objects (Mendoza time, 10 AM).
function toDate(day: string) {
  return new Date(`${day}T10:00:00-03:00`);
}

// The generator and the mock data work in English; the database stores the state in Spanish.
function toEstado(status: "completed" | "interrupted") {
  return status === "completed" ? "completada" : "interrumpida";
}

// ---------- Indexes ----------

async function createIndexes() {
  const db = client.db();

  // 2dsphere on senderos.inicio: needed by $geoNear / $near / $geoWithin
  // (C1 nearby trails, C2 "am I inside the start radius?").
  await db.collection("senderos").createIndex({ inicio: "2dsphere" });

  // Unique on senderos.codigo: direct access to a trail by its URL name, and the
  // database itself rejects two trails with the same codigo.
  await db.collection("senderos").createIndex({ codigo: 1 }, { unique: true });

  // Unique on usuarios.nombre: the seed upserts users by this name, so it
  // must never repeat.
  await db.collection("usuarios").createIndex({ nombre: 1 }, { unique: true });

  // Compound index for the leaderboard (C3): equality filters first
  // (senderoId, estado, valida) and the sort field last (duracion), so
  // Mongo reads the best times already in order without sorting in memory.
  await db.collection("bajadas").createIndex({ senderoId: 1, estado: 1, valida: 1, duracion: 1 });

  // Unique idCorrida: POST /api/descents saves each run once, even if two identical
  // requests arrive at the same time. Seed descents have no idCorrida, so the index
  // only covers documents that have one (partial index).
  await db
    .collection("bajadas")
    .createIndex({ idCorrida: 1 }, { unique: true, partialFilterExpression: { idCorrida: { $type: "string" } } });

  // Reviews of one trail, newest first: filter by senderoId, sort by fecha desc.
  await db.collection("resenas").createIndex({ senderoId: 1, fecha: -1 });

  // At most ONE review per descent (POST /api/reviews). Seed reviews have no
  // bajadaId, so the index only covers documents that have one (partial index).
  await db
    .collection("resenas")
    .createIndex(
      { bajadaId: 1 },
      { unique: true, partialFilterExpression: { bajadaId: { $type: "objectId" } }, name: "una_resena_por_bajada" },
    );

  // Unique email: two accounts can never share one. Seed riders have no email,
  // so the index only covers documents that have one (partial index).
  await db
    .collection("usuarios")
    .createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

  // A rider's bikes, main bike first (C13 rider profile, the bike picker).
  await db.collection("bicis").createIndex({ usuarioId: 1, principal: -1 });

  // At most ONE main bike per rider, enforced by the database: unique on usuarioId,
  // but only among the bikes with principal: true (partial unique index).
  await db
    .collection("bicis")
    .createIndex(
      { usuarioId: 1 },
      { unique: true, partialFilterExpression: { principal: true }, name: "una_bici_principal_por_usuario" },
    );

  // Sessions are looked up by the hash of the cookie token on every request.
  await db.collection("sesiones").createIndex({ hashToken: 1 }, { unique: true });

  // TTL index: MongoDB deletes each session by itself once venceEn has passed
  // (expireAfterSeconds: 0 = "at the date stored in the field").
  await db.collection("sesiones").createIndex({ venceEn: 1 }, { expireAfterSeconds: 0 });
}

// ---------- Validation ($jsonSchema) ----------

// The database itself rejects documents with a wrong shape, even if a bug in the app
// (or someone in Compass) tries to save them. The API validates too, with friendly
// messages; this is the last line of defense.
// "number" accepts int, long and double (the driver saves 2019 as an int).
const VALIDATORS: Record<string, object> = {
  usuarios: {
    bsonType: "object",
    required: ["nombre", "fechaCreacion"],
    properties: {
      nombre: { bsonType: "string", minLength: 1, maxLength: 30 },
      email: { bsonType: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
      hashContrasena: { bsonType: "string" },
      salContrasena: { bsonType: "string" },
      nivel: { enum: ["principiante", "intermedio", "avanzado"] },
      ciudad: { bsonType: "string", minLength: 2, maxLength: 60 },
      anioInicio: { bsonType: "number", minimum: 1950, maximum: 2100 },
      fechaCreacion: { bsonType: "date" },
    },
  },
  bicis: {
    bsonType: "object",
    required: [
      "usuarioId",
      "tipo",
      "marca",
      "modelo",
      "anio",
      "rodado",
      "recorridoDelanteroMm",
      "recorridoTraseroMm",
      "principal",
    ],
    properties: {
      usuarioId: { bsonType: "objectId" },
      tipo: { enum: ["DH", "Enduro", "Trail"] },
      marca: { bsonType: "string", minLength: 1, maxLength: 40 },
      modelo: { bsonType: "string", minLength: 1, maxLength: 60 },
      anio: { bsonType: "number", minimum: 1990, maximum: 2100 },
      rodado: { enum: ["27.5", "29", "mullet"] },
      recorridoDelanteroMm: { bsonType: "number", minimum: 80, maximum: 220 },
      recorridoTraseroMm: { bsonType: "number", minimum: 0, maximum: 220 },
      principal: { bsonType: "bool" },
    },
  },
  sesiones: {
    bsonType: "object",
    required: ["hashToken", "usuarioId", "fechaCreacion", "venceEn"],
    properties: {
      hashToken: { bsonType: "string", minLength: 64, maxLength: 64 },
      usuarioId: { bsonType: "objectId" },
      fechaCreacion: { bsonType: "date" },
      venceEn: { bsonType: "date" },
    },
  },
  senderos: {
    bsonType: "object",
    required: ["codigo", "nombre", "dificultad", "inicio", "fin", "tramos", "tiempoMinimoS"],
    properties: {
      codigo: { bsonType: "string", pattern: "^[a-z0-9-]{1,80}$" },
      nombre: { bsonType: "string", minLength: 1, maxLength: 80 },
      dificultad: { enum: ["facil", "intermedia", "dificil"] },
      // GeoJSON points: [longitude, latitude]. The 2dsphere index needs this exact shape
      // (the keys `type` and `coordinates` are fixed by the GeoJSON standard).
      inicio: {
        bsonType: "object",
        required: ["type", "coordinates"],
        properties: {
          type: { enum: ["Point"] },
          coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "number" } },
        },
      },
      fin: {
        bsonType: "object",
        required: ["type", "coordinates"],
        properties: {
          type: { enum: ["Point"] },
          coordinates: { bsonType: "array", minItems: 2, maxItems: 2, items: { bsonType: "number" } },
        },
      },
      tramos: { bsonType: "array", minItems: 1 },
      tiempoMinimoS: { bsonType: "number", minimum: 0 },
    },
  },
  bajadas: {
    bsonType: "object",
    required: ["senderoId", "usuarioId", "fechaInicio", "duracion", "estado", "valida"],
    properties: {
      senderoId: { bsonType: "objectId" },
      usuarioId: { bsonType: "objectId" },
      // Missing when the run was saved without a bike (signed out, demo mode).
      biciId: { bsonType: "objectId" },
      fechaInicio: { bsonType: "date" },
      // Milliseconds (at most 2 hours).
      duracion: { bsonType: "number", minimum: 1, maximum: 7200000 },
      velocidadPromedioKmh: { bsonType: "number", minimum: 0 },
      desnivelM: { bsonType: "number" },
      tipoBici: { enum: ["DH", "Enduro", "Trail"] },
      estado: { enum: ["completada", "interrumpida"] },
      valida: { bsonType: "bool" },
      // Only present when the run does not count.
      motivoInvalida: { bsonType: "string" },
      esDemo: { bsonType: "bool" },
      recorrido: { bsonType: "array" },
      idCorrida: { bsonType: "string" },
      fechaCreacion: { bsonType: "date" },
    },
  },
  resenas: {
    bsonType: "object",
    required: ["senderoId", "usuarioId", "calificacion", "comentario", "fecha"],
    properties: {
      senderoId: { bsonType: "objectId" },
      usuarioId: { bsonType: "objectId" },
      // Only reviews made from the app point to the descent they review.
      bajadaId: { bsonType: "objectId" },
      calificacion: { bsonType: "int", minimum: 1, maximum: 5 },
      comentario: { bsonType: "string", maxLength: 500 },
      fecha: { bsonType: "date" },
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
const SEED_PROFILES: Record<string, { nivel: string; ciudad: string; anioInicio: number }> = {
  "Lucas R.": { nivel: "avanzado", ciudad: "Mendoza", anioInicio: 2012 },
  "Mica V.": { nivel: "intermedio", ciudad: "Godoy Cruz", anioInicio: 2018 },
  "Facu T.": { nivel: "avanzado", ciudad: "Luján de Cuyo", anioInicio: 2014 },
  "Romi S.": { nivel: "intermedio", ciudad: "Mendoza", anioInicio: 2017 },
  Dieguito: { nivel: "principiante", ciudad: "Las Heras", anioInicio: 2023 },
  "Ignacio P.": { nivel: "avanzado", ciudad: "Godoy Cruz", anioInicio: 2010 },
  "Bruno K.": { nivel: "intermedio", ciudad: "Maipú", anioInicio: 2016 },
  "Jime L.": { nivel: "principiante", ciudad: "Luján de Cuyo", anioInicio: 2022 },
  "Sol M.": { nivel: "intermedio", ciudad: "Mendoza", anioInicio: 2019 },
};

/** Every rider name of the mock data (leaderboard and comments), plus "Demo rider". */
function mockRiderNames(): Set<string> {
  const names = new Set<string>();
  for (const entries of Object.values(leaderboardPorCerro)) {
    for (const entry of entries) names.add(entry.usuario);
  }
  for (const comment of comentarios) names.add(comment.autor);
  // The user that POST /api/descents saves demo runs under when nobody is signed in.
  names.add("Demo rider");
  return names;
}

async function seedUsers(volumeRiders: VolumeRider[]): Promise<Map<string, ObjectId>> {
  const users = client.db().collection("usuarios");
  const names = mockRiderNames();

  const idByName = new Map<string, ObjectId>();
  for (const nombre of names) {
    // upsert: update if it exists, insert if it doesn't.
    // $setOnInsert only writes when the document is new.
    // $set the profile (nivel, ciudad...) so queries C10 and C11 have data to group.
    const profile = SEED_PROFILES[nombre] ?? {};
    const result = await users.findOneAndUpdate(
      { nombre },
      { $set: profile, $setOnInsert: { nombre, fechaCreacion: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    idByName.set(nombre, result!._id);
  }

  // Volume riders: the same upsert, but all in ONE bulkWrite (one trip to the
  // database instead of 60, which matters a lot against Atlas).
  const now = new Date();
  await users.bulkWrite(
    volumeRiders.map((r) => ({
      updateOne: {
        filter: { nombre: r.displayName },
        update: {
          $set: { nivel: r.level, ciudad: r.city, anioInicio: r.ridingSinceYear },
          $setOnInsert: { nombre: r.displayName, fechaCreacion: now },
        },
        upsert: true,
      },
    })),
  );
  const volumeDocs = await users
    .find({ nombre: { $in: volumeRiders.map((r) => r.displayName) } }, { projection: { nombre: 1 } })
    .toArray();
  for (const doc of volumeDocs) idByName.set(doc.nombre as string, doc._id);

  return idByName;
}

// ---------- Trails ----------

async function seedTrails(): Promise<Map<string, ObjectId>> {
  const trails = client.db().collection("senderos");

  // Clean out any trails that are no longer in the active dataset (src/data).
  const activeCodes = cerros.map((c) => c.slug);
  await trails.deleteMany({ codigo: { $nin: activeCodes } });

  // Key: the mock id ("pequia"), value: the Mongo _id.
  const idByMockId = new Map<string, ObjectId>();

  for (const cerro of cerros) {
    const firstSegment = cerro.pista[0];
    const lastSegment = cerro.pista[cerro.pista.length - 1];
    const firstPoint = firstSegment.puntos[0];
    const lastPoint = lastSegment.puntos[lastSegment.puntos.length - 1];

    const trail = {
      codigo: cerro.slug,
      nombre: cerro.nombre,
      descripcion: cerro.descripcion,
      dificultad: cerro.dificultadGeneral,
      terreno: cerro.terreno,
      inicio: toPoint(firstPoint.lat, firstPoint.lng),
      fin: toPoint(lastPoint.lat, lastPoint.lng),
      // Embedded: tramos are always read together with the trail.
      tramos: cerro.pista.map((tramo) => ({
        dificultad: tramo.dificultad,
        puntos: tramo.puntos.map((p) => ({
          ubicacion: toPoint(p.lat, p.lng),
          elevacionM: p.elevacionM,
        })),
      })),
      // Fastest time the server accepts as valid (anti-cheat).
      tiempoMinimoS: cerro.tiempoMinimoValidoS,
      estadisticas: {
        largoM: cerro.largoM,
        desnivelM: cerro.desnivelM,
        pendientePromedioPct: cerro.pendientePromedioPct,
        tiempoPromedioS: cerro.tiempoPromedioS,
      },
    };

    // replaceOne (not $set): a trail document is exactly what the seed builds,
    // so fields that are no longer used do not stay behind.
    await trails.replaceOne({ codigo: cerro.slug }, trail, { upsert: true });
    const saved = await trails.findOne({ codigo: cerro.slug }, { projection: { _id: 1 } });
    idByMockId.set(cerro.id, saved!._id);
  }
  return idByMockId;
}

// ---------- Bikes ----------

// One typical build per bike type. Two seed riders with the same type get the same
// build: each one is still a separate document (a bike is a rider's own bike, not a model).
const SEED_BIKE_BY_TYPE: Record<TipoBici, object> = {
  DH: { marca: "Specialized", modelo: "Demo", anio: 2024, rodado: "29", recorridoDelanteroMm: 200, recorridoTraseroMm: 200 },
  Enduro: { marca: "Santa Cruz", modelo: "Megatower", anio: 2023, rodado: "29", recorridoDelanteroMm: 170, recorridoTraseroMm: 165 },
  Trail: { marca: "Trek", modelo: "Fuel EX", anio: 2022, rodado: "29", recorridoDelanteroMm: 140, recorridoTraseroMm: 130 },
};

/** Key of the bike map: rider name + bike type ("Romi S.|Enduro"). */
function bikeKey(user: string, type: TipoBici): string {
  return `${user}|${type}`;
}

// Each seed rider gets one bike per bike type they rode in the seed descents,
// so "Romi S." (Trail and Enduro) has TWO bikes. The first one is the main bike.
/** Key of a volume rider's bike: name + position ("Agus P.|#1"). */
function volumeBikeKey(rider: string, index: number): string {
  return `${rider}|#${index}`;
}

async function seedBikes(
  userIds: Map<string, ObjectId>,
  seedUserIds: ObjectId[],
  descents: SeedDescent[],
  volumeRiders: VolumeRider[],
): Promise<Map<string, ObjectId>> {
  const bikes = client.db().collection("bicis");

  const documents: Array<Record<string, unknown>> = [];
  const keys: string[] = [];
  const hasPrimary = new Set<string>();
  for (const d of descents) {
    const key = bikeKey(d.user, d.bikeType);
    if (keys.includes(key)) continue;
    keys.push(key);
    documents.push({
      usuarioId: userIds.get(d.user)!,
      tipo: d.bikeType,
      ...SEED_BIKE_BY_TYPE[d.bikeType],
      principal: !hasPrimary.has(d.user),
    });
    hasPrimary.add(d.user);
  }

  // Volume riders bring their bikes already built (1 to 3, the first is the main one).
  for (const rider of volumeRiders) {
    rider.bikes.forEach((bike, index) => {
      keys.push(volumeBikeKey(rider.displayName, index));
      documents.push({
        usuarioId: userIds.get(rider.displayName)!,
        tipo: bike.type,
        marca: bike.brand,
        modelo: bike.model,
        anio: bike.year,
        rodado: bike.wheelSize,
        recorridoDelanteroMm: bike.travelFrontMm,
        recorridoTraseroMm: bike.travelRearMm,
        principal: bike.isPrimary,
      });
    });
  }

  // Only the bikes of seed riders are deleted and inserted again.
  await bikes.deleteMany({ usuarioId: { $in: seedUserIds } });
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
  seedUserIds: ObjectId[],
  bikeIds: Map<string, ObjectId>,
  volumeDescents: VolumeDescent[],
  volumeRiders: VolumeRider[],
) {
  const descents = client.db().collection("bajadas");
  const all = allSeedDescents();

  const dropByMockId = new Map(cerros.map((c) => [c.id, c.desnivelM]));
  const mockIdBySlug = new Map(cerros.map((c) => [c.slug, c.id]));
  const bikeTypeOf = new Map(volumeRiders.map((r) => [r.displayName, r.bikes.map((b) => b.type)]));

  const documents: Array<Record<string, unknown>> = all.map((d) => ({
    // Referenced, not embedded: descents grow without limit.
    senderoId: trailIds.get(d.trailMockId)!,
    usuarioId: userIds.get(d.user)!,
    biciId: bikeIds.get(bikeKey(d.user, d.bikeType))!,
    fechaInicio: toDate(d.day),
    duracion: d.durationMs,
    velocidadPromedioKmh: d.avgSpeedKmh,
    desnivelM: dropByMockId.get(d.trailMockId)!,
    tipoBici: d.bikeType,
    estado: toEstado(d.status),
    valida: d.validated,
    // The reason only exists when the run does not count.
    ...(d.invalidReason ? { motivoInvalida: d.invalidReason } : {}),
  }));

  // Volume descents: same shape. tipoBici is a copy of the bike's type (like the app does).
  for (const d of volumeDescents) {
    const mockId = mockIdBySlug.get(d.trailSlug)!;
    documents.push({
      senderoId: trailIds.get(mockId)!,
      usuarioId: userIds.get(d.rider)!,
      biciId: bikeIds.get(volumeBikeKey(d.rider, d.bikeIndex))!,
      fechaInicio: d.startedAt,
      duracion: d.durationMs,
      velocidadPromedioKmh: d.avgSpeedKmh,
      desnivelM: dropByMockId.get(mockId)!,
      tipoBici: bikeTypeOf.get(d.rider)![d.bikeIndex],
      estado: toEstado(d.status),
      valida: d.validated,
      ...(d.invalidReason ? { motivoInvalida: d.invalidReason } : {}),
    });
  }

  // Only the descents of seed riders (this also clears old demo runs of "Demo rider").
  await descents.deleteMany({ usuarioId: { $in: seedUserIds } });
  // ordered: false lets the server insert the batches without stopping at the first one.
  await descents.insertMany(documents, { ordered: false });
  return documents.length;
}

// ---------- Reviews ----------

async function seedReviews(
  trailIds: Map<string, ObjectId>,
  userIds: Map<string, ObjectId>,
  seedUserIds: ObjectId[],
  volumeReviews: VolumeReview[],
) {
  const reviews = client.db().collection("resenas");
  const mockIdBySlug = new Map(cerros.map((c) => [c.slug, c.id]));

  const documents = comentarios.map((c) => ({
    senderoId: trailIds.get(c.cerroId)!,
    usuarioId: userIds.get(c.autor)!,
    calificacion: ratingByCommentId[c.id],
    comentario: c.texto,
    fecha: toDate(c.fecha),
  }));
  for (const r of volumeReviews) {
    documents.push({
      senderoId: trailIds.get(mockIdBySlug.get(r.trailSlug)!)!,
      usuarioId: userIds.get(r.rider)!,
      calificacion: r.rating,
      comentario: r.comment,
      fecha: r.createdAt,
    });
  }

  await reviews.deleteMany({ usuarioId: { $in: seedUserIds } });
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

  // Volume data (scripts/seed-volume.ts): always the same, so local and Atlas match.
  const volume = generateVolume(
    cerros.map((c) => ({
      slug: c.slug,
      avgTimeS: c.tiempoPromedioS,
      minValidTimeS: c.tiempoMinimoValidoS,
      lengthM: c.largoM,
    })),
    mockRiderNames(),
  );

  const userIds = await seedUsers(volume.riders);
  // Seed riders = usuarios without email. Only their data is replaced below.
  const seedUserIds = (
    await client.db().collection("usuarios").find({ email: { $exists: false } }, { projection: { _id: 1 } }).toArray()
  ).map((u) => u._id);

  const trailIds = await seedTrails();
  const bikeIds = await seedBikes(userIds, seedUserIds, allSeedDescents(), volume.riders);
  const descentCount = await seedDescents(trailIds, userIds, seedUserIds, bikeIds, volume.descents, volume.riders);
  const reviewCount = await seedReviews(trailIds, userIds, seedUserIds, volume.reviews);

  console.log(`Database: ${client.db().databaseName}`);
  console.log(`usuarios: ${userIds.size}`);
  console.log(`senderos: ${trailIds.size}`);
  console.log(`bicis:    ${bikeIds.size} (seed)`);
  console.log(`bajadas:  ${descentCount} (seed)`);
  console.log(`resenas:  ${reviewCount} (seed)`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
