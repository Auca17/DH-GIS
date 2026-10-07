"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUltimoResultado } from "@/hooks/use-ultimo-resultado";
import { leaderboardPorCerro } from "@/lib/mock-data";
import type { EntradaLeaderboard } from "@/lib/types";
import { useDescent } from "@/providers/descent-provider";

export default function LeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reset } = useDescent();
  const resultado = useUltimoResultado(id);

  const entradasBase = leaderboardPorCerro[id] ?? [];
  // Insert the just-finished run into the displayed ranking without mutating mock-data.
  const propiaEntrada: EntradaLeaderboard | null = resultado
    ? {
        id: "own-run",
        cerroId: id,
        usuario: "You",
        tiempoMs: resultado.tiempoMs,
        velocidadPromedioKmh: resultado.velocidadPromedioKmh,
        fecha: new Date(resultado.guardadoEn).toISOString().slice(0, 10),
      }
    : null;

  const entradas = [...entradasBase, ...(propiaEntrada ? [propiaEntrada] : [])].sort(
    (a, b) => a.tiempoMs - b.tiempoMs,
  );

  function handleFinalizar() {
    reset();
    router.push("/mapa");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Leaderboard</h1>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Rider</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Avg</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((entrada, i) => {
              const esPropia = entrada.id === "own-run";
              return (
                <tr
                  key={entrada.id}
                  className={`border-b border-border last:border-none ${esPropia ? "bg-brand/10" : ""}`}
                >
                  <td className="px-4 py-3 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3">
                    {entrada.usuario}
                    {esPropia ? " (you)" : ""}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatearMs(entrada.tiempoMs)}
                  </td>
                  <td className="px-4 py-3">{entrada.velocidadPromedioKmh.toFixed(1)} km/h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {entradas.length === 0 ? (
          <p className="p-4 text-sm text-foreground/50">No times recorded yet.</p>
        ) : null}
      </Card>

      <Button onClick={handleFinalizar} className="w-full">
        Finish
      </Button>
    </main>
  );
}

function formatearMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
