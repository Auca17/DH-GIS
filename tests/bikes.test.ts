import { describe, expect, it } from "vitest";
import { biciPorDefecto, etiquetaBici } from "@/lib/bikes/bike-label";
import { validateBike } from "@/lib/bikes/validate-bike";
import type { Bici } from "@/lib/types";

const NOW = new Date("2026-10-18T12:00:00Z");
const BIKE = {
  type: "DH",
  brand: " Specialized ",
  model: "Demo",
  year: 2024,
  wheelSize: "29",
  travelFrontMm: 200,
  travelRearMm: 200,
};

describe("validateBike", () => {
  it("accepts a valid bike and trims the texts", () => {
    const result = validateBike(BIKE, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.brand).toBe("Specialized");
  });

  it("accepts a hardtail (rear travel 0) and next year's model", () => {
    expect(validateBike({ ...BIKE, type: "Trail", travelRearMm: 0, year: 2027 }, NOW).ok).toBe(true);
  });

  it("rejects an unknown type or wheel size", () => {
    expect(validateBike({ ...BIKE, type: "BMX" }, NOW).ok).toBe(false);
    expect(validateBike({ ...BIKE, wheelSize: "26" }, NOW).ok).toBe(false);
  });

  it("rejects a year in the future, decimals and numbers sent as text", () => {
    expect(validateBike({ ...BIKE, year: 2028 }, NOW).ok).toBe(false);
    expect(validateBike({ ...BIKE, travelFrontMm: 160.5 }, NOW).ok).toBe(false);
    expect(validateBike({ ...BIKE, travelFrontMm: "160" }, NOW).ok).toBe(false);
  });

  it("rejects a MongoDB operator instead of a brand (NoSQL injection)", () => {
    expect(validateBike({ ...BIKE, brand: { $ne: null } }, NOW).ok).toBe(false);
  });

  it("rejects a missing body", () => {
    expect(validateBike(undefined, NOW)).toEqual({ ok: false, message: "Faltan los datos de la bici." });
  });
});

describe("etiquetaBici and biciPorDefecto", () => {
  const una: Bici = {
    id: "a",
    tipo: "DH",
    marca: "Specialized",
    modelo: "Demo",
    anio: 2024,
    rodado: "29",
    recorridoDelanteroMm: 200,
    recorridoTraseroMm: 200,
    principal: false,
  };
  const otra: Bici = { ...una, id: "b", tipo: "Enduro", modelo: "Enduro", principal: true };

  it("builds the label shown in the picker", () => {
    expect(etiquetaBici(una)).toBe("Specialized Demo 2024 · DH · 29");
  });

  it("picks the main bike, or the first one, or null", () => {
    expect(biciPorDefecto([una, otra])?.id).toBe("b");
    expect(biciPorDefecto([una])?.id).toBe("a");
    expect(biciPorDefecto([])).toBeNull();
  });
});
