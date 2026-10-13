"use client";

import { useParams, useRouter } from "next/navigation";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { crearRunId, useGuardadoDescenso } from "@/hooks/use-guardar-descenso";
import { useUltimoResultado } from "@/hooks/use-ultimo-resultado";
import { useTrailApi } from "@/hooks/use-trail-api";
import { formatDate, formatDuration, formatSpeed } from "@/lib/format";
import type { EntradaLeaderboard, TipoBici } from "@/lib/types";
import { useDescent } from "@/providers/descent-provider";
import { useTrail } from "@/providers/trail-provider";

// The in-progress run has no rider profile yet (bike type is picked at sign-up, not
// built in this etapa), so the injected row allows a "—" placeholder instead of a
// fabricated TipoBici value.
type FilaLeaderboard = Omit<EntradaLeaderboard, "bikeType"> & { bikeType: TipoBici | "—" };

export default function LeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reset } = useDescent();
  const { cerro } = useTrail();
  const resultado = useUltimoResultado(id);
  const guardado = useGuardadoDescenso(
    id,
    resultado ? crearRunId(id, resultado.guardadoEn) : null,
  );

  // `id` in the URL is the trail slug.
  const { loading, dbStatus, data } = useTrailApi<EntradaLeaderboard[]>(
    `/api/trails/${id}/leaderboard`,
  );
  const entradasBase: FilaLeaderboard[] = data ?? [];
  // Insert the just-finished run into the displayed ranking without mutating mock-data.
  // Only when the run did NOT reach the database (offline demo): if it was saved, the
  // server data already has it; if it was invalid or an SOS, it must not rank.
  const guardadoEnBase = guardado?.outcome === "saved" || guardado?.outcome === "invalid";
  const propiaEntrada: FilaLeaderboard | null =
    resultado && !resultado.interrumpidoPorSos && !guardadoEnBase
      ? {
          id: "own-run",
          cerroId: id,
          usuario: "Vos",
          tiempoMs: resultado.tiempoMs,
          velocidadPromedioKmh: resultado.velocidadPromedioKmh,
          fecha: new Date(resultado.guardadoEn).toISOString().slice(0, 10),
          bikeType: "—",
        }
      : null;

  const entradas = [...entradasBase, ...(propiaEntrada ? [propiaEntrada] : [])].sort(
    (a, b) => a.tiempoMs - b.tiempoMs,
  );

  function handleFinalizar() {
    reset();
    router.push("/mapa");
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-text-muted">
        Cargando leaderboard…
      </main>
    );
  }

  if (dbStatus === "empty") {
    return <DbStatusNotice dbStatus="empty" />;
  }

  const podio = entradas.slice(0, 3);

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col">
        {/* Poster header */}
        <section className="dh-contours bg-secondary px-4 pb-6 pt-6 text-white sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Ranking</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {cerro.nombre}
            </h1>
            <p className="mt-1 text-sm text-white">
              Mejor tiempo válido de cada rider.
            </p>

            {podio.length > 0 ? <Podio entradas={podio} /> : null}
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:px-6">
          <Card className="overflow-hidden p-0">
            {/* Narrow phones scroll the table sideways instead of squashing it. */}
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla del ranking">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">Ranking de {cerro.nombre}, ordenado por tiempo</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-xs uppercase tracking-wide text-text-muted">
                    <th scope="col" className="px-3 py-3 sm:px-4">#</th>
                    <th scope="col" className="px-3 py-3 sm:px-4">Rider</th>
                    <th scope="col" className="px-3 py-3 sm:px-4">Fecha</th>
                    <th scope="col" className="px-3 py-3 sm:px-4">Tiempo</th>
                    <th scope="col" className="px-3 py-3 sm:px-4">Vel. prom.</th>
                    <th scope="col" className="px-3 py-3 sm:px-4">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.map((entrada, i) => {
                    const esPropia = entrada.id === "own-run";
                    return (
                      <tr
                        key={entrada.id}
                        className={`dh-fade-up border-b border-border last:border-none ${esPropia ? "bg-primary/15" : ""}`}
                        style={{ "--i": i } as React.CSSProperties}
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <Puesto puesto={i + 1} />
                        </td>
                        <td className="px-3 py-3 font-semibold sm:px-4">
                          <span className="flex flex-wrap items-center gap-2">
                            {entrada.usuario}
                            {esPropia ? <Badge variant="success">Tu descenso</Badge> : null}
                            {entrada.esDemo ? <Badge variant="demo">DEMO</Badge> : null}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-text-muted sm:px-4">{formatDate(entrada.fecha)}</td>
                        <td className="px-3 py-3 font-mono font-bold tabular-nums sm:px-4">
                          {formatDuration(entrada.tiempoMs)}
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums sm:px-4">
                          {formatSpeed(entrada.velocidadPromedioKmh)}
                        </td>
                        <td className="px-3 py-3 text-text-muted sm:px-4">
                          {entrada.bikeType && entrada.bikeType !== "—" ? (
                            entrada.bikeType
                          ) : (
                            <span aria-label="Sin dato">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {entradas.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">
                Todavía no hay descensos válidos en este sendero.
              </p>
            ) : null}
          </Card>

          <Button onClick={handleFinalizar} size="lg" className="w-full">
            Finalizar
          </Button>
        </div>
      </main>
    </>
  );
}

// Gold, silver and bronze. The number is always shown, so color is never the
// only signal.
const MEDALLAS = ["bg-primary text-text", "bg-slate-300 text-text", "bg-orange-300 text-text"];

function Puesto({ puesto }: { puesto: number }) {
  if (puesto > 3) {
    return <span className="font-mono font-semibold tabular-nums text-text-muted">{puesto}</span>;
  }
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold ${MEDALLAS[puesto - 1]}`}
    >
      {puesto}
    </span>
  );
}

// Podium blocks in the classic 2 - 1 - 3 order; the first place stands tallest.
function Podio({ entradas }: { entradas: FilaLeaderboard[] }) {
  const orden = [1, 0, 2].filter((i) => i < entradas.length);
  const alturas = ["h-24", "h-16", "h-12"];
  return (
    <ol className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Podio">
      {orden.map((i, pos) => {
        const entrada = entradas[i];
        return (
          <li key={entrada.id} className="flex flex-col items-center gap-2 text-center">
            <span className="line-clamp-1 text-sm font-bold">{entrada.usuario}</span>
            <span className="font-mono text-xs">{formatDuration(entrada.tiempoMs)}</span>
            <div
              className={`dh-rise flex w-full items-start justify-center rounded-t-lg border-2 border-text/20 pt-2 font-mono text-2xl font-bold ${MEDALLAS[i]} ${alturas[i]}`}
              style={{ "--i": pos } as React.CSSProperties}
            >
              <span className="sr-only">Puesto </span>
              {i + 1}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
