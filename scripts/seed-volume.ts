// Volume data for the seed: many riders, bikes, descents and reviews, so there is
// something real to query (C3 to C13) and to measure with explain().
//
// Deterministic: a seeded random generator (mulberry32) makes the SAME data every
// time, so the local database and Atlas end up with identical content.
// Pure: no database here. scripts/seed.ts inserts what this file returns.
import type { NivelRider, RodadoBici, TipoBici } from "@/lib/types";

export interface VolumeTrail {
  slug: string;
  avgTimeS: number;
  minValidTimeS: number;
  lengthM: number;
}

export interface VolumeBike {
  type: TipoBici;
  brand: string;
  model: string;
  year: number;
  wheelSize: RodadoBici;
  travelFrontMm: number;
  travelRearMm: number;
  isPrimary: boolean;
}

export interface VolumeRider {
  displayName: string;
  level: NivelRider;
  city: string;
  ridingSinceYear: number;
  bikes: VolumeBike[];
}

export interface VolumeDescent {
  rider: string;
  /** Position of the bike in its rider's `bikes` array. */
  bikeIndex: number;
  trailSlug: string;
  startedAt: Date;
  durationMs: number;
  avgSpeedKmh: number;
  status: "completed" | "interrupted";
  validated: boolean;
  invalidReason: string | null;
}

