import { describe, expect, it } from "vitest";
import { evaluarDescenso } from "@/lib/descents/descent-rules";
import type { PuntoRastro } from "@/lib/types";

// Pequia: start [-68.89533, -32.8959], finish [-68.89357, -32.89347], minValidTimeS 30.
const SENDERO = { fin: [-68.89357, -32.89347] as [number, number], minValidTimeS: 30 };

// A clean 60 s run in a straight line from the start to the finish, one point every
// 10 s (316 m in 60 s = about 19 km/h).
const SALIDA: [number, number] = [-68.89533, -32.8959];
const TRACK_BUENO: PuntoRastro[] = Array.from({ length: 7 }, (_, i) => {
  const f = i / 6;
  return [
    SALIDA[0] + (SENDERO.fin[0] - SALIDA[0]) * f,
    SALIDA[1] + (SENDERO.fin[1] - SALIDA[1]) * f,
    i * 10000,
  ];
});
const BUENO = { endedBySos: false, durationMs: 60000, track: TRACK_BUENO };

describe("evaluarDescenso", () => {
  it("accepts a clean run", () => {
    expect(evaluarDescenso(BUENO, SENDERO, true)).toEqual({
      status: "completed",
      validated: true,
      invalidReason: null,
    });
  });

  it("SOS wins over everything", () => {
    expect(evaluarDescenso({ ...BUENO, endedBySos: true }, SENDERO, false).invalidReason).toBe("sos");
  });

  it("rejects a track with fewer than 2 points", () => {
    expect(evaluarDescenso({ ...BUENO, track: [] }, SENDERO, true).invalidReason).toBe("empty track");
  });

  it("rejects a time under minValidTimeS", () => {
    expect(evaluarDescenso({ ...BUENO, durationMs: 29000 }, SENDERO, true).invalidReason).toBe("too fast");
  });

  it("rejects a run that did not start at the start (C2 said no)", () => {
    expect(evaluarDescenso(BUENO, SENDERO, false).invalidReason).toBe("did not start at the start");
  });

  it("rejects a run that stopped in the middle of the trail", () => {
    const corto = TRACK_BUENO.slice(0, 4); // stops in the middle, about 158 m from the finish
    expect(evaluarDescenso({ ...BUENO, track: corto }, SENDERO, true).invalidReason).toBe(
      "did not reach the finish",
    );
  });

  it("rejects 316 m in 5 s (about 228 km/h)", () => {
    const teletransporte: PuntoRastro[] = [TRACK_BUENO[0], [-68.89357, -32.89347, 5000]];
    expect(
      evaluarDescenso({ ...BUENO, durationMs: 31000, track: teletransporte }, SENDERO, true)
        .invalidReason,
    ).toBe("implausible speed");
  });

  it("rejects a 30 s gap between points", () => {
    // Points 2 and 3 removed: 30 s between the second and the fifth point.
    const hueco = [TRACK_BUENO[0], TRACK_BUENO[1], ...TRACK_BUENO.slice(4)];
    expect(evaluarDescenso({ ...BUENO, track: hueco }, SENDERO, true).invalidReason).toBe(
      "gps signal lost",
    );
  });

  it("rejects a durationMs far from the track time", () => {
    expect(evaluarDescenso({ ...BUENO, durationMs: 90000 }, SENDERO, true).invalidReason).toBe(
      "track does not match the time",
    );
  });
});
