"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Bike,
  Footprints,
  Radio,
  Square,
} from "lucide-react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Button } from "@/components/ui/Button";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { formatDistance, formatSpeed } from "@/lib/format";
import {
  flattenPista,
  getTotalDistanceM,
  puntoEnDistancia,
} from "@/lib/track-geometry";
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

const VENTAJA_SALIDA_S = 8; // Segundos de ventaja de salida antes de que arranque el Pomberito

export default function CronometroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, stop } = useDescent();

  const { cerro, dbStatus } = useTrail();
  const { ms, formateado } = useElapsedTime(
    state.startedAt,
    state.estado === "corriendo",
  );

  const flatTrack = useMemo(() => flattenPista(cerro.pista), [cerro.pista]);
  const distanciaTotalM = useMemo(
    () => getTotalDistanceM(flatTrack),
    [flatTrack],
  );

  useEffect(() => {
    if (state.estado === "detenido") {
      router.push(`/cerro/${id}/resultado`);
    }
  }, [state.estado, id, router]);

  function handleStop() {
    stop();
  }

  const velocidadKmh = state.puntoActual?.velocidadKmh ?? 0;
  const elevacionActualM =
    state.puntoActual?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const elevacionInicialM =
    state.path[0]?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const desnivelDescendidoM = Math.max(0, elevacionInicialM - elevacionActualM);
  const distanciaRecorridaM = state.puntoActual?.distanciaRecorridaM ?? 0;

  // Lógica de persecución: El Pomberito
  const criatura = cerro.criatura ?? {
    nombre: "El Pomberito",
    tiempoLimiteS: 180,
    descripcion: "Dueño de la siesta y del monte",
  };

  const elapsedS = Math.floor(ms / 1000);
  const enVentajaSalida = elapsedS < VENTAJA_SALIDA_S;

  // El Pomberito arranca después de la ventaja de salida y persigue hasta el tiempo límite
  const tiempoEfectivoCazaS = Math.max(0, elapsedS - VENTAJA_SALIDA_S);
  const duracionCazaS = Math.max(10, criatura.tiempoLimiteS - VENTAJA_SALIDA_S);
  const progresoPomberitoPct = enVentajaSalida
    ? 0
    : Math.min(100, (tiempoEfectivoCazaS / duracionCazaS) * 100);

  const distanciaPomberitoM = (progresoPomberitoPct / 100) * distanciaTotalM;
  const puntoPomberito = useMemo(() => {
    if (flatTrack.length === 0) return null;
    return puntoEnDistancia(flatTrack, distanciaPomberitoM);
  }, [flatTrack, distanciaPomberitoM]);

  const progresoRiderPct =
    distanciaTotalM > 0
      ? Math.min(100, (distanciaRecorridaM / distanciaTotalM) * 100)
      : 0;

  const distanciaVentajaM = Math.round(distanciaRecorridaM - distanciaPomberitoM);
  const estaAtrapado = !enVentajaSalida && distanciaVentajaM <= 0;
  const pomberoCerca = !enVentajaSalida && distanciaVentajaM > 0 && distanciaVentajaM <= 50;

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col bg-background">
        {/* HUD Telemetría Superior */}
        <div className="flex flex-col items-center gap-3 border-b border-border bg-surface px-4 py-4 shadow-xs">
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
          <p className="font-mono text-5xl sm:text-6xl font-extrabold tabular-nums tracking-tighter text-text">
            {formateado}
          </p>

          {/* Métricas en vivo */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-md text-center">
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2 shadow-xs">
              <p className="font-mono text-base font-bold text-text tabular-nums">
                {formatSpeed(velocidadKmh)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Velocidad
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2 shadow-xs">
              <p className="font-mono text-base font-bold text-text tabular-nums">
                {formatDistance(elevacionActualM)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Altitud
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/60 p-2 shadow-xs">
              <p className="font-mono text-base font-bold text-text tabular-nums">
                -{formatDistance(desnivelDescendidoM)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Desnivel
              </p>
            </div>
          </div>

          {/* Persecución: El Pomberito HUD */}
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <Bike className="h-4 w-4" /> Vos ({Math.round(progresoRiderPct)}%)
              </span>
              <span className="flex items-center gap-1 font-semibold text-xs text-secondary">
                <Footprints className="h-4 w-4" /> {criatura.nombre} ({Math.round(progresoPomberitoPct)}%)
              </span>
            </div>

            {/* Pista Dual de Persecución */}
            <div className="relative h-5 w-full rounded-full bg-surface-muted border border-border p-0.5">
              {/* Barra de avance del ciclista */}
              <div
                className="h-full rounded-full bg-primary/40 transition-[width] duration-300"
                style={{ width: `${progresoRiderPct}%` }}
              />
              {/* Pin del Pomberito */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-secondary border border-white text-white shadow-xs transition-[left] duration-300"
                style={{ left: `${Math.max(2, Math.min(98, progresoPomberitoPct))}%` }}
                title="El Pomberito persiguiéndote"
              >
                <Footprints className="h-3 w-3" />
              </div>
              {/* Pin del Rider */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 border border-white text-white shadow-xs transition-[left] duration-300"
                style={{ left: `${Math.max(2, Math.min(98, progresoRiderPct))}%` }}
                title="Tu posición"
              >
                <Bike className="h-3 w-3" />
              </div>
            </div>

            {/* Estado dinámico de la persecución */}
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              {enVentajaSalida ? (
                <span className="flex items-center gap-1 font-semibold text-text-muted">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Ventaja de salida: {VENTAJA_SALIDA_S - elapsedS}s antes de que arranque el Pomberito
                </span>
              ) : estaAtrapado ? (
                <span className="flex items-center gap-1 font-bold text-danger animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" /> ¡TE ALCANZÓ EL POMBERITO! ¡Meté plato!
                </span>
              ) : pomberoCerca ? (
                <span className="flex items-center gap-1 font-bold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> ¡CUIDADO! Viene a {distanciaVentajaM}m soplándote la nuca.
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <Activity className="h-3.5 w-3.5" /> +{distanciaVentajaM}m de ventaja sobre el Pomberito.
                </span>
              )}
              <span className="font-mono text-[10px] text-text-muted font-semibold">
                Límite: {Math.floor(criatura.tiempoLimiteS / 60)}m
              </span>
            </div>
          </div>
        </div>

        {/* Mapa con posición en vivo del ciclista Y del Pomberito */}
        <div className="relative min-h-[240px] flex-1">
          {/* absolute inset-0: this flex item has no definite height, so a plain
              h-full on the map would collapse to 0px and Leaflet would draw nothing. */}
          <div className="absolute inset-0">
            <TrackMapPreview
              pista={cerro.pista}
              puntoActual={
                state.puntoActual
                  ? { lat: state.puntoActual.lat, lng: state.puntoActual.lng }
                  : null
              }
              puntoChaser={puntoPomberito}
            />
          </div>
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
        </div>
      </main>
    </>
  );
}
