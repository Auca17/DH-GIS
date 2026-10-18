// Checks the sign-up and sign-in bodies. Same rules as validate-bike.ts:
// exact types only (no injection), messages in Spanish for the screens.
import {
  enteroEntre,
  textoEntre,
  validateBike,
  type BikeInput,
  type Check,
} from "@/lib/bikes/validate-bike";
import type { NivelRider } from "@/lib/types";

export const LEVELS: readonly NivelRider[] = ["principiante", "intermedio", "avanzado"];

// Letters (with accents), digits, spaces, dot, dash and underscore: "Lucas R.", "nico_dh".
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} ._-]+$/u;
// Simple on purpose: something@something.something, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  level: NivelRider;
  city: string;
  ridingSinceYear: number;
  bike: BikeInput;
}

/** Lowercase and trimmed, so "Augu@Mail.com " and "augu@mail.com" are the same account. */
function normalizarEmail(value: unknown): string | null {
  const email = textoEntre(value, 6, 120)?.toLowerCase() ?? null;
  return email !== null && EMAIL_PATTERN.test(email) ? email : null;
}

export function validateRegister(body: unknown, now = new Date()): Check<RegisterInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Faltan los datos del registro." };
  }
  const b = body as Record<string, unknown>;

  const displayName = textoEntre(b.displayName, 3, 30);
  if (displayName === null || !DISPLAY_NAME_PATTERN.test(displayName)) {
    return {
      ok: false,
      message: "El nombre visible va de 3 a 30 caracteres: letras, números, espacios, punto, guion o guion bajo.",
    };
  }
  const email = normalizarEmail(b.email);
  if (email === null) return { ok: false, message: "Ese email no es válido." };

  // Not trimmed: spaces are valid characters in a password.
  if (typeof b.password !== "string" || b.password.length < 8 || b.password.length > 72) {
    return { ok: false, message: "La contraseña tiene que tener entre 8 y 72 caracteres." };
  }
  if (!LEVELS.includes(b.level as NivelRider)) {
    return { ok: false, message: "Elegí tu nivel: principiante, intermedio o avanzado." };
  }
  const city = textoEntre(b.city, 2, 60);
  if (city === null) return { ok: false, message: "La ciudad tiene que tener entre 2 y 60 letras." };

  const ridingSinceYear = enteroEntre(b.ridingSinceYear, 1950, now.getFullYear());
  if (ridingSinceYear === null) {
    return { ok: false, message: `El año en que empezaste a andar va de 1950 a ${now.getFullYear()}.` };
  }

  const bike = validateBike(b.bike, now);
  if (!bike.ok) return bike;

  return {
    ok: true,
    value: {
      displayName,
      email,
      password: b.password,
      level: b.level as NivelRider,
      city,
      ridingSinceYear,
      bike: bike.value,
    },
  };
}

export function validateLogin(body: unknown): Check<{ email: string; password: string }> {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const email = normalizarEmail(b.email);
  if (email === null || typeof b.password !== "string" || b.password.length === 0) {
    return { ok: false, message: "Escribí tu email y tu contraseña." };
  }
  return { ok: true, value: { email, password: b.password } };
}
