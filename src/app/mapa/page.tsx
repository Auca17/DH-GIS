"use client";

// Next.js App Router forbids `ssr: false` on next/dynamic inside a Server Component,
// so this wrapper is a Client Component. It reads the trails from /api/trails.
import dynamic from "next/dynamic";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { useTrailApi } from "@/hooks/use-trail-api";
import type { Cerro } from "@/lib/types";

const MapaCerros = dynamic(
  () => import("@/components/mapa/MapaCerros").then((mod) => mod.MapaCerros),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-text-muted">
        Cargando mapa…
      </div>
    ),
  },
);

export default function MapaPage() {
  const { loading, dbStatus, data: cerros } = useTrailApi<Cerro[]>("/api/trails");

  return (
    // Leaflet needs a container with a real height. body only has min-height, so a
    // flex-grow chain resolves to 0px; we give <main> an explicit height instead
    // (viewport minus the AppHeader) and let the map area fill the rest.
    <main
      className="flex flex-col min-h-0"
      style={{ height: "calc(100dvh - var(--header-height) - env(safe-area-inset-top))" }}
    >
      <header className="border-b border-border bg-surface px-4 py-4 shrink-0">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary-ink">
          Mapa
        </p>
        <h1 className="text-lg font-bold tracking-tight text-text">Elegí un sendero</h1>
        <p className="text-sm text-text-muted">Tocá un pin para ver los detalles.</p>
      </header>
      <div className="relative flex-1 min-h-0 flex flex-col">
        {loading ? (
          <p className="flex flex-1 items-center justify-center p-6 text-center text-text-muted">
            Cargando senderos…
          </p>
        ) : dbStatus === "empty" ? (
          <DbStatusNotice dbStatus={dbStatus} />
        ) : cerros ? (
          <>
            <MapaCerros cerros={cerros.filter((cerro) => cerro.visibleEnMapa)} />
            {/* Floats over the top of the map so the map keeps its fixed height. */}
            <div className="absolute inset-x-0 top-0 z-[1000]">
              <DbStatusNotice dbStatus={dbStatus} />
            </div>
          </>
        ) : (
          <p className="flex flex-1 items-center justify-center p-6 text-center text-text-muted">
            No se pudieron cargar los senderos.
          </p>
        )}
      </div>
    </main>
  );
}
