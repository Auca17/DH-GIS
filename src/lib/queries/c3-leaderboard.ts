import { getDb } from "@/lib/mongodb";

/*
 * C3 — Leaderboard: top-N riders of one trail
 *
 * What it does: returns the N best riders of a trail, ONE ROW PER RIDER with
 * their best VALID time (completed and validated, so SOS and suspicious times
 * are left out), with the rider's name.
 *
 * Course concept: filter + sort over the compound index
 * { senderoId, estado, valida, duracion }, grouping with $group + $first,
 * and a relation between collections with $lookup (usuarioId → usuarios._id).
 *
 * Compass (collection `bajadas` → Aggregations → paste).
 * Replace the ObjectId with Pequia's _id (copy it from the `senderos` collection):
 *
 * [
 *   {
 *     $match: {
 *       senderoId: ObjectId("PASTE_PEQUIA_ID_HERE"),
 *       estado: "completada",
 *       valida: true
 *     }
 *   },
 *   { $sort: { duracion: 1 } },
 *   {
 *     $group: {
 *       _id: "$usuarioId",
 *       duracion: { $first: "$duracion" },
 *       velocidadPromedioKmh: { $first: "$velocidadPromedioKmh" },
 *       tipoBici: { $first: "$tipoBici" },
 *       fechaInicio: { $first: "$fechaInicio" },
 *       esDemo: { $first: "$esDemo" }
 *     }
 *   },
 *   { $sort: { duracion: 1 } },
 *   { $limit: 10 },
 *   {
 *     $lookup: {
 *       from: "usuarios",
 *       localField: "_id",
 *       foreignField: "_id",
 *       as: "usuario"
 *     }
 *   },
 *   { $unwind: "$usuario" },
 *   {
 *     $project: {
 *       _id: 0,
 *       ciclista: "$usuario.nombre",
 *       duracion: 1,
 *       velocidadPromedioKmh: 1,
 *       tipoBici: 1,
 *       fechaInicio: 1,
 *       esDemo: 1
 *     }
 *   }
 * ]
 *
 * To leave demo runs out, add esDemo: { $ne: true } to the $match (see INCLUDE_DEMO_RUNS).
 *
 * Stages:
 * - $match: keeps only the descents of this trail that were completed and validated.
 *   The three equality fields are the first three fields of the compound index.
 * - $sort: orders by time, fastest first. The index already has duracion as its
 *   last field, so Mongo reads them in order instead of sorting in memory.
 * - $group: one group per rider (usuarioId). Since the input is already sorted,
 *   $first takes the values of each rider's FASTEST descent (time, speed, bike, date).
 * - $sort (again): $group does not keep any order, so we sort the riders by their
 *   best time.
 * - $limit: keeps the top N riders. It goes BEFORE $lookup so we only join N documents.
 * - $lookup: brings the user whose _id equals the group _id (the usuarioId), like a
 *   JOIN. The result is an array called `usuario` with one element.
 * - $unwind: turns that one-element array into a plain object, so we can
 *   write "$usuario.nombre".
 * - $project: shapes the row the leaderboard shows: rider, time, speed, bike, date and
 *   esDemo (so the screen can tag simulated runs).
 */

// The only place to change if demo runs must be excluded from the leaderboard.
// true: simulated runs (esDemo: true) rank like any other run and the screen tags them DEMO.
// false: the $match below also adds esDemo: { $ne: true }.
export const INCLUDE_DEMO_RUNS = true;

export interface LeaderboardRow {
  ciclista: string;
  duracion: number;
  velocidadPromedioKmh: number;
  // Missing when the run was saved without a bike.
  tipoBici?: string;
  fechaInicio: Date;
  // Missing (undefined) in seed descents; true for simulated runs.
  esDemo?: boolean;
}

export async function getLeaderboard(slug: string, limit = 10): Promise<LeaderboardRow[]> {
  const db = getDb();

  // Step 1: find the trail _id from its codigo (the descents store senderoId).
  const trail = await db.collection("senderos").findOne({ codigo: slug }, { projection: { _id: 1 } });
  if (!trail) {
    return [];
  }

  // Step 2: the aggregation shown above.
  // With INCLUDE_DEMO_RUNS = false we also skip the demo runs (esDemo: { $ne: true }
  // matches false and missing, so the seed descents stay).
  const match = { senderoId: trail._id, estado: "completada", valida: true };
  const filter = INCLUDE_DEMO_RUNS ? match : { ...match, esDemo: { $ne: true } };
  const pipeline = [
    { $match: filter },
    { $sort: { duracion: 1 } },
    {
      $group: {
        _id: "$usuarioId",
        duracion: { $first: "$duracion" },
        velocidadPromedioKmh: { $first: "$velocidadPromedioKmh" },
        tipoBici: { $first: "$tipoBici" },
        fechaInicio: { $first: "$fechaInicio" },
        esDemo: { $first: "$esDemo" },
      },
    },
    { $sort: { duracion: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "usuarios",
        localField: "_id",
        foreignField: "_id",
        as: "usuario",
      },
    },
    { $unwind: "$usuario" },
    {
      $project: {
        _id: 0,
        ciclista: "$usuario.nombre",
        duracion: 1,
        velocidadPromedioKmh: 1,
        tipoBici: 1,
        fechaInicio: 1,
        esDemo: 1,
      },
    },
  ];

  return db.collection("bajadas").aggregate<LeaderboardRow>(pipeline).toArray();
}
