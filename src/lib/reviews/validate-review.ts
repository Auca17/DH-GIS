// Checks the body of POST /api/reviews. The client is never trusted.
// Messages are in Spanish because the result screen shows them as they are.
//
// NoSQL injection: runId must be a plain string with a fixed pattern and rating a
// whole number, so an object such as { "$ne": null } never reaches a MongoDB filter.
import { enteroEntre, type Check } from "@/lib/bikes/validate-bike";

export const MAX_COMMENT_LENGTH = 500;

// Same pattern as POST /api/descents (lib/descents/validate-descent.ts).
const RUN_ID_PATTERN = /^[a-z0-9-]{1,120}$/;

export interface ReviewInput {
  /** The run being reviewed. The server finds the descent with it. */
  runId: string;
  /** 1 to 5 stars. */
  rating: number;
  /** Optional text, trimmed. "" when the rider wrote nothing. */
  comment: string;
}

export function validateReviewBody(body: unknown): Check<ReviewInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Faltan los datos de la reseña." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.runId !== "string" || !RUN_ID_PATTERN.test(b.runId)) {
    return { ok: false, message: "No sabemos qué descenso querés reseñar." };
  }
  const rating = enteroEntre(b.rating, 1, 5);
  if (rating === null) {
    return { ok: false, message: "Elegí de 1 a 5 estrellas." };
  }
  // Missing or null = no comment.
  const rawComment = b.comment ?? "";
  if (typeof rawComment !== "string") {
    return { ok: false, message: "El comentario tiene que ser texto." };
  }
  const comment = rawComment.trim();
  if (comment.length > MAX_COMMENT_LENGTH) {
    return { ok: false, message: `El comentario puede tener hasta ${MAX_COMMENT_LENGTH} caracteres.` };
  }

  return { ok: true, value: { runId: b.runId, rating, comment } };
}
