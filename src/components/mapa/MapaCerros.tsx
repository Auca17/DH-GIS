"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useIsVisible } from "@/hooks/use-is-visible";
import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/button-styles";
import { getDifficulty } from "@/lib/difficulty";
import { formatDistance } from "@/lib/format";
import type { Cerro } from "@/lib/types";

// Leaflet's default marker icon paths are relative to its own package and break once
// bundled by Next.js (webpack/Turbopack rewrite the asset URLs). Point the default
// icon at CDN-hosted images instead — a well-known Leaflet + bundler workaround.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Teardrop pin colored by difficulty. A divIcon is plain HTML, so the color
// comes from difficulty.ts (the map cannot read Tailwind classes here).
function pinIcon(color: string) {
  return L.divIcon({
    className: "dh-pin",
    html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" style="filter: drop-shadow(0 2px 4px rgba(17,24,39,0.3));"><path d="M17 43C17 43 32 26.5 32 16.5C32 8 25.3 1.5 17 1.5S2 8 2 16.5C2 26.5 17 43 17 43Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="17" cy="16.5" r="6" fill="#FFFFFF"/><circle cx="17" cy="16.5" r="3.5" fill="${color}"/></svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40],
  });
}

// Compact rating for the popup: number + 5 stars that pop in one by one.
function PopupRating({ rating }: { rating: number }) {
  if (rating <= 0) {
    return <span className="shrink-0 text-xs text-text-muted">Sin opiniones</span>;
  }
  const llenas = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} de 5 estrellas`}
      className="flex shrink-0 items-center gap-1"
    >
      <span className="font-mono text-sm font-bold text-text">{rating.toFixed(1)}</span>
      <span aria-hidden="true" className="text-base leading-none">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`dh-pop ${i < llenas ? "text-primary" : "text-border"}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            ★
          </span>
        ))}
      </span>
    </span>
  );
}

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
  // Mount the Leaflet map only while the page is on screen (see useIsVisible).
  const visible = useIsVisible();

  return (
    // isolate: keeps Leaflet layers (z-index 400-1000) under the sticky header.
    <div className="relative isolate h-full w-full">
      {visible ? (
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
          {cerros.map((cerro) => {
            const dificultad = getDifficulty(cerro.dificultadGeneral);
            return (
              <Marker
                key={cerro.id}
                position={[cerro.ubicacion.lat, cerro.ubicacion.lng]}
                icon={pinIcon(dificultad.hex)}
                title={cerro.nombre}
                alt={`${cerro.nombre}, dificultad ${dificultad.label}`}
              >
                <Popup minWidth={240}>
                  <div className="flex flex-col gap-3">
                    {/* Name with its rating to the right, Google Maps style. */}
                    <div className="flex items-start justify-between gap-3 pr-5">
                      <p className="text-base font-bold leading-tight text-text">{cerro.nombre}</p>
                      <PopupRating rating={cerro.calificacion} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <Badge variant="difficulty" difficulty={cerro.dificultadGeneral} />
                      <span className="font-mono">{formatDistance(cerro.largoM)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{cerro.desnivelM} m desnivel</span>
                    </div>
                    <Link
                      href={`/cerro/${cerro.slug}`}
                      className={buttonClassName("primary", "md", "w-full font-bold no-underline")}
                    >
                      Ver sendero →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      ) : null}

      <button
        type="button"
        onClick={() => setCapa((prev) => (prev === "topo" ? "osm" : "topo"))}
        className="absolute top-3 right-3 z-[1000] inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface/95 px-4 text-xs font-semibold tracking-wide uppercase text-foreground shadow-md transition duration-150 hover:border-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        {capa === "topo" ? CAPAS.osm.label : CAPAS.topo.label}
      </button>
    </div>
  );
}
