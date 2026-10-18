import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validateLogin, validateRegister } from "@/lib/auth/validate-auth";

const NOW = new Date("2026-10-18T12:00:00Z");
const REGISTRO = {
  displayName: "Augustus R.",
  email: "  Augu@Mail.com ",
  password: "pedal-1234",
  level: "intermedio",
  city: "Mendoza",
  ridingSinceYear: 2019,
  bike: {
    type: "Enduro",
    brand: "Trek",
    model: "Slash",
    year: 2023,
    wheelSize: "mullet",
    travelFrontMm: 170,
    travelRearMm: 160,
  },
};

describe("hashPassword / verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const { hash, salt } = await hashPassword("pedal-1234");
    expect(hash).not.toContain("pedal");
    expect(await verifyPassword("pedal-1234", hash, salt)).toBe(true);
    expect(await verifyPassword("pedal-12345", hash, salt)).toBe(false);
  });

  it("gives different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("pedal-1234");
    const b = await hashPassword("pedal-1234");
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("validateRegister", () => {
  it("accepts a valid sign-up and normalizes the email", () => {
    const result = validateRegister(REGISTRO, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("augu@mail.com");
      expect(result.value.bike.wheelSize).toBe("mullet");
    }
  });

  it("rejects a short password", () => {
    expect(validateRegister({ ...REGISTRO, password: "1234567" }, NOW)).toEqual({
      ok: false,
      message: "La contraseña tiene que tener entre 8 y 72 caracteres.",
    });
  });

  it("rejects a bad email, an unknown level and a future year", () => {
    expect(validateRegister({ ...REGISTRO, email: "augu@mail" }, NOW).ok).toBe(false);
    expect(validateRegister({ ...REGISTRO, level: "pro" }, NOW).ok).toBe(false);
    expect(validateRegister({ ...REGISTRO, ridingSinceYear: 2027 }, NOW).ok).toBe(false);
  });

  it("rejects a name with symbols and an operator instead of the email", () => {
    expect(validateRegister({ ...REGISTRO, displayName: "<script>" }, NOW).ok).toBe(false);
    expect(validateRegister({ ...REGISTRO, email: { $gt: "" } }, NOW).ok).toBe(false);
  });

  it("rejects a sign-up whose bike is wrong, with the bike message", () => {
    const result = validateRegister({ ...REGISTRO, bike: { ...REGISTRO.bike, type: "BMX" } }, NOW);
    expect(result).toEqual({ ok: false, message: "Elegí el tipo de bici: DH, Enduro o Trail." });
  });
});

describe("validateLogin", () => {
  it("accepts email and password", () => {
    expect(validateLogin({ email: "AUGU@mail.com", password: "x" })).toEqual({
      ok: true,
      value: { email: "augu@mail.com", password: "x" },
    });
  });

  it("rejects an operator instead of the password", () => {
    expect(validateLogin({ email: "augu@mail.com", password: { $ne: "" } }).ok).toBe(false);
  });
});
