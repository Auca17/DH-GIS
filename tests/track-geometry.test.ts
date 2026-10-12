import { describe, expect, it } from "vitest";
import {
  flattenPista,
  getTotalDistanceM,
  getBounds,
  obtenerFlechasDeDireccion,
} from "@/lib/track-geometry";
import type { TramoPista } from "@/lib/types";

describe("track-geometry", () => {
  const samplePista: TramoPista[] = [
    {
      dificultad: "facil",
      puntos: [
        { lat: -32.895, lng: -68.895, elevacionM: 1200 },
        { lat: -32.896, lng: -68.895, elevacionM: 1150 },
      ],
    },
    {
      dificultad: "intermedia",
      puntos: [
        // Shared boundary point with previous segment
        { lat: -32.896, lng: -68.895, elevacionM: 1150 },
        { lat: -32.897, lng: -68.894, elevacionM: 1100 },
      ],
    },
  ];

  describe("flattenPista", () => {
    it("deduplicates shared boundary points between consecutive segments", () => {
      const flat = flattenPista(samplePista);
      // 2 points in tramo 1, 2 points in tramo 2, 1 shared point -> 3 total points
      expect(flat).toHaveLength(3);
      expect(flat[0].lat).toBe(-32.895);
      expect(flat[1].lat).toBe(-32.896);
      expect(flat[2].lat).toBe(-32.897);
    });

    it("calculates monotonic cumulative distances starting at 0", () => {
      const flat = flattenPista(samplePista);
      expect(flat[0].distanciaAcumuladaM).toBe(0);
      expect(flat[1].distanciaAcumuladaM).toBeGreaterThan(0);
      expect(flat[2].distanciaAcumuladaM).toBeGreaterThan(
        flat[1].distanciaAcumuladaM,
      );
    });

    it("associates the correct difficulty with points from each segment", () => {
      const flat = flattenPista(samplePista);
      expect(flat[0].dificultad).toBe("facil");
      // Segment 2 took over at the shared boundary
      expect(flat[2].dificultad).toBe("intermedia");
    });
  });

  describe("getTotalDistanceM", () => {
    it("returns 0 for empty point arrays", () => {
      expect(getTotalDistanceM([])).toBe(0);
    });

    it("returns cumulative distance of the final point", () => {
      const flat = flattenPista(samplePista);
      const total = getTotalDistanceM(flat);
      expect(total).toBe(flat[flat.length - 1].distanciaAcumuladaM);
      expect(total).toBeGreaterThan(100);
    });
  });

  describe("getBounds", () => {
    it("computes [[south, west], [north, east]] bounds correctly", () => {
      const bounds = getBounds(samplePista);
      const [[south, west], [north, east]] = bounds;

      expect(south).toBe(-32.897);
      expect(north).toBe(-32.895);
      expect(west).toBe(-68.895);
      expect(east).toBe(-68.894);
    });
  });

  describe("obtenerFlechasDeDireccion", () => {
    it("returns empty array when track has less than 2 points", () => {
      const emptyTrack: TramoPista[] = [
        {
          dificultad: "facil",
          puntos: [{ lat: -32.895, lng: -68.895, elevacionM: 1200 }],
        },
      ];
      expect(obtenerFlechasDeDireccion(emptyTrack)).toEqual([]);
    });

    it("returns requested number of directional arrows with valid bearings", () => {
      const arrows = obtenerFlechasDeDireccion(samplePista, 3);
      expect(arrows).toHaveLength(3);

      for (const arrow of arrows) {
        expect(arrow.lat).toBeDefined();
        expect(arrow.lng).toBeDefined();
        expect(arrow.rumboDeg).toBeGreaterThanOrEqual(0);
        expect(arrow.rumboDeg).toBeLessThan(360);
      }
    });

    it("defaults to 5 direction arrows", () => {
      const arrows = obtenerFlechasDeDireccion(samplePista);
      expect(arrows).toHaveLength(5);
    });
  });
});
