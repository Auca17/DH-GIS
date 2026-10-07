"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUltimoResultado } from "@/hooks/use-ultimo-resultado";

export default function ResultadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const resultado = useUltimoResultado(id);

  const [texto, setTexto] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Mock-only: no persistence into mock-data, just a local confirmation.
    setEnviado(true);
  }

  if (!resultado) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-foreground/60">No recent run found for this trail.</p>
        <Button onClick={() => router.push(`/cerro/${id}`)}>Back to trail</Button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Run summary</h1>

      {resultado.interrumpidoPorSos ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          ⚠ Interrupted via SOS
        </div>
      ) : null}

      <Card className="grid grid-cols-3 gap-3 text-center">
        <SummaryStat label="Time" value={formatearMs(resultado.tiempoMs)} />
        <SummaryStat
          label="Avg speed"
          value={`${resultado.velocidadPromedioKmh.toFixed(1)} km/h`}
        />
        <SummaryStat
          label="Elevation drop"
          value={`${Math.round(resultado.cambioElevacionM)} m`}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">Leave a review</h2>
        {enviado ? (
          <p className="text-sm text-brand">Thanks for your feedback!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCalificacion(n)}
                  aria-label={`Rate ${n} out of 5`}
                  className={`text-2xl leading-none ${n <= calificacion ? "text-brand" : "text-border"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder="How was the run?"
              rows={3}
              className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            <Button type="submit" variant="ghost" disabled={calificacion === 0}>
              Submit review
            </Button>
          </form>
        )}
      </Card>

      <Button onClick={() => router.push(`/cerro/${id}/leaderboard`)} className="w-full">
        View leaderboard
      </Button>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-foreground/50">{label}</p>
    </div>
  );
}

function formatearMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
