"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { getBounds, obtenerFlechasDeDireccion } from "@/lib/track-geometry";
import type { Dificultad, TramoPista } from "@/lib/types";

const TOPO_URL = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

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
  /** True (default): small locked preview. False: free pan/zoom, used by "Ver mapa completo". */
  bloqueado?: boolean;
}

function iconoFlecha(rumboDeg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #f8fafc;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6));transform:rotate(${rumboDeg}deg);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FitBoundsAlMontar({ pista }: { pista: TramoPista[] }) {
  const map = useMap();

  useEffect(() => {
    // Leaflet mide su contenedor al montar, pero en un layout flex/dinámico (este
    // componente se carga vía next/dynamic) el tamaño real puede asentarse un instante
    // después. Como el mini-mapa va bloqueado (sin drag/zoom), nunca hay una interacción
    // del usuario que lo autocorrija -- sin este invalidateSize() el grid de tiles queda
    // mal alineado y se ve como una línea clara cruzando el mapa.
    map.invalidateSize();
    map.fitBounds(getBounds(pista), { padding: [24, 24] });

    const contenedor = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(contenedor);
    return () => observer.disconnect();
  }, [map, pista]);

  return null;
}

export function TrackMapPreview({
  pista,
  className = "",
  puntoActual = null,
  bloqueado = true,
}: TrackMapPreviewProps) {
  const bounds = getBounds(pista);
  const centro: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const inicio = pista[0]?.puntos[0];
  const ultimoTramo = pista[pista.length - 1];
  const fin = ultimoTramo?.puntos[ultimoTramo.puntos.length - 1];
  const flechas = obtenerFlechasDeDireccion(pista, 5);

  return (
    <MapContainer
      key={JSON.stringify(centro)}
      center={centro}
      zoom={14}
      maxZoom={17}
      className={`h-full w-full ${className}`}
      // Mini-mapa bloqueado (sección 5.3): solo el sendero elegido, sin arrastrar ni
      // zoomear. "Ver mapa completo" reutiliza este mismo componente con bloqueado={false}.
      dragging={!bloqueado}
      scrollWheelZoom={!bloqueado}
      doubleClickZoom={!bloqueado}
      touchZoom={!bloqueado}
      zoomControl={!bloqueado}
      keyboard={!bloqueado}
    >
      <TileLayer attribution={TOPO_ATTRIBUTION} url={TOPO_URL} maxZoom={17} />
      {pista.map((tramo, i) => (
        <Polyline
          key={i}
          positions={tramo.puntos.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: COLOR_POR_DIFICULTAD[tramo.dificultad], weight: 5 }}
        />
      ))}
      {inicio ? (
        <CircleMarker
          center={[inicio.lat, inicio.lng]}
          radius={7}
          pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1, weight: 2 }}
        />
      ) : null}
      {fin ? (
        <CircleMarker
          center={[fin.lat, fin.lng]}
          radius={7}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1, weight: 2 }}
        />
      ) : null}
      {flechas.map((flecha, i) => (
        <Marker
          key={i}
          position={[flecha.lat, flecha.lng]}
          icon={iconoFlecha(flecha.rumboDeg)}
          interactive={false}
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
