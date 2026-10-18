"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { useIsVisible } from "@/hooks/use-is-visible";
import { getDifficulty } from "@/lib/difficulty";
import { getBounds, obtenerFlechasDeDireccion } from "@/lib/track-geometry";
import type { TramoPista } from "@/lib/types";

const TOPO_URL = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

// Same Leaflet + bundler marker-icon fix as MapaCerros (this component mounts its own
// MapContainer, so it needs the default-icon patch applied here too).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface TrackMapPreviewProps {
  pista: TramoPista[];
  className?: string;
  /** Optional live rider position, used by the cronometro screen. */
  puntoActual?: { lat: number; lng: number } | null;
  /** Optional live chaser position (El Pomberito), used by the cronometro screen. */
  puntoChaser?: { lat: number; lng: number } | null;
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

const ICONO_POMBERITO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18v3s1 1 4 1 5-2 8-2 4 1 4 1v-3"/><path d="M2 10s3-3 10-3 10 3 10 3"/><circle cx="12" cy="11" r="3.5"/></svg>`;
const ICONO_BICI = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;

// Live pin: a 28x28 circle whose CENTER is the GPS point (iconAnchor [14, 14]).
// The label floats above with position:absolute, so it never moves the anchor.
// (Before, a CSS translate(-50%,-50%) plus iconAnchor [14, 30] shifted the pin
// up and to the left of the trail.)
function iconoEnVivo(etiqueta: string, colorEtiqueta: string, colorCirculo: string, svg: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:28px;pointer-events:none;"><span style="position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);font-size:9px;font-weight:800;line-height:1.3;background:${colorEtiqueta};color:#ffffff;padding:1px 5px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.4);letter-spacing:0.04em;">${etiqueta}</span><div style="box-sizing:border-box;width:28px;height:28px;border-radius:50%;background:${colorCirculo};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.35);">${svg}</div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Created once: Leaflet only needs to rebuild the DOM when the icon object changes.
const PIN_POMBERITO = iconoEnVivo("Pomberito", "#C55221", "#7A2706", ICONO_POMBERITO);
const PIN_RIDER = iconoEnVivo("Vos", "#16A34A", "#15803D", ICONO_BICI);

function FitBoundsAlMontar({ pista, bloqueado }: { pista: TramoPista[]; bloqueado: boolean }) {
  const map = useMap();

  useEffect(() => {
    // Leaflet mide su contenedor al montar, pero en un layout flex/dinámico (este
    // componente se carga vía next/dynamic) el tamaño real puede asentarse un instante
    // después. Como el mini-mapa va bloqueado (sin drag/zoom), nunca hay una interacción
    // del usuario que lo autocorrija -- sin este invalidateSize() el grid de tiles queda
    // mal alineado y se ve como una línea clara cruzando el mapa.
    map.invalidateSize();
    // animate: false -> no zoom animation left running if the screen changes right
    // away (the map is removed and the animation end used to crash: "_leaflet_pos").
    // 40 px of margin so the live pins and their labels (Vos / Pomberito) are not cut at the edges.
    map.fitBounds(getBounds(pista), { padding: [40, 40], animate: false });

    // When the container changes size (for example, warnings appear above the map on the
    // chronometer), the locked mini-map frames the trail again; otherwise it drifts to a corner.
    // The free map ("Ver mapa completo") keeps whatever the user panned to.
    const contenedor = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (bloqueado) {
        map.fitBounds(getBounds(pista), { padding: [40, 40], animate: false });
      }
    });
    observer.observe(contenedor);
    return () => observer.disconnect();
  }, [map, pista, bloqueado]);

  return null;
}

export function TrackMapPreview({
  pista,
  className = "",
  puntoActual = null,
  puntoChaser = null,
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
  // Mount the Leaflet map only while the page is on screen (see useIsVisible).
  const visible = useIsVisible();

  if (!visible) {
    return null;
  }

  return (
    <MapContainer
      key={JSON.stringify(centro)}
      center={centro}
      zoom={14}
      maxZoom={17}
      // isolate: Leaflet layers use z-index 400-1000; this keeps them inside the map
      // so they never paint over the sticky header (z-40) when the page scrolls.
      className={`isolate h-full w-full ${className}`}
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
          pathOptions={{ color: getDifficulty(tramo.dificultad).hex, weight: 5 }}
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
      {puntoChaser ? (
        <Marker
          position={[puntoChaser.lat, puntoChaser.lng]}
          icon={PIN_POMBERITO}
          interactive={false}
        />
      ) : null}
      {puntoActual ? (
        <Marker
          position={[puntoActual.lat, puntoActual.lng]}
          icon={PIN_RIDER}
          interactive={false}
          // Rider always drawn above the Pomberito when they overlap.
          zIndexOffset={1000}
        />
      ) : null}
      <FitBoundsAlMontar pista={pista} bloqueado={bloqueado} />
    </MapContainer>
  );
}
