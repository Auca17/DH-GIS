"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { cerros } from "@/lib/mock-data";
import { useDescent } from "@/providers/descent-provider";

const TrackMapPreview = dynamic(
  () =>
    import("@/components/track-preview/TrackMapPreview").then(
      (mod) => mod.TrackMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-foreground/60">
        Loading map…
      </div>
    ),
  },
);

export default function CronometroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, stop, sos } = useDescent();
  const [confirmandoSos, setConfirmandoSos] = useState(false);

  const cerro = cerros.find((c) => c.id === id);
  // Display-only 200ms clock; the GPS tick inside DescentProvider stays at 1Hz
  // regardless of how often this re-renders.
  const { formateado } = useElapsedTime(state.startedAt, state.estado === "corriendo");

  if (!cerro) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-foreground/60">
        Trail not found.
      </main>
    );
  }

  function handleStop() {
    stop();
    router.push(`/cerro/${id}/resultado`);
  }

  function handleSos() {
    if (!confirmandoSos) {
      setConfirmandoSos(true);
      return;
    }
    sos();
    router.push(`/cerro/${id}/resultado`);
  }

  const velocidadKmh = state.puntoActual?.velocidadKmh ?? 0;
  const elevacionM = state.puntoActual?.elevacionM ?? cerro.pista[0].puntos[0].elevacionM;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-2 bg-surface px-4 py-8">
        <p className="text-sm uppercase tracking-wide text-foreground/50">{cerro.nombre}</p>
        <p className="font-mono text-6xl font-bold tabular-nums">{formateado}</p>
        <div className="mt-2 flex gap-10 text-center">
          <Stat label="Speed" value={`${velocidadKmh.toFixed(1)} km/h`} />
          <Stat label="Elevation" value={`${Math.round(elevacionM)} m`} />
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
          ■ Stop
        </Button>
        <Button variant="danger" onClick={handleSos} className="flex-1">
          {confirmandoSos ? "Confirm SOS" : "SOS"}
        </Button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
    </div>
  );
}
