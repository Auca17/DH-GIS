"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
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

const CENTRO_POR_DEFECTO: [number, number] = [-41.0, -71.45];

export function MapaCerros({ cerros }: MapaCerrosProps) {
  return (
    <MapContainer
      center={CENTRO_POR_DEFECTO}
      zoom={8}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cerros.map((cerro) => (
        <Marker key={cerro.id} position={[cerro.ubicacion.lat, cerro.ubicacion.lng]}>
          <Popup>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-black">{cerro.nombre}</p>
              <Link
                href={`/cerro/${cerro.id}`}
                className="text-sm font-medium text-blue-600 underline"
              >
                View trail
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
