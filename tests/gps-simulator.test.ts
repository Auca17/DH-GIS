import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getBaseSpeedKmh,
  computeInstantSpeedKmh,
  advanceSimulation,
} from "@/lib/gps-simulator";
import type { PuntoPlano } from "@/lib/track-geometry";

describe("gps-simulator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getBaseSpeedKmh", () => {
    it("returns expected baseline speeds per difficulty", () => {
      expect(getBaseSpeedKmh("facil")).toBe(18);
      expect(getBaseSpeedKmh("intermedia")).toBe(28);
      expect(getBaseSpeedKmh("dificil")).toBe(38);
    });
  });

  describe("computeInstantSpeedKmh", () => {
    it("clamps speed to base ± 6 km/h and to at least 8 km/h", () => {
      // Test across multiple timestamps and random variations
      const difficulties = ["facil", "intermedia", "dificil"] as const;

      for (const diff of difficulties) {
        const base = getBaseSpeedKmh(diff);

        // Maximum upward fluctuation: sin = 1, random = 1 (noise = +2)
        vi.spyOn(Math, "random").mockReturnValue(1);
        const speedMax = computeInstantSpeedKmh(diff, 2500); // 2500ms -> sin(pi/2) = 1
        expect(speedMax).toBeLessThanOrEqual(base + 6);
        expect(speedMax).toBeGreaterThanOrEqual(8);

        // Maximum downward fluctuation: sin = -1, random = 0 (noise = -2)
        vi.spyOn(Math, "random").mockReturnValue(0);
        const speedMin = computeInstantSpeedKmh(diff, 7500); // 7500ms -> sin(3pi/2) = -1
        expect(speedMin).toBeGreaterThanOrEqual(base - 6);
        expect(speedMin).toBeGreaterThanOrEqual(8);
      }
    });

    it("never drops below MIN_SPEED_KMH (8 km/h)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      for (let t = 0; t <= 20000; t += 500) {
        const speed = computeInstantSpeedKmh("facil", t);
        expect(speed).toBeGreaterThanOrEqual(8);
      }
    });
  });

  describe("advanceSimulation", () => {
    const mockFlatTrack: PuntoPlano[] = [
      {
        lat: -32.8959,
        lng: -68.8953,
        elevacionM: 1200,
        dificultad: "facil",
        distanciaAcumuladaM: 0,
      },
      {
        lat: -32.8965,
        lng: -68.8958,
        elevacionM: 1150,
        dificultad: "facil",
        distanciaAcumuladaM: 50,
      },
      {
        lat: -32.897,
        lng: -68.8962,
        elevacionM: 1100,
        dificultad: "intermedia",
        distanciaAcumuladaM: 100,
      },
    ];

    it("advances distance monotonically over consecutive ticks", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      let currentDistance = 0;
      let elapsedMs = 0;
      const tickMs = 1000;

      for (let i = 0; i < 5; i++) {
        elapsedMs += tickMs;
        const result = advanceSimulation(
          mockFlatTrack,
          currentDistance,
          elapsedMs,
          tickMs,
        );

        expect(result.punto.distanciaRecorridaM).toBeGreaterThan(currentDistance);
        expect(result.punto.distanciaRecorridaM).toBeLessThanOrEqual(100);
        currentDistance = result.punto.distanciaRecorridaM;
      }
    });

    it("flags completion when total distance is reached", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      // Close to total distance (100m)
      const prevDistance = 95;
      const result = advanceSimulation(mockFlatTrack, prevDistance, 10000, 2000);

      expect(result.completo).toBe(true);
      expect(result.punto.distanciaRecorridaM).toBe(100);
    });

    it("keeps completo=false before reaching total distance", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const result = advanceSimulation(mockFlatTrack, 10, 1000, 1000);

      expect(result.completo).toBe(false);
      expect(result.punto.distanciaRecorridaM).toBeLessThan(100);
    });
  });
});
