// Checks the body of POST /api/descents. The client is never trusted: every field
// is checked here before anything is written to the database.
//
// This function only checks that the data is well formed (types, numbers, dates).
// Deciding if the time is VALID for the ranking (too fast, SOS) is done in the route.

export interface DescentInput {
  runId: string;
  trailSlug: string;
  startedAt: Date;
  durationMs: number;
  avgSpeedKmh: number;
  elevationChangeM: number;
  endedBySos: boolean;
  isDemo: boolean;
}

export type DescentCheck = { ok: true; value: DescentInput } | { ok: false; message: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function validateDescentBody(body: unknown): DescentCheck {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "The body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.runId)) {
    return { ok: false, message: "runId must be a non-empty string." };
  }
  if (!isNonEmptyString(b.trailSlug)) {
    return { ok: false, message: "trailSlug must be a non-empty string." };
  }
  // startedAt may be an ISO string or milliseconds since 1970.
  if (typeof b.startedAt !== "string" && typeof b.startedAt !== "number") {
    return { ok: false, message: "startedAt must be an ISO string or a number of milliseconds." };
  }
  const startedAt = new Date(b.startedAt);
  if (Number.isNaN(startedAt.getTime())) {
    return { ok: false, message: "startedAt is not a valid date." };
  }
  if (!isFiniteNumber(b.durationMs) || b.durationMs <= 0) {
    return { ok: false, message: "durationMs must be a number greater than 0." };
  }
  if (!isFiniteNumber(b.avgSpeedKmh) || b.avgSpeedKmh < 0) {
    return { ok: false, message: "avgSpeedKmh must be a number greater than or equal to 0." };
  }
  if (!isFiniteNumber(b.elevationChangeM)) {
    return { ok: false, message: "elevationChangeM must be a number." };
  }
  if (typeof b.endedBySos !== "boolean") {
    return { ok: false, message: "endedBySos must be true or false." };
  }
  if (typeof b.isDemo !== "boolean") {
    return { ok: false, message: "isDemo must be true or false." };
  }

  return {
    ok: true,
    value: {
      runId: b.runId,
      trailSlug: b.trailSlug,
      startedAt,
      durationMs: b.durationMs,
      avgSpeedKmh: b.avgSpeedKmh,
      elevationChangeM: b.elevationChangeM,
      endedBySos: b.endedBySos,
      isDemo: b.isDemo,
    },
  };
}
