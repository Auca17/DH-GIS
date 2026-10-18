"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Footprints,
  Maximize2,
  MessageSquare,
  Swords,
  Trophy,
} from "lucide-react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { StartPanel } from "@/components/descent/StartPanel";
import { Card } from "@/components/ui/Card";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatDistance } from "@/lib/format";
import { getDifficulty } from "@/lib/difficulty";
import { useTrailApi } from "@/hooks/use-trail-api";
import type { Comentario, Dificultad } from "@/lib/types";
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
        Cargando trazado…
      </div>
    ),
  },
);

export default function CerroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { startDemo, armar } = useDescent();
  const [mapaCompleto, setMapaCompleto] = useState(false);

  const { cerro, dbStatus } = useTrail();
  const reviews = useTrailApi<Comentario[]>(`/api/trails/${id}/reviews`);
  const comentariosDelCerro = reviews.data ?? [];

  const cerroId = cerro.id;

  function handleDemo() {
    startDemo();
    router.push(`/cerro/${cerroId}/cronometro`);
  }

  function handleJugar(puntoJugar: { lat: number; lng: number }) {
    armar(puntoJugar);
    router.push(`/cerro/${cerroId}/cronometro`);
  }

  const criatura = cerro.criatura;

  return (
    <>
      <DbStatusNotice dbStatus={dbStatus} />
      <main className="flex flex-1 flex-col gap-4 p-4 pb-56 max-w-3xl mx-auto w-full">
        {/* Encabezado estilo Quest / Misión */}
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
              <Swords className="h-4 w-4" /> Misión de Descenso
            </span>
            {cerro.isPlaceholder ? (
              <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[10px] font-medium text-text-muted">
                Trazado provisorio
              </span>
            ) : null}
          </div>

          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
            {cerro.nombre}
          </h1>

          <div className="mt-2.5 flex items-center gap-3">
            <DifficultyBadge dificultad={cerro.dificultadGeneral} />
            <RatingStars rating={cerro.calificacion} />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {cerro.descripcion}
          </p>
        </header>

        {/* Alerta del Pomberito */}
        {criatura ? (
          <div className="flex items-start gap-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/20 dark:border-amber-700/40 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              <Footprints className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Persecución: {criatura.nombre}
                </p>
                <span className="rounded-full bg-amber-200/80 dark:bg-amber-800/40 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-900 dark:text-amber-200">
                  Límite: {Math.floor(criatura.tiempoLimiteS / 60)} min
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                {criatura.descripcion}
              </p>
            </div>
          </div>
        ) : null}

        {/* Atributos / Stats Grid */}
        <div className="grid grid-cols-5 gap-2 rounded-2xl border border-border bg-surface p-3.5 text-center shadow-sm">
          <StatItem label="Distancia" value={formatDistance(cerro.largoM)} />
          <StatItem label="Desnivel" value={formatDistance(cerro.desnivelM)} />
          <StatItem label="Pendiente" value={`${cerro.pendientePromedioPct}%`} />
          <StatItem label="T. Prom." value={`${cerro.tiempoPromedioS}s`} />
          <StatItem label="Terreno" value={cerro.terreno} />
        </div>

        {/* Acceso Directo al Leaderboard / Hall of Fame */}
        <Link
          href={`/cerro/${cerro.slug}/leaderboard`}
          className="group flex items-center justify-between rounded-2xl border border-primary/40 bg-surface p-4 transition-all hover:bg-surface-muted hover:border-primary shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                Hall of Fame & Leaderboard
              </p>
              <p className="text-xs text-text-muted">
                Ver los mejores tiempos speedrun y el podio
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Ver ranking <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        {/* Mini-mapa del trazado */}
        <div className="relative h-60 sm:h-72 overflow-hidden rounded-2xl border border-border shadow-sm">
          <TrackMapPreview pista={cerro.pista} />
          <button
            type="button"
            onClick={() => setMapaCompleto(true)}
            className="absolute bottom-3 right-3 z-[500] inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-semibold text-text shadow-sm hover:bg-surface transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Ver mapa completo
          </button>
        </div>

        <div className="flex gap-4 text-xs text-text-muted px-1">
          <LegendItem colorClass="bg-difficulty-facil" label={getDifficulty("facil").label} />
          <LegendItem colorClass="bg-difficulty-intermedia" label={getDifficulty("intermedia").label} />
          <LegendItem colorClass="bg-difficulty-dificil" label={getDifficulty("dificil").label} />
        </div>

        {cerro.fuenteDatos ? (
          <p className="text-xs text-text-muted px-1">
            Datos verificados:{" "}
            <a
              href={cerro.fuenteDatos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {cerro.fuenteDatos.nombre}
            </a>
          </p>
        ) : null}

        {/* Sección de Comentarios y Reseñas */}
        <Card className="flex flex-col gap-3 border-border bg-surface">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Reseñas de la Comunidad
          </h2>
          {comentariosDelCerro.length === 0 ? (
            <p className="text-sm text-text-muted">Todavía no hay comentarios para este sendero.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comentariosDelCerro.map((comentario) => (
                <li
                  key={comentario.id}
                  className="border-t border-border/60 pt-3 first:border-none first:pt-0"
                >
                  <p className="text-sm font-bold text-text">{comentario.autor}</p>
                  <p className="text-sm text-text-muted mt-0.5">{comentario.texto}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{comentario.fecha}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Barra flotante inferior fija con alto z-index y safe-area */}
        <div className="fixed inset-x-0 bottom-0 z-[1000] border-t border-border bg-surface/95 backdrop-blur-md p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl">
          <div className="mx-auto max-w-md">
            {/* Single place to start a run: Jugar (real GPS) or demo mode. */}
            <StartPanel
              salida={cerro.pista[0].puntos[0]}
              onJugar={handleJugar}
              onDemo={handleDemo}
            />
          </div>
        </div>
      </main>

      {mapaCompleto ? (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-bold text-text">{cerro.nombre}</h2>
            <button
              type="button"
              onClick={() => setMapaCompleto(false)}
              className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text hover:bg-surface"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="relative flex-1">
            <TrackMapPreview pista={cerro.pista} bloqueado={false} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

const COLOR_BADGE_DIFICULTAD: Record<Dificultad, string> = {
  facil: "bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  intermedia: "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  dificil: "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

function DifficultyBadge({ dificultad }: { dificultad: Dificultad }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${COLOR_BADGE_DIFICULTAD[dificultad]}`}
    >
      {getDifficulty(dificultad).label}
    </span>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-sm font-bold tabular-nums text-text">
        {value}
      </span>
      <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">{label}</span>
    </div>
  );
}
