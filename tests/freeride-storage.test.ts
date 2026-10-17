import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  eliminarSesionFreeride,
  guardarDraftFreeride,
  guardarSesionFreeride,
  limpiarDraftFreeride,
  obtenerDraftFreeride,
  obtenerSesionesFreeride,
} from "@/lib/freeride-storage";
import type { SesionFreeride } from "@/lib/types";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("freeride-storage", () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;

  const localMock = createStorageMock();
  const sessionMock = createStorageMock();

  beforeAll(() => {
    // @ts-expect-error Mocking window for Node environment
    globalThis.window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    // @ts-expect-error Mocking storage
    globalThis.localStorage = localMock;
    // @ts-expect-error Mocking storage
    globalThis.sessionStorage = sessionMock;
  });

  afterAll(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  });

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
  });

  const sesionMock: SesionFreeride = {
    id: "freeride-123456",
    titulo: "Bajada de prueba El Llorón",
    startedAt: 1760000000000,
    endedAt: 1760000060000,
    tiempoTotalMs: 60000,
    distanciaTotalM: 520,
    velocidadPromedioKmh: 31.2,
    velocidadMaximaKmh: 38.5,
    desnivelPositivoM: 5,
    desnivelNegativoM: 68,
    puntos: [
      {
        lat: -32.89437,
        lng: -68.89087,
        elevacionM: 953,
        accuracyM: 5,
        timestampMs: 1760000000000,
        velocidadKmh: 0,
        distanciaAcumuladaM: 0,
      },
      {
        lat: -32.89183,
        lng: -68.88756,
        elevacionM: 881,
        accuracyM: 4,
        timestampMs: 1760000060000,
        velocidadKmh: 31.2,
        distanciaAcumuladaM: 520,
      },
    ],
    guardadoEn: 1760000060000,
  };

  it("guarda y recupera sesiones en localStorage", () => {
    expect(obtenerSesionesFreeride()).toEqual([]);
    guardarSesionFreeride(sesionMock);

    const sesiones = obtenerSesionesFreeride();
    expect(sesiones).toHaveLength(1);
    expect(sesiones[0].id).toBe(sesionMock.id);
    expect(sesiones[0].distanciaTotalM).toBe(520);
  });

  it("elimina una sesión por su ID", () => {
    guardarSesionFreeride(sesionMock);
    expect(obtenerSesionesFreeride()).toHaveLength(1);

    eliminarSesionFreeride(sesionMock.id);
    expect(obtenerSesionesFreeride()).toEqual([]);
  });

  it("guarda, recupera y limpia el draft en sessionStorage", () => {
    guardarDraftFreeride(sesionMock.puntos, sesionMock.startedAt);
    const draft = obtenerDraftFreeride();
    expect(draft).not.toBeNull();
    expect(draft?.startedAt).toBe(sesionMock.startedAt);
    expect(draft?.puntos).toHaveLength(2);

    limpiarDraftFreeride();
    expect(obtenerDraftFreeride()).toBeNull();
  });
});
