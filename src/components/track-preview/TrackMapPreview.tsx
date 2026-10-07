"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import { getBounds } from "@/lib/track-geometry";
import type { Dificultad, TramoPista } from "@/lib/types";

// Same Leaflet + bundler marker-icon fix as MapaCerros (this component mounts its own
// MapContainer, so it needs the default-icon patch applied here too).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLOR_POR_DIFICULTAD: Record<Dificultad, string> = {
  facil: "#2563eb",
  intermedia: "#eab308",
  dificil: "#dc2626",
};

interface TrackMapPreviewProps {
  pista: TramoPista[];
  className?: string;
  /** Optional live rider position, used by the cronometro screen. */
  puntoActual?: { lat: number; lng: number } | null;
}

function FitBoundsAlMontar({ pista }: { pista: TramoPista[] }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(getBounds(pista), { padding: [24, 24] });
  }, [map, pista]);

  return null;
}

export function TrackMapPreview({
  pista,
  className = "",
  puntoActual = null,
}: TrackMapPreviewProps) {
  const bounds = getBounds(pista);
  const centro: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];

  return (
    <MapContainer center={centro} zoom={14} className={`h-full w-full ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pista.map((tramo, i) => (
        <Polyline
          key={i}
          positions={tramo.puntos.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: COLOR_POR_DIFICULTAD[tramo.dificultad], weight: 5 }}
        />
      ))}
      {puntoActual ? (
        <CircleMarker
          center={[puntoActual.lat, puntoActual.lng]}
          radius={8}
          pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 1 }}
        />
      ) : null}
      <FitBoundsAlMontar pista={pista} />
    </MapContainer>
  );
}
