import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatearMs,
  formatSpeed,
  formatDistance,
  formatDate,
} from "@/lib/format";

describe("format", () => {
  describe("formatDuration", () => {
    it("formats milliseconds to m:ss.d", () => {
      expect(formatDuration(49800)).toBe("0:49.8");
      expect(formatDuration(65200)).toBe("1:05.2");
      expect(formatDuration(0)).toBe("0:00.0");
      expect(formatDuration(3100)).toBe("0:03.1");
      expect(formatDuration(125400)).toBe("2:05.4");
    });

    it("handles edge cases gracefully", () => {
      expect(formatDuration(-10)).toBe("0:00.0");
      expect(formatDuration(NaN)).toBe("0:00.0");
    });

    it("formatearMs is an alias to formatDuration", () => {
      expect(formatearMs(49800)).toBe("0:49.8");
    });
  });

  describe("formatSpeed", () => {
    it("formats km/h with 1 decimal place and unit", () => {
      expect(formatSpeed(24.54)).toBe("24.5 km/h");
      expect(formatSpeed(30)).toBe("30.0 km/h");
      expect(formatSpeed(0)).toBe("0.0 km/h");
    });

    it("handles negative and NaN gracefully", () => {
      expect(formatSpeed(-5)).toBe("0.0 km/h");
      expect(formatSpeed(NaN)).toBe("0.0 km/h");
    });
  });

  describe("formatDistance", () => {
    it("formats meters with rounded integer and unit", () => {
      expect(formatDistance(1250)).toBe("1250 m");
      expect(formatDistance(99.6)).toBe("100 m");
      expect(formatDistance(0)).toBe("0 m");
    });

    it("handles negative and NaN gracefully", () => {
      expect(formatDistance(-1)).toBe("0 m");
      expect(formatDistance(NaN)).toBe("0 m");
    });
  });

  describe("formatDate", () => {
    it("formats date into day mon year in Spanish", () => {
      const d = new Date(2026, 8, 12); // September is month index 8
      expect(formatDate(d)).toBe("12 sep 2026");
    });

    it("accepts ISO string and number", () => {
      const d = new Date(2026, 0, 15);
      expect(formatDate(d.toISOString())).toBe("15 ene 2026");
      expect(formatDate(d.getTime())).toBe("15 ene 2026");
    });

    it("reads a bare YYYY-MM-DD string as a local day, not UTC midnight", () => {
      // In UTC-3 a UTC parse would show the previous day (11 sep).
      expect(formatDate("2026-09-12")).toBe("12 sep 2026");
    });

    it("handles invalid date gracefully", () => {
      expect(formatDate("invalid")).toBe("");
    });
  });
});
