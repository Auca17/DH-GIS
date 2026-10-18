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
    // [lng, lat, ms since the start]
    track: [
      [-68.89533, -32.8959, 0],
      [-68.89357, -32.89347, 45000],
    ],
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
        message: "runId must use only lowercase letters, digits and dashes.",
      });
      expect(validateDescentBody({ ...validBasePayload, runId: "   " })).toEqual({
        ok: false,
        message: "runId must use only lowercase letters, digits and dashes.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, runId: undefined }),
      ).toEqual({
        ok: false,
        message: "runId must use only lowercase letters, digits and dashes.",
      });
    });

    it("fails when trailSlug is missing or empty", () => {
      expect(
        validateDescentBody({ ...validBasePayload, trailSlug: "" }),
      ).toEqual({
        ok: false,
        message: "trailSlug must use only lowercase letters, digits and dashes.",
      });
      expect(
        validateDescentBody({ ...validBasePayload, trailSlug: null }),
      ).toEqual({
        ok: false,
        message: "trailSlug must use only lowercase letters, digits and dashes.",
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
        message: "durationMs must be a number between 1 and 7200000 (2 hours).",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: -500 }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number between 1 and 7200000 (2 hours).",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: "45000" }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number between 1 and 7200000 (2 hours).",
      });
      expect(
        validateDescentBody({ ...validBasePayload, durationMs: NaN }),
      ).toEqual({
        ok: false,
        message: "durationMs must be a number between 1 and 7200000 (2 hours).",
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

  describe("injection and track checks", () => {
    it("rejects a MongoDB operator instead of a slug (NoSQL injection)", () => {
      const result = validateDescentBody({ ...validBasePayload, trailSlug: { $ne: null } });
      expect(result.ok).toBe(false);
    });

    it("rejects a slug with uppercase letters or symbols", () => {
      expect(validateDescentBody({ ...validBasePayload, trailSlug: "Pequia$" }).ok).toBe(false);
    });

    it("rejects a missing track", () => {
      expect(validateDescentBody({ ...validBasePayload, track: undefined })).toEqual({
        ok: false,
        message: "track must be an array.",
      });
    });

    it("rejects a track point with a string inside", () => {
      const result = validateDescentBody({ ...validBasePayload, track: [[-68.89, "-32.89", 0]] });
      expect(result).toEqual({
        ok: false,
        message: "every track point must be [lng, lat, t] with numbers.",
      });
    });

    it("rejects coordinates out of range (lat 200)", () => {
      const result = validateDescentBody({ ...validBasePayload, track: [[-68.89, 200, 0]] });
      expect(result.ok).toBe(false);
    });

    it("rejects times that go back", () => {
      const result = validateDescentBody({
        ...validBasePayload,
        track: [
          [-68.89, -32.89, 2000],
          [-68.89, -32.89, 1000],
        ],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects more than 3600 points", () => {
      const track = Array.from({ length: 3601 }, (_, i) => [-68.89, -32.89, i * 1000]);
      expect(validateDescentBody({ ...validBasePayload, track })).toEqual({
        ok: false,
        message: "track can have at most 3600 points.",
      });
    });

    it("accepts an empty track (the route decides it is not valid for the ranking)", () => {
      expect(validateDescentBody({ ...validBasePayload, track: [] }).ok).toBe(true);
    });
  });
});
