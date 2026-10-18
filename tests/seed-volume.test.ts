import { describe, expect, it } from "vitest";
import { generateVolume, seededRandom, type VolumeTrail } from "../scripts/seed-volume";

const TRAILS: VolumeTrail[] = [
  { slug: "circuito-dh-pequia", avgTimeS: 52, minValidTimeS: 30, lengthM: 363 },
  { slug: "circuito-dh-el-lloron", avgTimeS: 75, minValidTimeS: 40, lengthM: 527 },
  { slug: "escarpado-cerro-de-la-gloria", avgTimeS: 65, minValidTimeS: 35, lengthM: 480 },
];
const TAKEN = new Set(["Lucas R.", "Demo rider"]);
const SMALL = { riders: 40, descents: 3000, reviews: 100, seed: 7 };

describe("seededRandom", () => {
  it("gives the same numbers for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("generateVolume", () => {
  const data = generateVolume(TRAILS, TAKEN, SMALL);

  it("is deterministic: same seed, same data", () => {
    expect(generateVolume(TRAILS, TAKEN, SMALL)).toEqual(data);
  });

  it("makes the requested amounts", () => {
    expect(data.riders).toHaveLength(40);
    expect(data.descents).toHaveLength(3000);
    expect(data.reviews).toHaveLength(100);
  });

  it("never repeats a name, nor uses a taken one", () => {
    const names = data.riders.map((r) => r.displayName);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain("Lucas R.");
  });

  it("gives every rider 1 to 3 bikes and exactly one main bike", () => {
    for (const rider of data.riders) {
      expect(rider.bikes.length).toBeGreaterThanOrEqual(1);
      expect(rider.bikes.length).toBeLessThanOrEqual(3);
      expect(rider.bikes.filter((b) => b.isPrimary)).toHaveLength(1);
    }
  });

  it("points every descent to an existing rider and bike", () => {
    const byName = new Map(data.riders.map((r) => [r.displayName, r]));
    for (const d of data.descents) {
      expect(byName.get(d.rider)?.bikes[d.bikeIndex]).toBeDefined();
    }
  });

  it("keeps valid runs at or above the trail's minimum time", () => {
    const minBySlug = new Map(TRAILS.map((t) => [t.slug, t.minValidTimeS * 1000]));
    for (const d of data.descents.filter((x) => x.validated)) {
      expect(d.durationMs).toBeGreaterThanOrEqual(minBySlug.get(d.trailSlug)!);
    }
  });

  it("marks about 5 % of the runs as not valid, each with a reason", () => {
    const invalid = data.descents.filter((d) => !d.validated);
    expect(invalid.length / data.descents.length).toBeGreaterThan(0.03);
    expect(invalid.length / data.descents.length).toBeLessThan(0.07);
    expect(invalid.every((d) => d.invalidReason !== null && d.status === "interrupted")).toBe(true);
  });

  it("makes advanced riders faster than beginners on average", () => {
    const level = new Map(data.riders.map((r) => [r.displayName, r.level]));
    const avg = (lvl: string) => {
      const times = data.descents
        .filter((d) => d.validated && d.trailSlug === "circuito-dh-pequia" && level.get(d.rider) === lvl)
        .map((d) => d.durationMs);
      return times.reduce((a, b) => a + b, 0) / times.length;
    };
    expect(avg("avanzado")).toBeLessThan(avg("principiante"));
  });
});
