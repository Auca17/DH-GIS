import { describe, expect, it } from "vitest";
import { PENDING_TIMEOUT_MS, yaEnviado } from "@/hooks/use-guardar-descenso";

const RUN = "circuito-dh-pequia-1760000000000";
const NOW = 1_760_000_100_000;

describe("yaEnviado", () => {
  it("does not block when nothing is stored or the stored run is another one", () => {
    expect(yaEnviado(null, RUN, NOW)).toBe(false);
    expect(yaEnviado({ runId: "otra-corrida-1", outcome: "saved" }, RUN, NOW)).toBe(false);
  });

  it("blocks a run that already has an answer (saved, invalid or failed)", () => {
    for (const outcome of ["saved", "invalid", "failed"] as const) {
      expect(yaEnviado({ runId: RUN, outcome }, RUN, NOW)).toBe(true);
    }
  });

  it("blocks a recent pending run (the POST is still in flight)", () => {
    expect(yaEnviado({ runId: RUN, outcome: "pending", sentAt: NOW - 5_000 }, RUN, NOW)).toBe(true);
    expect(yaEnviado({ runId: RUN, outcome: "pending", sentAt: NOW - PENDING_TIMEOUT_MS }, RUN, NOW)).toBe(true);
  });

  it("lets a stuck pending run be sent again after the timeout", () => {
    expect(yaEnviado({ runId: RUN, outcome: "pending", sentAt: NOW - PENDING_TIMEOUT_MS - 1 }, RUN, NOW)).toBe(false);
  });

  it("treats an old pending mark without sentAt (before this change) as stuck", () => {
    expect(yaEnviado({ runId: RUN, outcome: "pending" }, RUN, NOW)).toBe(false);
  });
});