export interface VolumeReview {
  rider: string;
  trailSlug: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface VolumeOptions {
  riders: number;
  descents: number;
  reviews: number;
  /** Same seed = same data. */
  seed: number;
}

export const DEFAULT_VOLUME: VolumeOptions = { riders: 60, descents: 20_000, reviews: 300, seed: 2026 };

/** Last day with data (fixed, so the data does not change with the day we run the seed). */
const END = Date.UTC(2026, 9, 15); // 15 Oct 2026
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 540; // about 18 months

// ---------- Random helpers ----------

/** mulberry32: a tiny seeded random generator. Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand();
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(between(rand, min, max + 1));
}

/** Picks one option; `weights` do not need to add up to 1. */
function pickWeighted<T>(rand: () => number, options: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rand() * total;
  for (let i = 0; i < options.length; i += 1) {
    r -= weights[i];
    if (r < 0) return options[i];
  }
  return options[options.length - 1];
}

function pick<T>(rand: () => number, options: readonly T[]): T {
  return options[Math.floor(rand() * options.length)];
}

// ---------- Catalogs ----------

const FIRST_NAMES = [
  "Agus", "Valen", "Tomi", "Juli", "Nico", "Santi", "Fede", "Mati", "Lu", "Cami",
  "Sofi", "Maite", "Pato", "Joaco", "Rodri", "Gonza", "Flor", "Male", "Belu", "Franco",
  "Emi", "Lauti", "Bauti", "Pilar", "Caro", "Seba", "Leo", "Ana", "Martu", "Gaspar",
];
const INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWYZ";

const CITIES = [
  "Mendoza", "Godoy Cruz", "Luján de Cuyo", "Las Heras", "Maipú", "Guaymallén",
  "San Rafael", "San Juan", "San Luis", "Córdoba",
];
const CITY_WEIGHTS = [25, 15, 12, 10, 10, 10, 6, 6, 3, 3];

const LEVELS: readonly NivelRider[] = ["principiante", "intermedio", "avanzado"];
const LEVEL_WEIGHTS = [30, 45, 25];

// The bike type of a rider's first bike depends on the level.
const TYPES: readonly TipoBici[] = ["DH", "Enduro", "Trail"];
const TYPE_WEIGHTS_BY_LEVEL: Record<NivelRider, number[]> = {
  principiante: [15, 30, 55],
  intermedio: [30, 45, 25],
  avanzado: [50, 40, 10],
};

interface Model {
  brand: string;
  model: string;
  travelFrontMm: number;
  travelRearMm: number;
}

const MODELS: Record<TipoBici, Model[]> = {
  DH: [
    { brand: "Specialized", model: "Demo", travelFrontMm: 200, travelRearMm: 200 },
    { brand: "Santa Cruz", model: "V10", travelFrontMm: 203, travelRearMm: 215 },
    { brand: "Commencal", model: "Supreme DH", travelFrontMm: 200, travelRearMm: 210 },
    { brand: "Trek", model: "Session", travelFrontMm: 200, travelRearMm: 200 },
    { brand: "YT", model: "Tues", travelFrontMm: 200, travelRearMm: 200 },
    { brand: "Canyon", model: "Sender", travelFrontMm: 200, travelRearMm: 210 },
  ],
  Enduro: [
    { brand: "Santa Cruz", model: "Megatower", travelFrontMm: 170, travelRearMm: 165 },
    { brand: "Specialized", model: "Enduro", travelFrontMm: 170, travelRearMm: 170 },
    { brand: "Commencal", model: "Meta SX", travelFrontMm: 170, travelRearMm: 165 },
    { brand: "YT", model: "Capra", travelFrontMm: 170, travelRearMm: 170 },
    { brand: "Canyon", model: "Strive", travelFrontMm: 160, travelRearMm: 160 },
    { brand: "Orbea", model: "Rallon", travelFrontMm: 170, travelRearMm: 160 },
  ],
  Trail: [
    { brand: "Trek", model: "Fuel EX", travelFrontMm: 140, travelRearMm: 140 },
    { brand: "Specialized", model: "Stumpjumper", travelFrontMm: 150, travelRearMm: 145 },
    { brand: "Santa Cruz", model: "Hightower", travelFrontMm: 150, travelRearMm: 145 },
    { brand: "Scott", model: "Genius", travelFrontMm: 150, travelRearMm: 150 },
    { brand: "Orbea", model: "Occam", travelFrontMm: 140, travelRearMm: 140 },
    { brand: "Giant", model: "Trance", travelFrontMm: 150, travelRearMm: 135 },
  ],
};

const WHEELS: readonly RodadoBici[] = ["29", "mullet", "27.5"];
const WHEEL_WEIGHTS: Record<TipoBici, number[]> = {
  DH: [50, 35, 15],
  Enduro: [55, 35, 10],
  Trail: [85, 0, 15],
};

// How long a run takes compared to the trail's average time.
const LEVEL_FACTOR: Record<NivelRider, number> = { principiante: 1.25, intermedio: 1.0, avanzado: 0.86 };
const BIKE_FACTOR: Record<TipoBici, number> = { DH: 0.95, Enduro: 1.0, Trail: 1.07 };

const COMMENTS: Record<number, string[]> = {
  5: ["Impecable, el mejor flow de Mendoza.", "Saltos bien armados, vuelvo seguro.", "Tierra perfecta después de la lluvia."],
  4: ["Muy lindo, la parte baja está algo suelta.", "Buen sendero, hay que mantener los peraltes.", "Rápido y técnico, me encantó."],
  3: ["Está bien, le falta mantenimiento.", "Mucha piedra suelta en el medio.", "Lindo pero corto."],
  2: ["Muy roto después del viento zonda.", "Peligroso en la curva cerrada del final."],
};

// ---------- Generator ----------

function makeBike(rand: () => number, type: TipoBici, isPrimary: boolean): VolumeBike {
  const model = pick(rand, MODELS[type]);
  return {
    type,
    brand: model.brand,
    model: model.model,
    year: intBetween(rand, 2018, 2026),
    wheelSize: pickWeighted(rand, WHEELS, WHEEL_WEIGHTS[type]),
    travelFrontMm: model.travelFrontMm,
    travelRearMm: model.travelRearMm,
    isPrimary,
  };
}

function makeRiders(rand: () => number, count: number, takenNames: ReadonlySet<string>): VolumeRider[] {
  const riders: VolumeRider[] = [];
  const used = new Set(takenNames);
  while (riders.length < count) {
    const displayName = `${pick(rand, FIRST_NAMES)} ${pick(rand, INITIALS.split(""))}.`;
    if (used.has(displayName)) continue;
    used.add(displayName);

    const level = pickWeighted(rand, LEVELS, LEVEL_WEIGHTS);
    // Advanced riders usually started earlier.
    const yearsRiding =
      level === "avanzado" ? intBetween(rand, 6, 16) : level === "intermedio" ? intBetween(rand, 2, 8) : intBetween(rand, 0, 3);

    // 1 bike (55 %), 2 (35 %) or 3 (10 %); the extra bikes try to be of another type.
    const bikeCount = pickWeighted(rand, [1, 2, 3], [55, 35, 10]);
    const firstType = pickWeighted(rand, TYPES, TYPE_WEIGHTS_BY_LEVEL[level]);
    const bikes = [makeBike(rand, firstType, true)];
    while (bikes.length < bikeCount) {
      const others = TYPES.filter((t) => !bikes.some((b) => b.type === t));
      bikes.push(makeBike(rand, others.length > 0 ? pick(rand, others) : pick(rand, TYPES), false));
    }

    riders.push({
      displayName,
      level,
      city: pickWeighted(rand, CITIES, CITY_WEIGHTS),
      ridingSinceYear: 2026 - yearsRiding,
      bikes,
    });
  }
  return riders;
}

/** A random moment in the last 18 months, between 8:00 and 19:59 in Mendoza (UTC-3). */
function randomRideDate(rand: () => number): Date {
  const day = END - intBetween(rand, 0, HISTORY_DAYS) * DAY_MS;
  const hourUtc = intBetween(rand, 8, 19) + 3;
  return new Date(day + hourUtc * 60 * 60 * 1000 + intBetween(rand, 0, 59) * 60 * 1000);
}

function makeDescents(
  rand: () => number,
  count: number,
  riders: VolumeRider[],
  trails: VolumeTrail[],
): VolumeDescent[] {
  // Some riders ride a lot and most ride a little: weight 1 / (position + 1)^0.7.
  const riderWeights = riders.map((_, i) => 1 / Math.pow(i + 1, 0.7));
  // Each rider has a personal skill around their level.
  const skill = riders.map(() => between(rand, 0.93, 1.07));
  const trailWeights = trails.map((_, i) => [45, 30, 25][i] ?? 10);

  const descents: VolumeDescent[] = [];
  for (let n = 0; n < count; n += 1) {
    const riderIndex = riders.indexOf(pickWeighted(rand, riders, riderWeights));
    const rider = riders[riderIndex];
    const trail = pickWeighted(rand, trails, trailWeights);
    // The main bike 70 % of the time, otherwise any of the rider's bikes.
    const bikeIndex = rand() < 0.7 ? 0 : intBetween(rand, 0, rider.bikes.length - 1);
    const bike = rider.bikes[bikeIndex];

    // Normal time: average x level x personal skill x bike x day noise (a bad day is slower).
    const noise = between(rand, 0.94, 1.0) + Math.pow(rand(), 3) * 0.2;
    const minValidMs = trail.minValidTimeS * 1000;
    const normalMs = Math.max(
      minValidMs * 1.05,
      trail.avgTimeS * 1000 * LEVEL_FACTOR[rider.level] * skill[riderIndex] * BIKE_FACTOR[bike.type] * noise,
    );

    // About 5 % of the runs do not count, each with its reason.
    const r = rand();
    let durationMs = normalMs;
    let coveredShare = 1;
    let invalidReason: string | null = null;
    if (r < 0.02) {
      invalidReason = "too fast";
      durationMs = minValidMs * between(rand, 0.5, 0.95);
    } else if (r < 0.035) {
      invalidReason = "did not reach the finish";
      coveredShare = between(rand, 0.3, 0.8);
      durationMs = normalMs * coveredShare;
    } else if (r < 0.045) {
      invalidReason = "gps signal lost";
    } else if (r < 0.05) {
      invalidReason = "sos";
      coveredShare = between(rand, 0.2, 0.7);
      durationMs = normalMs * coveredShare;
    }

    durationMs = Math.round(durationMs);
    const avgSpeedKmh = Math.round(((trail.lengthM * coveredShare) / (durationMs / 1000)) * 3.6 * 10) / 10;
    descents.push({
      rider: rider.displayName,
      bikeIndex,
      trailSlug: trail.slug,
      startedAt: randomRideDate(rand),
      durationMs,
      avgSpeedKmh,
      status: invalidReason === null ? "completed" : "interrupted",
      validated: invalidReason === null,
      invalidReason,
    });
  }
  return descents;
}

function makeReviews(rand: () => number, count: number, riders: VolumeRider[], trails: VolumeTrail[]): VolumeReview[] {
  const reviews: VolumeReview[] = [];
  for (let n = 0; n < count; n += 1) {
    const trail = pick(rand, trails);
    // The last trail is a bit worse rated, so C5 shows different averages.
    const rating = pickWeighted(rand, [5, 4, 3, 2], trail === trails[trails.length - 1] ? [20, 35, 30, 15] : [40, 35, 18, 7]);
    reviews.push({
      rider: pick(rand, riders).displayName,
      trailSlug: trail.slug,
      rating,
      comment: pick(rand, COMMENTS[rating]),
      createdAt: randomRideDate(rand),
    });
  }
  return reviews;
}

/**
 * All the volume data. `takenNames`: names already used by other seed riders,
 * so a generated rider never repeats one (displayName is unique).
 */
export function generateVolume(
  trails: VolumeTrail[],
  takenNames: ReadonlySet<string>,
  options: VolumeOptions = DEFAULT_VOLUME,
) {
  const rand = seededRandom(options.seed);
  const riders = makeRiders(rand, options.riders, takenNames);
  const descents = makeDescents(rand, options.descents, riders, trails);
  const reviews = makeReviews(rand, options.reviews, riders, trails);
  return { riders, descents, reviews };
}
