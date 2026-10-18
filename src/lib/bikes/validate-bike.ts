// Checks a bike sent by the client (sign-up and "add bike"). The client is never
// trusted: every field is checked here before anything is written.
// Messages are in Spanish because the screens show them as they are.
//
// NoSQL injection: every field must be a plain string or number. An object such as
// { "$ne": null } is rejected here and never reaches a MongoDB query.
import type { RodadoBici, TipoBici } from "@/lib/types";

export const BIKE_TYPES: readonly TipoBici[] = ["DH", "Enduro", "Trail"];
export const WHEEL_SIZES: readonly RodadoBici[] = ["27.5", "29", "mullet"];

export interface BikeInput {
  type: TipoBici;
  brand: string;
  model: string;
  year: number;
  wheelSize: RodadoBici;
  travelFrontMm: number;
  travelRearMm: number;
}

export type Check<T> = { ok: true; value: T } | { ok: false; message: string };

/** A trimmed string with a length between min and max, or null. */
export function textoEntre(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

/** A whole number between min and max (both included), or null. */
export function enteroEntre(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

export function validateBike(body: unknown, now = new Date()): Check<BikeInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Faltan los datos de la bici." };
  }
  const b = body as Record<string, unknown>;

  if (!BIKE_TYPES.includes(b.type as TipoBici)) {
    return { ok: false, message: "Elegí el tipo de bici: DH, Enduro o Trail." };
  }
  const brand = textoEntre(b.brand, 1, 40);
  if (brand === null) return { ok: false, message: "La marca tiene que tener entre 1 y 40 letras." };
  const model = textoEntre(b.model, 1, 60);
  if (model === null) return { ok: false, message: "El modelo tiene que tener entre 1 y 60 letras." };

  const maxYear = now.getFullYear() + 1; // next year's models are already on sale
  const year = enteroEntre(b.year, 1990, maxYear);
  if (year === null) return { ok: false, message: `El año de la bici va de 1990 a ${maxYear}.` };

  if (!WHEEL_SIZES.includes(b.wheelSize as RodadoBici)) {
    return { ok: false, message: "Elegí el rodado: 27.5, 29 o mullet." };
  }
  const travelFrontMm = enteroEntre(b.travelFrontMm, 80, 220);
  if (travelFrontMm === null) {
    return { ok: false, message: "El recorrido delantero va de 80 a 220 mm." };
  }
  // 0 = hardtail (no rear suspension).
  const travelRearMm = enteroEntre(b.travelRearMm, 0, 220);
  if (travelRearMm === null) {
    return { ok: false, message: "El recorrido trasero va de 0 (rígida) a 220 mm." };
  }

  return {
    ok: true,
    value: {
      type: b.type as TipoBici,
      brand,
      model,
      year,
      wheelSize: b.wheelSize as RodadoBici,
      travelFrontMm,
      travelRearMm,
    },
  };
}
