import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

/*
 * C7 — Trail list
 *
 * What it does: returns every trail, ordered by name. The map and the trail
 * screens use it to know which trails exist.
 *
 * Course concept: a simple find() with a sort. It also defines `TrailDoc`,
 * the shape of a document in the `trails` collection (trails embed their
 * segments, so one read brings everything the screen needs).
 *
 * Compass (collection `trails` → Documents → Options):
 *   Filter:  {}
 *   Sort:    { name: 1 }
 *
 * Same thing in the Aggregations tab:
 *   [ { $sort: { name: 1 } } ]
 *
 * Steps:
 * - find({}): no filter, so all trails come back.
 * - sort({ name: 1 }): alphabetical order (1 = ascending).
 */

export interface TrailDoc {
  _id: ObjectId;
  slug: string;
  name: string;
  description: string;
  difficulty: "facil" | "intermedia" | "dificil";
  terrain: string;
  // GeoJSON points use [longitude, latitude] (Mongo order, the opposite of Leaflet).
  start: { type: "Point"; coordinates: [number, number] };
  end: { type: "Point"; coordinates: [number, number] };
  segments: {
    difficulty: "facil" | "intermedia" | "dificil";
    points: { location: { type: "Point"; coordinates: [number, number] }; elevationM: number }[];
  }[];
  startRadiusM: number;
  endRadiusM: number;
  // Older documents may not have it (treated as 0 = every time is valid).
  minValidTimeS?: number;
  stats: { lengthM: number; dropM: number; avgGradePct: number; avgTimeS: number };
  isPlaceholder: boolean;
  visibleOnMap: boolean;
  dataSource: { nombre: string; url: string } | null;
}

export async function listTrails(): Promise<TrailDoc[]> {
  return getDb().collection<TrailDoc>("trails").find({}).sort({ name: 1 }).toArray();
}
