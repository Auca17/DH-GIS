"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Button } from "@/components/ui/Button";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
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
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-foreground/60">
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

  // Name and track come from the layout (already loaded on the server).
  const { cerro, dbStatus } = useTrail();
  // Display-only 200ms clock; the GPS tick inside DescentProvider stays at 1Hz
  // regardless of how often this re-renders.
  const { formateado } = useElapsedTime(state.startedAt, state.estado === "corriendo");

  const distanciaTotalM = useMemo(
    () => getTotalDistanceM(flattenPista(cerro.pista)),
    [cerro],
  );

  // Cubre tanto Parar/SOS manuales como el final automático del modo demo (cuando el
  // simulador llega al final del trazado, DescentProvider pasa a "detenido" solo, sin
  // que nadie haya tocado un botón) — así nunca nos quedamos pegados en esta pantalla.
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
  const elevacionActualM = state.puntoActual?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const elevacionInicialM = state.path[0]?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;
  const desnivelDescendidoM = Math.max(0, elevacionInicialM - elevacionActualM);
  const distanciaRecorridaM = state.puntoActual?.distanciaRecorridaM ?? 0;
  const progresoPct =
    distanciaTotalM > 0 ? Math.min(100, (distanciaRecorridaM / distanciaTotalM) * 100) : 0;

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col">
        <div className="flex flex-col items-center gap-2 bg-surface px-4 py-6">
          <p className="text-sm uppercase tracking-wide text-foreground/50">{cerro.nombre}</p>
          <p className="font-mono text-6xl font-bold tabular-nums">{formateado}</p>
          <div className="mt-2 flex gap-8 text-center">
            <Stat label="Velocidad" value={`${velocidadKmh.toFixed(1)} km/h`} />
            <Stat label="Altitud" value={`${Math.round(elevacionActualM)} m`} />
            <Stat label="Desnivel bajado" value={`${Math.round(desnivelDescendidoM)} m`} />
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${progresoPct}%` }}
            />
          </div>
        </div>

        <div className="relative min-h-[200px] flex-1">
          <TrackMapPreview
            pista={cerro.pista}
            puntoActual={
              state.puntoActual
                ? { lat: state.puntoActual.lat, lng: state.puntoActual.lng }
                : null
            }
          />
        </div>

        <div className="flex gap-3 border-t border-border bg-background p-4">
          <Button variant="ghost" onClick={handleStop} className="flex-1">
            ■ Parar
          </Button>
          <Button variant="danger" onClick={handleSos} className="flex-1">
            {confirmandoSos ? "Confirmar SOS" : "SOS"}
          </Button>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
    </div>
  );
}
