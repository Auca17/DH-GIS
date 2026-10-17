"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { useIsVisible } from "@/hooks/use-is-visible";
import type { PuntoFreeride } from "@/lib/types";

// Workaround para iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const CENTRO_POR_DEFECTO: [number, number] = [-32.89, -68.86]; // Mendoza (Parque Gral San Martín)

function startIcon() {
  return L.divIcon({
    className: "dh-start-pin",
    html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function SeguirRider({ punto, seguir }: { punto: PuntoFreeride | null; seguir: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!punto || !seguir) return;
    map.panTo([punto.lat, punto.lng], { animate: true, duration: 0.8 });
  }, [punto, seguir, map]);

  return null;
}

interface FreerideMapProps {
  puntos: PuntoFreeride[];
  puntoActual: PuntoFreeride | null;
  className?: string;
}

export function FreerideMap({ puntos, puntoActual, className = "" }: FreerideMapProps) {
  const visible = useIsVisible();
  const [seguirRider, setSeguirRider] = useState(true);
  const [capa, setCapa] = useState<"topo" | "osm">("topo");

  const centroInicial: [number, number] = puntoActual
    ? [puntoActual.lat, puntoActual.lng]
    : puntos.length > 0
      ? [puntos[0].lat, puntos[0].lng]
      : CENTRO_POR_DEFECTO;

  const rutaCoords: [number, number][] = puntos.map((p) => [p.lat, p.lng]);

  if (!visible) return null;

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MapContainer
        key="freeride-map"
        center={centroInicial}
        zoom={15}
        maxZoom={18}
        className="h-full w-full"
      >
        {capa === "topo" ? (
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            maxZoom={17}
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        <SeguirRider punto={puntoActual} seguir={seguirRider} />

        {/* Trazado continuo en vivo (Breadcrumb Strava-style) */}
        {rutaCoords.length > 1 && (
          <>
            {/* Sombra o halo para contraste en cualquier fondo */}
            <Polyline
              positions={rutaCoords}
              pathOptions={{
                color: "#000000",
                weight: 6,
                opacity: 0.5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Línea principal vibrante (naranja outdoor tipo Strava) */}
            <Polyline
              positions={rutaCoords}
              pathOptions={{
                color: "#f97316",
                weight: 4,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* Marcador del punto de inicio */}
        {puntos.length > 0 && (
          <Marker position={[puntos[0].lat, puntos[0].lng]} icon={startIcon()} />
        )}

        {/* Marcador del ciclista en vivo */}
        {puntoActual && (
          <>
            {/* Círculo de precisión del GPS */}
            {puntoActual.accuracyM && puntoActual.accuracyM > 5 && (
              <Circle
                center={[puntoActual.lat, puntoActual.lng]}
                radius={puntoActual.accuracyM}
                pathOptions={{
                  fillColor: "#38bdf8",
                  fillOpacity: 0.15,
                  color: "#0284c7",
                  weight: 1,
                  opacity: 0.4,
                }}
              />
            )}
            {/* Halo pulsante */}
            <CircleMarker
              center={[puntoActual.lat, puntoActual.lng]}
              radius={10}
              pathOptions={{
                fillColor: "#38bdf8",
                fillOpacity: 0.35,
                stroke: false,
              }}
            />
            {/* Punto central del usuario */}
            <CircleMarker
              center={[puntoActual.lat, puntoActual.lng]}
              radius={6}
              pathOptions={{
                fillColor: "#0284c7",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 2.5,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Controles flotantes sobre el mapa */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSeguirRider(!seguirRider)}
          title={seguirRider ? "Desactivar seguimiento automático" : "Centrar en mi posición"}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-border shadow-md transition-colors ${
            seguirRider
              ? "bg-primary text-black font-bold"
              : "bg-surface/90 text-text hover:bg-surface"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 2 15 8 12 6 9 8 12 2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setCapa(capa === "topo" ? "osm" : "topo")}
          title="Cambiar capa de mapa"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/90 text-xs font-bold uppercase tracking-wider text-text shadow-md hover:bg-surface"
        >
          {capa === "topo" ? "Topo" : "Calle"}
        </button>
      </div>
    </div>
  );
}
