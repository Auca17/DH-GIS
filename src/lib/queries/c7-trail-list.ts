import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

/*
 * C7 — Trail list
 *
 * What it does: returns every trail, ordered by name. The map and the trail
 * screens use it to know which trails exist.
 *
 * Course concept: a simple find() with a sort. It also defines `TrailDoc`,
 * the shape of a document in the `senderos` collection (trails embed their
 * tramos, so one read brings everything the screen needs).
 *
 * Compass (collection `senderos` → Documents → Options):
 *   Filter:  {}
 *   Sort:    { nombre: 1 }
 *
 * Same thing in the Aggregations tab:
 *   [ { $sort: { nombre: 1 } } ]
 *
 * Steps:
 * - find({}): no filter, so all trails come back.
 * - sort({ nombre: 1 }): alphabetical order (1 = ascending).
 */

export interface TrailDoc {
  _id: ObjectId;
  codigo: string;
  nombre: string;
  descripcion: string;
  dificultad: "facil" | "intermedia" | "dificil";
  terreno: string;
  // GeoJSON points use [longitude, latitude] (Mongo order, the opposite of Leaflet).
  inicio: { type: "Point"; coordinates: [number, number] };
  fin: { type: "Point"; coordinates: [number, number] };
  tramos: {
    dificultad: "facil" | "intermedia" | "dificil";
    puntos: { ubicacion: { type: "Point"; coordinates: [number, number] }; elevacionM: number }[];
  }[];
  // Older documents may not have it (treated as 0 = every time is valid).
  tiempoMinimoS?: number;
  estadisticas: { largoM: number; desnivelM: number; pendientePromedioPct: number; tiempoPromedioS: number };
}

export async function listTrails(): Promise<TrailDoc[]> {
  return getDb().collection<TrailDoc>("senderos").find({}).sort({ nombre: 1 }).toArray();
}
