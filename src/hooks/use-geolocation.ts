"use client";

import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { lecturaEsConfiable, type LecturaGps } from "@/lib/gps/gps-math";

// Real GPS with the browser's Geolocation API (navigator.geolocation.watchPosition).
//
// estado:
//   "inactivo"       -> the hook is off (activo = false)
//   "no_soportado"   -> the browser has no geolocation
//   "sin_https"      -> the page is not on HTTPS or localhost (the browser blocks the GPS)
//   "sin_permiso"    -> the user denied the location permission
//   "buscando_senal" -> waiting for a reading with good accuracy
//   "ok"             -> `lectura` is a recent, good reading
//
// Only good readings (lecturaEsConfiable) reach `lectura` and `onLectura`. A bad one
// only updates `precisionM`, so the screen can say "Buscando señal GPS (45 m)…".

export type EstadoGps =
  | "inactivo"
  | "no_soportado"
  | "sin_https"
  | "sin_permiso"
  | "buscando_senal"
  | "ok";

export interface InfoGps {
  estado: EstadoGps;
  /** Last good reading (null until there is one). */
  lectura: LecturaGps | null;
  /** Accuracy of the last reading, good or bad (to show it on screen). */
  precisionM: number | null;
}

type Soporte = "ok" | "no_soportado" | "sin_https";

// What the browser supports never changes while the page is open: nothing to subscribe to.
function sinSuscripcion() {
  return () => {};
}

function leerSoporte(): Soporte {
  if (!window.isSecureContext) return "sin_https";
  if (!("geolocation" in navigator)) return "no_soportado";
  return "ok";
}

interface Medicion {
  estado: "buscando_senal" | "sin_permiso" | "ok";
  lectura: LecturaGps | null;
  precisionM: number | null;
}

const SIN_MEDICION: Medicion = { estado: "buscando_senal", lectura: null, precisionM: null };

export function useGeolocation(
  activo: boolean,
  onLectura?: (lectura: LecturaGps) => void,
): InfoGps {
  // useSyncExternalStore: reads `window` only in the browser; the server render uses "ok".
  const soporte = useSyncExternalStore(sinSuscripcion, leerSoporte, () => "ok" as Soporte);
  const [medicion, setMedicion] = useState<Medicion>(SIN_MEDICION);

  // useEffectEvent: always calls the latest onLectura without restarting the GPS watch.
  const avisarLectura = useEffectEvent((lectura: LecturaGps) => onLectura?.(lectura));

  useEffect(() => {
    if (!activo || soporte !== "ok") return;

    const watchId = navigator.geolocation.watchPosition(
      (posicion) => {
        const lectura: LecturaGps = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          accuracyM: posicion.coords.accuracy,
        };
        if (!lecturaEsConfiable(lectura)) {
          // Bad accuracy: keep searching, never start or end anything with it.
          setMedicion({ estado: "buscando_senal", lectura: null, precisionM: lectura.accuracyM });
          return;
        }
        setMedicion({ estado: "ok", lectura, precisionM: lectura.accuracyM });
        avisarLectura(lectura);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setMedicion({ estado: "sin_permiso", lectura: null, precisionM: null });
        } else {
          // POSITION_UNAVAILABLE: no signal right now (GPS off, indoors). The watch keeps trying.
          setMedicion({ estado: "buscando_senal", lectura: null, precisionM: null });
        }
      },
      // enableHighAccuracy: use the real GPS chip, not wifi/antennas.
      // maximumAge 0: never reuse an old position.
      // No timeout on purpose: standing still at the start must not disable "Jugar".
      // A signal lost during the run is detected by the provider (REVISAR_SENAL).
      { enableHighAccuracy: true, maximumAge: 0 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      // Forget the old reading, so a stale position never enables "Jugar" later.
      setMedicion(SIN_MEDICION);
    };
  }, [activo, soporte]);

  if (!activo) return { estado: "inactivo", lectura: null, precisionM: null };
  if (soporte !== "ok") return { estado: soporte, lectura: null, precisionM: null };
  return medicion;
}
