"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Cerro } from "@/lib/types";

// Leaflet's default marker icon paths are relative to its own package and break once
// bundled by Next.js (webpack/Turbopack rewrite the asset URLs). Point the default
// icon at CDN-hosted images instead — a well-known Leaflet + bundler workaround.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapaCerrosProps {
  cerros: Cerro[];
}

// Mendoza capital — all mock trails live nearby (section 4: "foco local: Mendoza").
const CENTRO_POR_DEFECTO: [number, number] = [-32.89, -68.85];

type CapaMapa = "topo" | "osm";

const CAPAS: Record<CapaMapa, { url: string; attribution: string; maxZoom?: number; label: string }> = {
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
    label: "Topo",
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: "Calles",
  },
};

export function MapaCerros({ cerros }: MapaCerrosProps) {
  const [capa, setCapa] = useState<CapaMapa>("topo");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        key="mapa-cerros"
        center={CENTRO_POR_DEFECTO}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          key={capa}
          attribution={CAPAS[capa].attribution}
          url={CAPAS[capa].url}
          maxZoom={CAPAS[capa].maxZoom}
        />
        {cerros.map((cerro) => (
          <Marker key={cerro.id} position={[cerro.ubicacion.lat, cerro.ubicacion.lng]}>
            <Popup>
              <div className="flex flex-col gap-2 p-1">
                <p className="font-semibold text-foreground">{cerro.nombre}</p>
                <Link
                  href={`/cerro/${cerro.slug}`}
                  className="text-sm font-semibold text-brand transition-colors duration-150 hover:brightness-110"
                >
                  Ver sendero →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button
        type="button"
        onClick={() => setCapa((prev) => (prev === "topo" ? "osm" : "topo"))}
        className="absolute top-3 right-3 z-[1000] inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface/95 px-4 text-xs font-semibold tracking-wide uppercase text-foreground shadow-md transition duration-150 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        {capa === "topo" ? CAPAS.osm.label : CAPAS.topo.label}
      </button>
    </div>
  );
}
