import type { Bici } from "@/lib/types";

/** How a bike is shown in lists and in the picker: "Specialized Demo 2024 · DH · 29". */
export function etiquetaBici(bici: Pick<Bici, "marca" | "modelo" | "anio" | "tipo" | "rodado">): string {
  return `${bici.marca} ${bici.modelo} ${bici.anio} · ${bici.tipo} · ${bici.rodado}`;
}

/** The bike preselected before a run: the main one, or the first if none is marked. */
export function biciPorDefecto(bicis: Bici[]): Bici | null {
  return bicis.find((b) => b.principal) ?? bicis[0] ?? null;
}
