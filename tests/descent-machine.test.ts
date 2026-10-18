import { describe, expect, it } from "vitest";
import {
  crearEstadoInicial,
  crearResultado,
  descentReducer,
  type DescentAction,
  type DescentState,
} from "@/lib/descents/descent-machine";
import { cerros } from "@/lib/mock-data";
import { flattenPista } from "@/lib/track-geometry";

const pequia = cerros.find((c) => c.slug === "circuito-dh-pequia")!;
const flat = flattenPista(pequia.pista);
const SALIDA = { lat: flat[0].lat, lng: flat[0].lng };
const UN_METRO_LAT = 1 / 111_320;
const T0 = 1_760_000_000_000;

function jugar(acciones: DescentAction[]): DescentState {
  return acciones.reduce(descentReducer, crearEstadoInicial(pequia.slug));
}

function lectura(lat: number, lng: number, ahora: number, accuracyM = 5): DescentAction {
  return { type: "LECTURA", lectura: { lat, lng, accuracyM }, ahora, flat };
}

/** Readings along the real trail, one every 5 s (about 20-25 km/h). */
function recorridoCompleto(desde: number): DescentAction[] {
  const pasos: DescentAction[] = [];
  let t = desde;
  for (let i = 4; i < flat.length; i += 4) {
    t += 5000;
    pasos.push(lectura(flat[i].lat, flat[i].lng, t));
  }
  const fin = flat.at(-1)!;
  pasos.push(lectura(fin.lat, fin.lng, t + 5000));
  return pasos;
}

describe("descentReducer, gps mode", () => {
  const armar: DescentAction = { type: "ARMAR", puntoJugar: SALIDA };

  it("arms without starting the clock", () => {
    const s = jugar([armar]);
    expect(s.estado).toBe("armado");
    expect(s.modo).toBe("gps");
    expect(s.startedAt).toBeNull();
  });

  it("does not start after moving only 2 m", () => {
    const s = jugar([armar, lectura(SALIDA.lat - 2 * UN_METRO_LAT, SALIDA.lng, T0)]);
    expect(s.estado).toBe("armado");
  });

  it("does not start with a bad-accuracy reading, even 10 m away", () => {
    const s = jugar([armar, lectura(SALIDA.lat - 10 * UN_METRO_LAT, SALIDA.lng, T0, 50)]);
    expect(s.estado).toBe("armado");
  });

  it("starts after moving 5 m, with the first track point at t = 0", () => {
    const s = jugar([armar, lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0)]);
    expect(s.estado).toBe("corriendo");
    expect(s.startedAt).toBe(T0);
    expect(s.track).toHaveLength(1);
    expect(s.track[0][2]).toBe(0);
  });

  it("ends by itself at the finish and keeps a track ordered as [lng, lat, t]", () => {
    const arranque = lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0);
    const s = jugar([armar, arranque, ...recorridoCompleto(T0)]);
    expect(s.estado).toBe("detenido");
    expect(s.motivoFin).toBe("meta");
    const ultimo = s.track.at(-1)!;
    expect(ultimo[0]).toBeCloseTo(flat.at(-1)!.lng, 5); // longitude first
    expect(ultimo[1]).toBeCloseTo(flat.at(-1)!.lat, 5);
    expect(ultimo[2]).toBe(s.elapsedMs);
  });

  it("ignores one absurd jump, but accepts the position after 3 in a row", () => {
    const arranque = lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0);
    const lejos = { lat: SALIDA.lat - 500 * UN_METRO_LAT, lng: SALIDA.lng };
    const unSalto = jugar([armar, arranque, lectura(lejos.lat, lejos.lng, T0 + 1000)]);
    expect(unSalto.path).toHaveLength(1);
    expect(unSalto.saltosSeguidos).toBe(1);

    const tresSaltos = jugar([
      armar,
      arranque,
      lectura(lejos.lat, lejos.lng, T0 + 1000),
      lectura(lejos.lat, lejos.lng, T0 + 2000),
      lectura(lejos.lat, lejos.lng, T0 + 3000),
    ]);
    expect(tresSaltos.path).toHaveLength(2);
    expect(tresSaltos.puntoActual!.distanciaRecorridaM).toBe(0); // the jump adds no distance
  });

  it("flags the signal as lost after 10 s without readings, and clears it on the next one", () => {
    const arranque = lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0);
    const perdida = jugar([armar, arranque, { type: "REVISAR_SENAL", ahora: T0 + 11_000 }]);
    expect(perdida.senalPerdida).toBe(true);
    const vuelve = descentReducer(
      perdida,
      lectura(SALIDA.lat - 15 * UN_METRO_LAT, SALIDA.lng, T0 + 12_000),
    );
    expect(vuelve.senalPerdida).toBe(false);
  });

  it("STOP ends the run and counts the time until the tap", () => {
    const arranque = lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0);
    const s = jugar([armar, arranque, { type: "STOP", ahora: T0 + 4000 }]);
    expect(s.estado).toBe("detenido");
    expect(s.motivoFin).toBe("parar");
    expect(s.elapsedMs).toBe(4000);
  });

  it("CANCELAR goes back to idle only while armed", () => {
    expect(jugar([armar, { type: "CANCELAR" }]).estado).toBe("idle");
  });

  it("a double STOP is harmless", () => {
    const arranque = lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0);
    const una = jugar([armar, arranque, { type: "STOP", ahora: T0 + 3000 }]);
    const dos = descentReducer(una, { type: "STOP", ahora: T0 + 9000 });
    expect(dos).toBe(una);
  });
});

