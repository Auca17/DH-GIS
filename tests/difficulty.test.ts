import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  DIFFICULTY_LIST,
  getDifficulty,
} from "@/lib/difficulty";

describe("difficulty single source", () => {
  it("provides definitions for facil, intermedia, and dificil", () => {
    expect(DIFFICULTIES.facil.label).toBe("Fácil");
    expect(DIFFICULTIES.facil.hex).toBe("#2563eb");
    expect(DIFFICULTIES.facil.cssVar).toBe("--diff-facil");

    expect(DIFFICULTIES.intermedia.label).toBe("Intermedia");
    expect(DIFFICULTIES.intermedia.hex).toBe("#eab308");
    expect(DIFFICULTIES.intermedia.cssVar).toBe("--diff-intermedia");

    expect(DIFFICULTIES.dificil.label).toBe("Difícil");
    expect(DIFFICULTIES.dificil.hex).toBe("#dc2626");
    expect(DIFFICULTIES.dificil.cssVar).toBe("--diff-dificil");
  });

  it("lists all difficulties in order", () => {
    expect(DIFFICULTY_LIST).toHaveLength(3);
    expect(DIFFICULTY_LIST.map((d) => d.id)).toEqual([
      "facil",
      "intermedia",
      "dificil",
    ]);
  });

  it("getDifficulty returns matching config", () => {
    expect(getDifficulty("facil")).toBe(DIFFICULTIES.facil);
    expect(getDifficulty("intermedia")).toBe(DIFFICULTIES.intermedia);
    expect(getDifficulty("dificil")).toBe(DIFFICULTIES.dificil);
  });
});
