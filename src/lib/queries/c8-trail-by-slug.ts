import { getDb } from "@/lib/mongodb";
import type { TrailDoc } from "@/lib/queries/c7-trail-list";

/*
 * C8 — Trail by codigo
 *
 * What it does: returns ONE trail given its codigo (the readable name used in
 * the URL, e.g. "circuito-dh-pequia"), or null when it does not exist.
 *
 * Course concept: lookup by a unique index. `codigo` has a unique index, so Mongo
 * finds the document directly (IXSCAN) without reading the whole collection.
 *
 * Compass (collection `senderos` → Documents → Filter):
 *   { codigo: "circuito-dh-pequia" }
 *
 * Same thing in the Aggregations tab:
 *   [ { $match: { codigo: "circuito-dh-pequia" } }, { $limit: 1 } ]
 *
 * Steps:
 * - findOne({ codigo }): returns the first document whose codigo matches. Since the
 *   index is unique there can be only one.
 */

export async function getTrailBySlug(slug: string): Promise<TrailDoc | null> {
  return getDb().collection<TrailDoc>("senderos").findOne({ codigo: slug });
}
