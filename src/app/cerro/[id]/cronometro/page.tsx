"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bike,
  Ghost,
  Radio,
  Square,
} from "lucide-react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Button } from "@/components/ui/Button";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { formatDistance, formatSpeed } from "@/lib/format";
import { flattenPista, getTotalDistanceM } from "@/lib/track-geometry";
import { useDescent } from "@/providers/descent-provider";
import { useTrail } from "@/providers/trail-provider";

const TrackMapPreview = dynamic(
  () =>
    import("@/components/track-preview/TrackMapPreview").then(
      (mod) => mod.TrackMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-text-muted">
        Cargando mapa…
      </div>
    ),
  },
);

export default function CronometroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, stop, sos } = useDescent();
  const [confirmandoSos, setConfirmandoSos] = useState(false);

  const { cerro, dbStatus } = useTrail();
  const { ms, formateado } = useElapsedTime(
    state.startedAt,
    state.estado === "corriendo",
  );

  const distanciaTotalM = useMemo(
    () => getTotalDistanceM(flattenPista(cerro.pista)),
    [cerro],
  );

  useEffect(() => {
    if (state.estado === "detenido") {
      router.push(`/cerro/${id}/resultado`);
    }
  }, [state.estado, id, router]);

  function handleStop() {
    stop();
  }

  function handleSos() {
    if (!confirmandoSos) {
      setConfirmandoSos(true);
      return;
    }
    sos();
  }

  const velocidadKmh = state.puntoActual?.velocidadKmh ?? 0;
  const elevacionActualM =
    state.puntoActual?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const elevacionInicialM =
    state.path[0]?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const desnivelDescendidoM = Math.max(0, elevacionInicialM - elevacionActualM);
  const distanciaRecorridaM = state.puntoActual?.distanciaRecorridaM ?? 0;

  // Lógica del Bicho Perseguidor (Monster Chaser)
  const criatura = cerro.criatura ?? {
    nombre: "El Ogro de la Cantera",
    tiempoLimiteS: 300,
    descripcion: "Guardián de la bajada",
  };

  const elapsedS = Math.floor(ms / 1000);
  const progresoRiderPct =
    distanciaTotalM > 0
      ? Math.min(100, (distanciaRecorridaM / distanciaTotalM) * 100)
      : 0;
  const progresoBichoPct = Math.min(
    100,
    (elapsedS / criatura.tiempoLimiteS) * 100,
  );
  const distanciaBichoM = (progresoBichoPct / 100) * distanciaTotalM;
  const distanciaVentajaM = Math.round(distanciaRecorridaM - distanciaBichoM);
  const estaAtrapado = distanciaVentajaM <= 0 && elapsedS > 10;
  const bichoCerca = distanciaVentajaM > 0 && distanciaVentajaM <= 60;

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col bg-background">
        {/* HUD Telemetría Superior (Light Theme) */}
        <div className="flex flex-col items-center gap-3 border-b border-border bg-surface px-4 py-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
              <Radio className="h-3.5 w-3.5 animate-pulse text-primary" /> Telemetría Activa
            </span>
            <span className="text-border">·</span>
            <span className="text-xs uppercase font-bold text-text-muted">
              {cerro.nombre}
            </span>
          </div>

          {/* Cronómetro Principal */}
          <p className="font-mono text-6xl sm:text-7xl font-extrabold tabular-nums tracking-tighter text-text">
            {formateado}
          </p>

          {/* Métricas en vivo */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-md text-center">
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 shadow-xs">
              <p className="font-mono text-base sm:text-lg font-bold text-text tabular-nums">
                {formatSpeed(velocidadKmh)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Velocidad
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 shadow-xs">
              <p className="font-mono text-base sm:text-lg font-bold text-text tabular-nums">
                {formatDistance(elevacionActualM)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Altitud
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 shadow-xs">
              <p className="font-mono text-base sm:text-lg font-bold text-text tabular-nums">
                -{formatDistance(desnivelDescendidoM)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Desnivel
              </p>
            </div>
          </div>

          {/* Persecución del Bicho HUD (Fantasy & Goofy mechanic) */}
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-bold text-text">
                <Bike className="h-4 w-4 text-emerald-600" /> Vos ({Math.round(progresoRiderPct)}%)
              </span>
              <span className="flex items-center gap-1 font-semibold text-xs text-text-muted">
                <Ghost className="h-4 w-4 text-secondary" /> {criatura.nombre}
              </span>
            </div>

            {/* Pista Dual de Persecución */}
            <div className="relative h-4 w-full rounded-full bg-surface-muted border border-border overflow-hidden">
              {/* Barra de avance del ciclista */}
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progresoRiderPct}%` }}
              />
              {/* Marcador del Bicho que persigue */}
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-secondary rounded-full shadow-sm transition-[left] duration-300 -translate-x-1"
                style={{ left: `${Math.min(98, progresoBichoPct)}%` }}
                title={`${criatura.nombre} pisando los talones`}
              />
            </div>

            {/* Estado de Persecución */}
            <div className="mt-2 flex items-center justify-between text-[11px]">
              {estaAtrapado ? (
                <span className="flex items-center gap-1 font-bold text-danger animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" /> ¡{criatura.nombre} te alcanzó! ¡Metéle pata!
                </span>
              ) : bichoCerca ? (
                <span className="flex items-center gap-1 font-bold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> ¡Cuidado! Viene a {distanciaVentajaM}m atrás.
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <Activity className="h-3.5 w-3.5" /> Ventaja: +{Math.max(0, distanciaVentajaM)}m sobre la bestia.
                </span>
              )}
              <span className="font-mono text-[10px] text-text-muted font-semibold">
                Límite: {Math.floor(criatura.tiempoLimiteS / 60)}m
              </span>
            </div>
          </div>
        </div>

        {/* Mapa con posición en vivo */}
        <div className="relative min-h-[220px] flex-1">
          <TrackMapPreview
            pista={cerro.pista}
            puntoActual={
              state.puntoActual
                ? { lat: state.puntoActual.lat, lng: state.puntoActual.lng }
                : null
            }
          />
        </div>

        {/* Botones inferiores */}
        <div className="flex gap-3 border-t border-border bg-surface p-4 shadow-sm">
          <Button
            variant="ghost"
            onClick={handleStop}
            className="flex-1 font-bold flex items-center justify-center gap-2"
          >
            <Square className="h-4 w-4 fill-current" /> Parar
          </Button>
          <Button
            variant="danger"
            onClick={handleSos}
            className={`flex-1 font-bold flex items-center justify-center gap-2 ${
              confirmandoSos ? "animate-pulse" : ""
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {confirmandoSos ? "Confirmar SOS" : "SOS"}
          </Button>
        </div>
      </main>
    </>
  );
}
