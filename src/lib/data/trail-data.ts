import "server-only";
import { connection } from "next/server";
import { getDb, isDbAvailable } from "@/lib/mongodb";
import { cerros, comentarios, leaderboardPorCerro } from "@/lib/mock-data";
import { getAverageRatings } from "@/lib/queries/c5-average-rating";
import { getLeaderboard } from "@/lib/queries/c3-leaderboard";
import { listTrails, type TrailDoc } from "@/lib/queries/c7-trail-list";
import { getTrailBySlug } from "@/lib/queries/c8-trail-by-slug";
import { getTrailReviews } from "@/lib/queries/c9-trail-reviews";
import type { Cerro, Comentario, EntradaLeaderboard, TipoBici } from "@/lib/types";

// Data layer for the screens. It decides in which state the database is and
// returns the data in the shapes the UI already uses (Cerro, Comentario, ...).
//
//  - "ok":      MongoDB answered, data comes from the database.
//  - "offline": MongoDB does not answer, we fall back to the mock data so the demo keeps working.
//  - "empty":   MongoDB answers but has no trails (seed not run). We do NOT use the mock here.

export type DbStatus = "ok" | "offline" | "empty";
export type DbResult<T> = { dbStatus: DbStatus; data: T | null };

// Old URLs used the mock ids ("pequia"). The URLs now use the slug.
// This is the only place that knows the old ids: it returns the slug, or null
// when `id` is not an old id (for example when it already is a slug).
export function legacyIdToSlug(id: string): string | null {
  const cerro = cerros.find((c) => c.id === id);
  return cerro ? cerro.slug : null;
}

// ---------- Status decision ----------

// Runs `fromDb` when Mongo is healthy and has trails; otherwise decides the status.
async function load<T>(
  fromDb: () => Promise<T | null>,
  fromMock: () => T | null,
): Promise<DbResult<T>> {
  // Tells Next.js this data belongs to the request, so it is not prerendered.
  // It lives here and not in mongodb.ts because the seed and queries scripts
  // also use mongodb.ts, and they run outside Next.js.
  await connection();

  if (!(await isDbAvailable())) {
    return { dbStatus: "offline", data: fromMock() };
  }

  try {
    const trailCount = await getDb().collection("trails").countDocuments({}, { limit: 1 });
    if (trailCount === 0) {
      return { dbStatus: "empty", data: null };
    }
    return { dbStatus: "ok", data: await fromDb() };
  } catch (error) {
    console.error("[trail-data] query failed:", (error as Error).message);
    return { dbStatus: "offline", data: fromMock() };
  }
}

// ---------- Mapping: database document -> UI type ----------

// "2026-09-12" (the format the screens show)
function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toCerro(doc: TrailDoc, rating: number): Cerro {
  return {
    id: doc.slug, // the slug is the id everywhere in the UI
    slug: doc.slug,
    nombre: doc.name,
    // GeoJSON is [lng, lat]; the UI uses { lat, lng }.
    ubicacion: { lat: doc.start.coordinates[1], lng: doc.start.coordinates[0] },
    descripcion: doc.description,
    dificultadGeneral: doc.difficulty,
    calificacion: rating,
    pista: doc.segments.map((segment) => ({
      dificultad: segment.difficulty,
      puntos: segment.points.map((p) => ({
        lat: p.location.coordinates[1],
        lng: p.location.coordinates[0],
        elevacionM: p.elevationM,
      })),
    })),
    duracionEstimadaMs: doc.stats.avgTimeS * 1000,
    terreno: doc.terrain,
    largoM: doc.stats.lengthM,
    desnivelM: doc.stats.dropM,
    pendientePromedioPct: doc.stats.avgGradePct,
    tiempoPromedioS: doc.stats.avgTimeS,
    tiempoMinimoValidoS: doc.minValidTimeS ?? 0,
    isPlaceholder: doc.isPlaceholder,
    visibleEnMapa: doc.visibleOnMap,
    fuenteDatos: doc.dataSource ?? undefined,
  };
}

// ---------- Mock fallback (only used when the database is offline) ----------

// Same as the mock cerro but with id = slug, so links and storage keys match the database data.
function mockCerro(slug: string): Cerro | null {
  const cerro = cerros.find((c) => c.slug === slug);
  return cerro ? { ...cerro, id: cerro.slug } : null;
}

// ---------- Loaders ----------

export async function loadTrails(): Promise<DbResult<Cerro[]>> {
  return load(
    async () => {
      const [trails, ratings] = await Promise.all([listTrails(), getAverageRatings()]);
      return trails.map((trail) => {
        const rating = ratings.find((r) => r.slug === trail.slug)?.avgRating ?? 0;
        return toCerro(trail, rating);
      });
    },
    () => cerros.map((c) => ({ ...c, id: c.slug })),
  );
}

export async function loadTrail(slug: string): Promise<DbResult<Cerro>> {
  return load(
    async () => {
      const trail = await getTrailBySlug(slug);
      if (!trail) {
        return null;
      }
      const ratings = await getAverageRatings();
      return toCerro(trail, ratings.find((r) => r.slug === slug)?.avgRating ?? 0);
    },
    () => mockCerro(slug),
  );
}

export async function loadLeaderboard(slug: string): Promise<DbResult<EntradaLeaderboard[]>> {
  return load(
    async () => {
      if (!(await getTrailBySlug(slug))) {
        return null;
      }
      const rows = await getLeaderboard(slug);
      // C3 returns one row per rider, so the rider name is unique and works as id.
      return rows.map((row) => ({
        id: row.rider,
        cerroId: slug,
        usuario: row.rider,
        tiempoMs: row.durationMs,
        velocidadPromedioKmh: row.avgSpeedKmh,
        fecha: toDay(row.startedAt),
        bikeType: row.bikeType as TipoBici,
        esDemo: row.isDemo === true,
      }));
    },
    () => {
      const cerro = cerros.find((c) => c.slug === slug);
      if (!cerro) {
        return null;
      }
      return (leaderboardPorCerro[cerro.id] ?? []).map((e) => ({ ...e, cerroId: slug }));
    },
  );
}

export async function loadReviews(slug: string): Promise<DbResult<Comentario[]>> {
  return load(
    async () => {
      if (!(await getTrailBySlug(slug))) {
        return null;
      }
      const reviews = await getTrailReviews(slug);
      return reviews.map((review, i) => ({
        id: `${slug}-review-${i}`,
        cerroId: slug,
        autor: review.author,
        texto: review.comment,
        fecha: toDay(review.createdAt),
      }));
    },
    () => {
      const cerro = cerros.find((c) => c.slug === slug);
      if (!cerro) {
        return null;
      }
      return comentarios
        .filter((c) => c.cerroId === cerro.id)
        .map((c) => ({ ...c, cerroId: slug }));
    },
  );
}