describe("descentReducer, demo mode", () => {
  it("runs the simulated route to the finish with TICKs", () => {
    let s = jugar([{ type: "START_DEMO", ahora: T0 }]);
    for (let i = 1; i <= 200 && s.estado === "corriendo"; i += 1) {
      s = descentReducer(s, { type: "TICK", ahora: T0 + i * 1000, flat });
    }
    expect(s.estado).toBe("detenido");
    expect(s.modo).toBe("demo");
    expect(s.motivoFin).toBe("meta");
    expect(s.track.length).toBeGreaterThan(10);
  });

  it("ignores GPS readings", () => {
    const s = jugar([{ type: "START_DEMO", ahora: T0 }, lectura(SALIDA.lat, SALIDA.lng, T0 + 1000)]);
    expect(s.path).toHaveLength(0);
  });
});

describe("crearResultado", () => {
  it("is null while running", () => {
    expect(crearResultado(jugar([{ type: "START_DEMO", ahora: T0 }]))).toBeNull();
  });

  it("keeps the bike chosen before the run", () => {
    const s = jugar([
      { type: "ARMAR", puntoJugar: SALIDA, bikeId: "6ad40945e800c0b6c7b75f76" },
      lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0),
      { type: "STOP", ahora: T0 + 7000 },
    ]);
    expect(crearResultado(s)!.bikeId).toBe("6ad40945e800c0b6c7b75f76");
  });

  it("uses no bike for a demo run without an account", () => {
    const s = jugar([
      { type: "START_DEMO", ahora: T0 },
      { type: "STOP", ahora: T0 + 3000 },
    ]);
    expect(crearResultado(s)!.bikeId).toBeNull();
  });

  it("uses startedAt + elapsedMs as guardadoEn and keeps the mode", () => {
    const s = jugar([
      { type: "ARMAR", puntoJugar: SALIDA },
      lectura(SALIDA.lat - 5 * UN_METRO_LAT, SALIDA.lng, T0),
      { type: "STOP", ahora: T0 + 7000 },
    ]);
    const r = crearResultado(s)!;
    expect(r.modo).toBe("gps");
    expect(r.guardadoEn).toBe(T0 + 7000);
    expect(r.tiempoMs).toBe(7000);
  });
});
