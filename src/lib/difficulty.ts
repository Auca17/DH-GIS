import type { Dificultad } from "@/lib/types";

export interface DifficultyConfig {
  id: Dificultad;
  label: string;
  hex: string;
  cssVar: string;
}

export const DIFFICULTIES: Record<Dificultad, DifficultyConfig> = {
  facil: {
    id: "facil",
    label: "Fácil",
    hex: "#2563eb",
    cssVar: "--diff-facil",
  },
  intermedia: {
    id: "intermedia",
    label: "Intermedia",
    hex: "#eab308",
    cssVar: "--diff-intermedia",
  },
  dificil: {
    id: "dificil",
    label: "Difícil",
    hex: "#dc2626",
    cssVar: "--diff-dificil",
  },
};

export const DIFFICULTY_LIST: readonly DifficultyConfig[] = [
  DIFFICULTIES.facil,
  DIFFICULTIES.intermedia,
  DIFFICULTIES.dificil,
] as const;

export function getDifficulty(dificultad: Dificultad): DifficultyConfig {
  return DIFFICULTIES[dificultad];
}
