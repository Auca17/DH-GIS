import { describe, expect, it } from "vitest";
import { validateDescentBody } from "@/lib/descents/validate-descent";

describe("validateDescentBody", () => {
  const validBasePayload = {
    runId: "pequia-1760000000000",
    trailSlug: "circuito-dh-pequia",
    startedAt: "2026-10-12T20:00:00.000Z",
    durationMs: 45000,
    avgSpeedKmh: 24.5,
    elevationChangeM: -70,
    endedBySos: false,
    isDemo: true,
  };

  describe("valid payloads", () => {
    it("accepts a fully valid payload with ISO string date", () => {
      const result = validateDescentBody(validBasePayload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.runId).toBe("pequia-1760000000000");
        expect(result.value.trailSlug).toBe("circuito-dh-pequia");
        expect(result.value.startedAt).toBeInstanceOf(Date);
        expect(result.value.durationMs).toBe(45000);
        expect(result.value.avgSpeedKmh).toBe(24.5);
        expect(result.value.elevationChangeM).toBe(-70);
        expect(result.value.endedBySos).toBe(false);
        expect(result.value.isDemo).toBe(true);
      }
    });

    it("accepts startedAt as timestamp milliseconds", () => {
      const result = validateDescentBody({
        ...validBasePayload,
        startedAt: 1760000000000,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.startedAt.getTime()).toBe(1760000000000);
      }
    });

    it("accepts endedBySos=true as a well-formed descent input", () => {
      const result = validateDescentBody({
        ...validBasePayload,
        endedBySos: true,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.endedBySos).toBe(true);
      }
    });

    it("accepts avgSpeedKmh = 0", () => {
      const result = validateDescentBody({
        ...validBasePayload,
        avgSpeedKmh: 0,
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("400 validation cases", () => {
    it("fails when body is not an object or is null", () => {
      expect(validateDescentBody(null)).toEqual({
        ok: false,
        message: "The body must be a JSON object.",
      });
      expect(validateDescentBody("not-json")).toEqual({
        ok: false,
        message: "The body must be a JSON object.",
      });
      expect(validateDescentBody(123)).toEqual({
        ok: false,
        message: "The body must be a JSON object.",
      });
    });

    it("fails when runId is missing, empty, or whitespace", () => {
      expect(validateDescentBody({ ...validBasePayload, runId: "" })).toEqual({
        ok: false,
        message: "runId must be a non-empty string.",
      });
      expect(validateDescentBody({ ...validBasePayload, runId: "   " })).toEqual({
        ok: false,
        message: "runId must be a non-empty string.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, runId: undefined }),
      ).toEqual({
        ok: false,
        message: "runId must be a non-empty string.",
      });
    });

    it("fails when trailSlug is missing or empty", () => {
      expect(
        validateDescentBody({ ...validBasePayload, trailSlug: "" }),
      ).toEqual({
        ok: false,
        message: "trailSlug must be a non-empty string.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, trailSlug: null }),
      ).toEqual({
        ok: false,
        message: "trailSlug must be a non-empty string.",
      });
    });

    it("fails when startedAt is invalid type or invalid date", () => {
      expect(
        validateDescentBody({ ...validBasePayload, startedAt: true }),
      ).toEqual({
        ok: false,
        message: "startedAt must be an ISO string or a number of milliseconds.",
      });
      expect(
        validateDescentBody({
          ...validBasePayload,
          startedAt: "invalid-date-string",
        }),
      ).toEqual({
        ok: false,
        message: "startedAt is not a valid date.",
      });
    });

    it("fails when durationMs is <= 0 or not a finite number", () => {
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: 0 }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number greater than 0.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: -500 }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number greater than 0.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: "45000" }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number greater than 0.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: NaN }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number greater than 0.",
      });
    });

    it("fails when avgSpeedKmh is negative or not a finite number", () => {
      expect(
        validateDescentBody({ ...validBasePayload, avgSpeedKmh: -1 }),
      ).toEqual({
        ok: false,
        message: "avgSpeedKmh must be a number greater than or equal to 0.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, avgSpeedKmh: "25" }),
      ).toEqual({
        ok: false,
        message: "avgSpeedKmh must be a number greater than or equal to 0.",
      });
    });

    it("fails when elevationChangeM is not a finite number", () => {
      expect(
        validateDescentBody({ ...validBasePayload, elevationChangeM: "flat" }),
      ).toEqual({
        ok: false,
        message: "elevationChangeM must be a number.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, elevationChangeM: Infinity }),
      ).toEqual({
        ok: false,
        message: "elevationChangeM must be a number.",
      });
    });

    it("fails when endedBySos is not a boolean", () => {
      expect(
        validateDescentBody({ ...validBasePayload, endedBySos: "false" }),
      ).toEqual({
        ok: false,
        message: "endedBySos must be true or false.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, endedBySos: 1 }),
      ).toEqual({
        ok: false,
        message: "endedBySos must be true or false.",
      });
    });

    it("fails when isDemo is not a boolean", () => {
      expect(
        validateDescentBody({ ...validBasePayload, isDemo: "true" }),
      ).toEqual({
        ok: false,
        message: "isDemo must be true or false.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, isDemo: null }),
      ).toEqual({
        ok: false,
        message: "isDemo must be true or false.",
      });
    });
  });
});
