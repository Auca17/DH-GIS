"use client";

import { useState } from "react";
import { LocateFixed, Play, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { START_RADIUS_M } from "@/lib/gps/config";
import { haversineDistanceM } from "@/lib/track-geometry";

// Start buttons of the trail screen.
//   - "Jugar" (real GPS): enabled only within START_RADIUS_M of the trail start.
//   - "Probar en modo demo": always enabled, works without GPS or permissions.
//
// Before the run, the screen goes through these states:
//   gps_apagado -> (Activar GPS) -> buscando_senal -> lejos_de_la_salida -> listo
//   and also sin_permiso / sin_https / no_soportado (error messages, demo still works).

interface StartPanelProps {
  /** First point of the trail. */
  salida: { lat: number; lng: number };
  /** "Jugar" was pressed at this (good) GPS position. */
  onJugar: (puntoJugar: { lat: number; lng: number }) => void;
  onDemo: () => void;
}

export function StartPanel({ salida, onJugar, onDemo }: StartPanelProps) {
  // The GPS is turned on with a tap: the browser asks for the permission at that moment.
  const [gpsEncendido, setGpsEncendido] = useState(false);
  const gps = useGeolocation(gpsEncendido);

  const distanciaM = gps.lectura ? haversineDistanceM(gps.lectura, salida) : null;
  const listo = gps.estado === "ok" && distanciaM !== null && distanciaM <= START_RADIUS_M;

  let mensaje: string;
  let esError = false;
  if (!gpsEncendido) {
    mensaje = "Activá el GPS para jugar en el sendero.";
  } else if (gps.estado === "sin_https") {
    mensaje = "La ubicación solo funciona con HTTPS. Abrí la app desde su dirección https://.";
    esError = true;
  } else if (gps.estado === "no_soportado") {
    mensaje = "Este navegador no tiene GPS. Probá con el modo demo.";
    esError = true;
  } else if (gps.estado === "sin_permiso") {
    mensaje =
      "Permiso de ubicación denegado. Habilitalo en los ajustes del navegador para este sitio y recargá la página.";
    esError = true;
  } else if (gps.estado === "buscando_senal" || distanciaM === null) {
    mensaje =
      gps.precisionM !== null
        ? `Buscando señal GPS… (precisión actual: ${Math.round(gps.precisionM)} m)`
        : "Buscando señal GPS…";
  } else if (!listo) {
    mensaje = `Estás a ${Math.round(distanciaM)} m de la salida. Acercate a menos de ${START_RADIUS_M} m.`;
  } else {
    mensaje = "Estás en la salida. Mantené la pantalla encendida y esta pestaña abierta.";
  }

  function handleJugar() {
    if (listo && gps.lectura) {
      onJugar({ lat: gps.lectura.lat, lng: gps.lectura.lng });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {gpsEncendido ? (
        <Button
          onClick={handleJugar}
          disabled={!listo}
          size="lg"
          className="w-full bg-primary hover:bg-primary-ink text-text font-bold text-base py-3 shadow-sm flex items-center justify-center gap-2"
        >
          <Play className="h-5 w-5 fill-current" />
          Jugar
        </Button>
      ) : (
        <Button
          onClick={() => setGpsEncendido(true)}
          size="lg"
          className="w-full bg-primary hover:bg-primary-ink text-text font-bold text-base py-3 shadow-sm flex items-center justify-center gap-2"
        >
          <LocateFixed className="h-5 w-5" />
          Activar GPS
        </Button>
      )}
      <p
        role="status"
        className={`text-center text-xs ${esError ? "font-semibold text-danger" : "text-text-muted"}`}
      >
        {mensaje}
      </p>
      <Button
        variant="ghost"
        onClick={onDemo}
        className="w-full font-bold flex items-center justify-center gap-2"
      >
        <PlayCircle className="h-4 w-4" />
        Probar en modo demo
      </Button>
    </div>
  );
}
