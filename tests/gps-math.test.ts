import { describe, expect, it } from "vitest";
import {
  debeGuardarEnRastro,
  distanciaMetros,
  elevacionMasCercana,
  lecturaEsConfiable,
  llegoALaMeta,
  salioDeLaSalida,
  velocidadKmh,
} from "@/lib/gps/gps-math";
import type { PuntoPlano } from "@/lib/track-geometry";

// Pequia start and finish (src/lib/mock-data.ts).
const SALIDA = { lat: -32.8959, lng: -68.89533 };
const META = { lat: -32.89347, lng: -68.89357 };
// One meter of latitude is about 1 / 111320 degrees.
const UN_METRO_LAT = 1 / 111_320;

describe("distanciaMetros", () => {
  it("is 0 for the same point", () => {
    expect(distanciaMetros([-68.89533, -32.8959], [-68.89533, -32.8959])).toBe(0);
  });
  it("measures the Pequia start to finish in a straight line (about 316 m)", () => {
    const d = distanciaMetros([SALIDA.lng, SALIDA.lat], [META.lng, META.lat]);
    expect(d).toBeGreaterThan(315);
    expect(d).toBeLessThan(317);
  });
  it("uses [lng, lat] order: 25 m south of the start", () => {
    const d = distanciaMetros([SALIDA.lng, SALIDA.lat], [SALIDA.lng, SALIDA.lat - 25 * UN_METRO_LAT]);
    expect(d).toBeCloseTo(25, 0);
  });
});

describe("lecturaEsConfiable", () => {
  it("accepts 5 m", () => expect(lecturaEsConfiable({ accuracyM: 5 })).toBe(true));
  it("accepts exactly 20 m", () => expect(lecturaEsConfiable({ accuracyM: 20 })).toBe(true));
  it("rejects 21 m and NaN", () => {
    expect(lecturaEsConfiable({ accuracyM: 21 })).toBe(false);
    expect(lecturaEsConfiable({ accuracyM: Number.NaN })).toBe(false);
  });
});

describe("velocidadKmh", () => {
  const anterior = { ...SALIDA, timestampMs: 0, velocidadKmh: 0 };
  it("smooths 10 m in 1 s (36 km/h) to 10.8 km/h starting from 0", () => {
    const actual = { lat: SALIDA.lat - 10 * UN_METRO_LAT, lng: SALIDA.lng, timestampMs: 1000 };
    expect(velocidadKmh(anterior, actual)).toBe(10.8);
  });
  it("returns null for an absurd jump (100 m in 1 s = 360 km/h)", () => {
    const actual = { lat: SALIDA.lat - 100 * UN_METRO_LAT, lng: SALIDA.lng, timestampMs: 1000 };
    expect(velocidadKmh(anterior, actual)).toBeNull();
  });
  it("keeps the previous speed when no time passed", () => {
    const conVelocidad = { ...anterior, velocidadKmh: 20 };
    expect(velocidadKmh(conVelocidad, { ...SALIDA, timestampMs: 0 })).toBe(20);
  });
});

describe("salioDeLaSalida", () => {
  it("is false at 2 m", () => {
    expect(salioDeLaSalida(SALIDA, { lat: SALIDA.lat - 2 * UN_METRO_LAT, lng: SALIDA.lng })).toBe(false);
  });
  it("is false at exactly the same point", () => {
    expect(salioDeLaSalida(SALIDA, SALIDA)).toBe(false);
  });
  it("is true at 5 m", () => {
    expect(salioDeLaSalida(SALIDA, { lat: SALIDA.lat - 5 * UN_METRO_LAT, lng: SALIDA.lng })).toBe(true);
  });
});

describe("llegoALaMeta", () => {
  const cerca = { lat: -32.893539, lng: -68.893639 }; // 10 m from the finish
  const lejos = { lat: -32.893642, lng: -68.893742 }; // 25 m from the finish
  it("is true 10 m from the finish after covering the trail", () => {
    expect(llegoALaMeta(cerca, META, 350, 363)).toBe(true);
  });
  it("is false 25 m from the finish", () => {
    expect(llegoALaMeta(lejos, META, 350, 363)).toBe(false);
  });
  it("is false near the finish when less than half of the trail was covered", () => {
    expect(llegoALaMeta(cerca, META, 100, 363)).toBe(false);
  });
});

describe("debeGuardarEnRastro", () => {
  it("always saves the first point", () => expect(debeGuardarEnRastro(null, 0)).toBe(true));
  it("skips a point 400 ms after the last one", () => expect(debeGuardarEnRastro(1000, 1400)).toBe(false));
  it("saves a point 1000 ms after the last one", () => expect(debeGuardarEnRastro(1000, 2000)).toBe(true));
});

describe("elevacionMasCercana", () => {
  const flat: PuntoPlano[] = [
    { lat: -32.8959, lng: -68.89533, elevacionM: 948, dificultad: "facil", distanciaAcumuladaM: 0 },
    { lat: -32.89347, lng: -68.89357, elevacionM: 917, dificultad: "facil", distanciaAcumuladaM: 316 },
  ];
  it("returns the start elevation near the start", () => {
    expect(elevacionMasCercana(flat, { lat: -32.8958, lng: -68.89533 })).toBe(948);
  });
  it("returns the finish elevation near the finish", () => {
    expect(elevacionMasCercana(flat, { lat: -32.8935, lng: -68.89357 })).toBe(917);
  });
  it("returns 0 for an empty trail", () => {
    expect(elevacionMasCercana([], SALIDA)).toBe(0);
  });
});
