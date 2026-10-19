import { describe, expect, it } from "vitest";
import { validateReviewBody } from "@/lib/reviews/validate-review";

const REVIEW = { runId: "circuito-dh-pequia-1760000000000", rating: 4, comment: " Mucha piedra suelta " };

describe("validateReviewBody", () => {
  it("accepts a valid review and trims the comment", () => {
    const result = validateReviewBody(REVIEW);
    expect(result).toEqual({
      ok: true,
      value: { runId: REVIEW.runId, rating: 4, comment: "Mucha piedra suelta" },
    });
  });

  it("accepts a review without comment (missing or null) as an empty comment", () => {
    const sinComentario = validateReviewBody({ runId: REVIEW.runId, rating: 5 });
    const comentarioNull = validateReviewBody({ ...REVIEW, comment: null });
    expect(sinComentario.ok && sinComentario.value.comment).toBe("");
    expect(comentarioNull.ok && comentarioNull.value.comment).toBe("");
  });

  it("rejects a rating that is not a whole number from 1 to 5", () => {
    for (const rating of [0, 6, 3.5, "4", null]) {
      expect(validateReviewBody({ ...REVIEW, rating })).toEqual({ ok: false, message: "Elegí de 1 a 5 estrellas." });
    }
  });

  it("rejects a comment longer than 500 characters", () => {
    const result = validateReviewBody({ ...REVIEW, comment: "a".repeat(501) });
    expect(result).toEqual({ ok: false, message: "El comentario puede tener hasta 500 caracteres." });
  });

  it("rejects a runId that is not a plain id (NoSQL injection)", () => {
    for (const runId of [{ $ne: null }, "ABC", "", undefined]) {
      expect(validateReviewBody({ ...REVIEW, runId }).ok).toBe(false);
    }
  });

  it("rejects a body that is not an object", () => {
    expect(validateReviewBody(null).ok).toBe(false);
    expect(validateReviewBody("hola").ok).toBe(false);
  });
});
