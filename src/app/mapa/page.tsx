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
        Loading map…
      </div>
    ),
  },
);

export default function MapaPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface px-4 py-4">
        <h1 className="text-lg font-bold">Choose a trail</h1>
        <p className="text-sm text-foreground/60">Tap a pin to see the details.</p>
      </header>
      <div className="relative flex-1">
        <MapaCerros cerros={cerros} />
      </div>
    </main>
  );
}
