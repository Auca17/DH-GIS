"use client";

import { AlertTriangle, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { EstadoGps } from "@/hooks/use-geolocation";
import type { EstadoWakeLock } from "@/hooks/use-wake-lock";
import type { DescentEstado } from "@/lib/descents/descent-machine";
import { START_MOVE_M } from "@/lib/gps/config";
import type { ModoCorrida } from "@/lib/types";

// Messages shown on the chronometer screen. Nothing is hidden: if the GPS is lost
// or the screen cannot stay on, the rider sees it.

interface RunStatusBannerProps {
  modo: ModoCorrida;
  estado: DescentEstado;
  gpsEstado: EstadoGps;
  precisionM: number | null;
  senalPerdida: boolean;
  wakeLock: EstadoWakeLock;
}

export function RunStatusBanner({
  modo,
  estado,
  gpsEstado,
  precisionM,
  senalPerdida,
  wakeLock,
}: RunStatusBannerProps) {
  const avisos: string[] = [];

  if (modo === "gps") {
    if (estado === "armado") {
      avisos.push(`Movete para arrancar: el cronómetro empieza cuando avances ${START_MOVE_M} m.`);
    }
    if (gpsEstado === "sin_permiso") {
      avisos.push("Se perdió el permiso de ubicación. Habilitalo en los ajustes del navegador.");
    } else if (senalPerdida) {
      avisos.push(
        "Se perdió la señal GPS. El rastro queda en pausa; si no vuelve pronto, el descenso puede quedar inválido.",
      );
    } else if (gpsEstado === "buscando_senal") {
      avisos.push(
        precisionM !== null
          ? `Buscando señal GPS… (precisión actual: ${Math.round(precisionM)} m)`
          : "Buscando señal GPS…",
      );
    }
  }

  if (wakeLock === "no_soportado" || wakeLock === "rechazado") {
    avisos.push(
      "Este navegador no puede mantener la pantalla encendida: tocala de vez en cuando para que no se apague.",
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      {modo === "demo" ? (
        <Badge variant="demo" className="text-xs" />
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          <Satellite className="h-3.5 w-3.5" />
          GPS real · Mantené la pantalla encendida y esta pestaña abierta.
        </p>
      )}
      {avisos.map((aviso) => (
        <p
          key={aviso}
          role="alert"
          className="flex w-full items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{aviso}</span>
        </p>
      ))}
    </div>
  );
}
