import { getDb } from "@/lib/mongodb";
import type { TrailDoc } from "@/lib/queries/c7-trail-list";

/*
 * C8 — Trail by slug
 *
 * What it does: returns ONE trail given its slug (the readable name used in
 * the URL, e.g. "circuito-dh-pequia"), or null when it does not exist.
 *
 * Course concept: lookup by a unique index. `slug` has a unique index, so Mongo
 * finds the document directly (IXSCAN) without reading the whole collection.
 *
 * Compass (collection `trails` → Documents → Filter):
 *   { slug: "circuito-dh-pequia" }
 *
 * Same thing in the Aggregations tab:
 *   [ { $match: { slug: "circuito-dh-pequia" } }, { $limit: 1 } ]
 *
 * Steps:
 * - findOne({ slug }): returns the first document whose slug matches. Since the
 *   index is unique there can be only one.
 */

export async function getTrailBySlug(slug: string): Promise<TrailDoc | null> {
  return getDb().collection<TrailDoc>("trails").findOne({ slug });
}
