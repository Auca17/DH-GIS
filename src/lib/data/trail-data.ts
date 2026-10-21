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
import { diaEnMendoza } from "@/lib/format";

// Data layer for the screens. It decides in which state the database is and
// returns the data in the shapes the UI already uses (Cerro, Comentario, ...).
//
//  - "ok":      MongoDB answered, data comes from the database.
//  - "offline": MongoDB does not answer, we fall back to the mock data so the demo keeps working.
//  - "empty":   MongoDB answers but has no trails (seed not run). We do NOT use the mock here.

export type DbStatus = "ok" | "offline" | "empty";
export type DbResult<T> = { dbStatus: DbStatus; data: T | null };

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
    const trailCount = await getDb().collection("senderos").countDocuments({}, { limit: 1 });
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
  return diaEnMendoza(date);
}

function toCerro(doc: TrailDoc, rating: number): Cerro {
  // Screen-only details (placeholder, map visibility, data credit) are not stored in
  // the database: they come from the trail files in src/data, matched by codigo.
  const screenInfo = cerros.find((c) => c.slug === doc.codigo);
  return {
    id: doc.codigo, // the codigo is the id everywhere in the UI
    slug: doc.codigo,
    nombre: doc.nombre,
    // GeoJSON is [lng, lat]; the UI uses { lat, lng }.
    ubicacion: { lat: doc.inicio.coordinates[1], lng: doc.inicio.coordinates[0] },
    descripcion: doc.descripcion,
    dificultadGeneral: doc.dificultad,
    calificacion: rating,
    pista: doc.tramos.map((tramo) => ({
      dificultad: tramo.dificultad,
      puntos: tramo.puntos.map((p) => ({
        lat: p.ubicacion.coordinates[1],
        lng: p.ubicacion.coordinates[0],
        elevacionM: p.elevacionM,
      })),
    })),
    duracionEstimadaMs: doc.estadisticas.tiempoPromedioS * 1000,
    terreno: doc.terreno,
    largoM: doc.estadisticas.largoM,
    desnivelM: doc.estadisticas.desnivelM,
    pendientePromedioPct: doc.estadisticas.pendientePromedioPct,
    tiempoPromedioS: doc.estadisticas.tiempoPromedioS,
    tiempoMinimoValidoS: doc.tiempoMinimoS ?? 0,
    isPlaceholder: screenInfo?.isPlaceholder ?? false,
    visibleEnMapa: screenInfo?.visibleEnMapa ?? true,
    fuenteDatos: screenInfo?.fuenteDatos,
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
        const rating = ratings.find((r) => r.codigo === trail.codigo)?.promedio ?? 0;
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
      return toCerro(trail, ratings.find((r) => r.codigo === slug)?.promedio ?? 0);
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
        id: row.ciclista,
        cerroId: slug,
        usuario: row.ciclista,
        tiempoMs: row.duracion,
        velocidadPromedioKmh: row.velocidadPromedioKmh,
        fecha: toDay(row.fechaInicio),
        bikeType: row.tipoBici as TipoBici,
        esDemo: row.esDemo === true,
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
        autor: review.autor,
        texto: review.comentario,
        fecha: toDay(review.fecha),
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
