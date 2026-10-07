"use client";

// Next.js App Router forbids `ssr: false` on next/dynamic inside a Server Component,
// so this wrapper is a Client Component; it still does no data fetching of its own —
// `cerros` is static mock data passed straight through to the map.
import dynamic from "next/dynamic";
import { cerros } from "@/lib/mock-data";

const MapaCerros = dynamic(
  () => import("@/components/mapa/MapaCerros").then((mod) => mod.MapaCerros),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-foreground/60">
        Cargando mapa…
      </div>
    ),
  },
);

// Header height is fixed by its padding/line-height (py-4 + text-lg + subtitle ≈ 73px).
// The map gets an explicit height instead of relying on a multi-level flex-grow chain
// (body -> main -> this div) to stay a 0-height-proof fix for Leaflet, per spec section 2.
const ALTO_HEADER = "73px";

export default function MapaPage() {
  return (
    <main className="flex flex-col">
      <header className="border-b border-border bg-surface px-4 py-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand">
          Mapa
        </p>
        <h1 className="text-lg font-bold tracking-tight">Elegí un sendero</h1>
        <p className="text-sm text-foreground/60">Tocá un pin para ver los detalles.</p>
      </header>
      <div className="relative" style={{ height: `calc(100dvh - ${ALTO_HEADER})` }}>
        <MapaCerros cerros={cerros.filter((cerro) => cerro.visibleEnMapa)} />
      </div>
    </main>
  );
}
