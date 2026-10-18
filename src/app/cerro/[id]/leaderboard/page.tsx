"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Flame,
  Medal,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { crearRunId, useGuardadoDescenso } from "@/hooks/use-guardar-descenso";
import { useTrailApi } from "@/hooks/use-trail-api";
import { useUltimoResultado } from "@/hooks/use-ultimo-resultado";
import { diaEnMendoza, formatDate, formatDuration, formatSpeed } from "@/lib/format";
import type { EntradaLeaderboard, TipoBici } from "@/lib/types";
import { useDescent } from "@/providers/descent-provider";
import { useTrail } from "@/providers/trail-provider";

type FilaLeaderboard = Omit<EntradaLeaderboard, "bikeType"> & {
  bikeType: TipoBici | "—";
};

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

  const { loading, dbStatus, data } = useTrailApi<EntradaLeaderboard[]>(
    `/api/trails/${id}/leaderboard`,
  );
  const entradasBase: FilaLeaderboard[] = data ?? [];

  const guardadoEnBase =
    guardado?.outcome === "saved" || guardado?.outcome === "invalid";
  const propiaEntrada: FilaLeaderboard | null =
    resultado && !resultado.interrumpidoPorSos && !guardadoEnBase
      ? {
          id: "own-run",
          cerroId: id,
          usuario: "Vos",
          tiempoMs: resultado.tiempoMs,
          velocidadPromedioKmh: resultado.velocidadPromedioKmh,
          fecha: diaEnMendoza(resultado.guardadoEn),
          bikeType: "—",
        }
      : null;

  const entradas = [
    ...entradasBase,
    ...(propiaEntrada ? [propiaEntrada] : []),
  ].sort((a, b) => a.tiempoMs - b.tiempoMs);

  const recordMs = entradas[0]?.tiempoMs ?? 0;

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
  const criatura = cerro.criatura;

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col pb-12">
        {/* Poster Hero Banner (Light Theme Impeccable) */}
        <section className="dh-contours relative border-b border-border bg-surface px-4 pb-8 pt-6 sm:px-6 shadow-xs">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Speedrun Hall of Fame
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary font-mono">
                Temporada 2026
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-text sm:text-4xl">
              {cerro.nombre}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Tiempos oficiales registrados con telemetría GPS.
            </p>

            {podio.length > 0 ? <PodioSpeedrun entradas={podio} /> : null}
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:px-6">
          <Card className="overflow-hidden p-0 border border-border bg-surface shadow-sm">
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Tabla del ranking speedrun"
            >
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">
                  Ranking de {cerro.nombre}, ordenado por tiempo
                </caption>
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-text-muted">
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Rango
                    </th>
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Rider
                    </th>
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Delta Récord
                    </th>
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Tiempo
                    </th>
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Vel. Prom.
                    </th>
                    <th scope="col" className="px-3 py-3.5 sm:px-4">
                      Bici
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entradas.map((entrada, i) => {
                    const esPropia = entrada.id === "own-run";
                    const deltaMs = entrada.tiempoMs - recordMs;
                    const escapoBestia = criatura
                      ? entrada.tiempoMs / 1000 <= criatura.tiempoLimiteS
                      : false;

                    return (
                      <tr
                        key={entrada.id}
                        className={`dh-fade-up transition-colors hover:bg-surface-muted/40 ${
                          esPropia
                            ? "bg-secondary/10 border-l-4 border-l-secondary"
                            : i === 0
                              ? "bg-primary/5"
                              : ""
                        }`}
                        style={{ "--i": i } as React.CSSProperties}
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <PuestoSpeedrun puesto={i + 1} />
                        </td>
                        <td className="px-3 py-3 font-semibold sm:px-4">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2 text-text font-bold">
                              {entrada.usuario}
                              {esPropia ? (
                                <Badge variant="success" className="text-[10px]">
                                  Tu tiempo
                                </Badge>
                              ) : null}
                              {entrada.esDemo ? (
                                <Badge variant="demo" className="text-[10px]">
                                  DEMO
                                </Badge>
                              ) : null}
                              {escapoBestia ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  title={`Escapó del ${criatura?.nombre ?? "Pomberito"}`}
                                >
                                  <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Escapó
                                </span>
                              ) : null}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {formatDate(entrada.fecha)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold sm:px-4">
                          {i === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs bg-amber-100 text-amber-900 border border-amber-300 font-extrabold">
                              RÉCORD <Flame className="h-3 w-3 text-primary" />
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                                deltaMs < 3000
                                  ? "bg-amber-50 text-amber-900 border border-amber-200 font-semibold"
                                  : "text-text-muted"
                              }`}
                            >
                              +{(deltaMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold tabular-nums text-text sm:px-4">
                          {formatDuration(entrada.tiempoMs)}
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums text-text sm:px-4">
                          {formatSpeed(entrada.velocidadPromedioKmh)}
                        </td>
                        <td className="px-3 py-3 text-text-muted sm:px-4">
                          {entrada.bikeType && entrada.bikeType !== "—" ? (
                            <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text">
                              {entrada.bikeType}
                            </span>
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
              <p className="p-4 text-sm text-text-muted text-center">
                Todavía no hay descensos válidos en este sendero. ¡Sé el primero en marcar el récord!
              </p>
            ) : null}
          </Card>

          <Button
            onClick={handleFinalizar}
            size="lg"
            className="w-full bg-primary hover:bg-primary-ink text-text font-bold text-base py-3.5 shadow-sm"
          >
            Volver al Mapa
          </Button>
        </div>
      </main>
    </>
  );
}

function PuestoSpeedrun({ puesto }: { puesto: number }) {
  if (puesto === 1) {
    return (
      <span
        title="1er Puesto - Récord"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs shadow-xs"
      >
        <Trophy className="h-3.5 w-3.5 text-primary" />
      </span>
    );
  }
  if (puesto === 2) {
    return (
      <span
        title="2do Puesto"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-xs shadow-xs"
      >
        <Medal className="h-3.5 w-3.5 text-slate-500" />
      </span>
    );
  }
  if (puesto === 3) {
    return (
      <span
        title="3er Puesto"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 border border-amber-600/30 text-amber-800 font-extrabold text-xs shadow-xs"
      >
        <Medal className="h-3.5 w-3.5 text-amber-700" />
      </span>
    );
  }
  return (
    <span className="font-mono font-bold tabular-nums text-text-muted pl-2">
      #{puesto}
    </span>
  );
}

function PodioSpeedrun({ entradas }: { entradas: FilaLeaderboard[] }) {
  const orden = [1, 0, 2].filter((i) => i < entradas.length);

  return (
    <ol
      className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-4"
      aria-label="Podio de honor"
    >
      {orden.map((i, pos) => {
        const entrada = entradas[i];
        const esPrimero = i === 0;
        const esSegundo = i === 1;

        return (
          <li
            key={entrada.id}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            {esPrimero && (
              <span className="text-xl animate-bounce" aria-hidden="true">
                👑
              </span>
            )}
            <span className="line-clamp-1 text-xs sm:text-sm font-bold text-text">
              {entrada.usuario}
            </span>
            <span className="font-mono text-xs font-extrabold text-primary">
              {formatDuration(entrada.tiempoMs)}
            </span>
            <div
              className={`dh-rise flex w-full flex-col items-center justify-start rounded-t-xl border-t-2 border-x-2 pt-2 font-mono font-extrabold transition-transform ${
                esPrimero
                  ? "h-36 border-primary bg-gradient-to-t from-amber-100 to-amber-50 text-amber-900 shadow-sm"
                  : esSegundo
                    ? "h-26 border-slate-300 bg-gradient-to-t from-slate-100 to-slate-50 text-slate-700"
                    : "h-20 border-amber-700/30 bg-gradient-to-t from-amber-100/60 to-amber-50 text-amber-900"
              }`}
              style={{ "--i": pos } as React.CSSProperties}
            >
              <span className="text-2xl drop-shadow-xs">
                {esPrimero ? "1" : esSegundo ? "2" : "3"}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1 font-semibold">
                {esPrimero ? "Leyenda" : esSegundo ? "Pro" : "Retador"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
