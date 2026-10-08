"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RatingStars } from "@/components/ui/RatingStars";
import { useTrailApi } from "@/hooks/use-trail-api";
import type { Cerro, Comentario, Dificultad } from "@/lib/types";
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
        Cargando trazado…
      </div>
    ),
  },
);

export default function CerroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { start } = useDescent();
  const [mapaCompleto, setMapaCompleto] = useState(false);

  // `id` in the URL is the trail slug. Detail and reviews come from the API.
  const trail = useTrailApi<Cerro>(`/api/trails/${id}`);
  const reviews = useTrailApi<Comentario[]>(`/api/trails/${id}/reviews`);
  const cerro = trail.data;
  const comentariosDelCerro = reviews.data ?? [];

  if (trail.loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-foreground/60">
        Cargando sendero…
      </main>
    );
  }

  if (trail.dbStatus === "empty") {
    return <DbStatusNotice dbStatus="empty" />;
  }

  if (!cerro) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-foreground/60">
        Sendero no encontrado.
      </main>
    );
  }

  const cerroId = cerro.id;

  function handlePlay() {
    start();
    router.push(`/cerro/${cerroId}/cronometro`);
  }

  return (
    <>
      <DbStatusNotice dbStatus={trail.dbStatus} />
      {/* Jerarquía (prompt.md paso 3): título, datos clave en una fila, mini-mapa, play
          grande (fijo abajo), opiniones. pb-32 deja lugar de sobra para que el Play fijo
          no tape el último comentario. */}
      <main className="flex flex-1 flex-col gap-4 p-4 pb-32">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{cerro.nombre}</h1>
            <div className="mt-1 flex items-center gap-2">
              <DifficultyBadge dificultad={cerro.dificultadGeneral} />
              <RatingStars rating={cerro.calificacion} />
            </div>
          </div>
          {cerro.isPlaceholder ? (
            <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground/60">
              Trazado provisorio
            </span>
          ) : null}
        </header>

        <p className="text-sm leading-relaxed text-foreground/80">{cerro.descripcion}</p>

        <div className="grid grid-cols-5 gap-2 rounded-2xl border border-border bg-surface p-3 text-center">
          <StatItem label="Distancia" value={`${cerro.largoM} m`} />
          <StatItem label="Desnivel" value={`${cerro.desnivelM} m`} />
          <StatItem label="Pendiente" value={`${cerro.pendientePromedioPct}%`} />
          <StatItem label="T. promedio" value={`${cerro.tiempoPromedioS}s`} />
          <StatItem label="Terreno" value={cerro.terreno} />
        </div>

        <div className="relative h-56 overflow-hidden rounded-2xl border border-border sm:h-72">
          <TrackMapPreview pista={cerro.pista} />
          <button
            type="button"
            onClick={() => setMapaCompleto(true)}
            className="absolute bottom-3 right-3 z-[500] rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-md"
          >
            Ver mapa completo
          </button>
        </div>

        <div className="flex gap-4 text-xs text-foreground/60">
          <LegendItem colorClass="bg-difficulty-facil" label="Suave" />
          <LegendItem colorClass="bg-difficulty-intermedia" label="Media" />
          <LegendItem colorClass="bg-difficulty-dificil" label="Fuerte" />
        </div>

        {cerro.fuenteDatos ? (
          <p className="text-xs text-foreground/40">
            Datos del sendero:{" "}
            <a
              href={cerro.fuenteDatos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {cerro.fuenteDatos.nombre}
            </a>
          </p>
        ) : null}

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">Opiniones</h2>
          {comentariosDelCerro.length === 0 ? (
            <p className="text-sm text-foreground/50">Todavía no hay comentarios.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comentariosDelCerro.map((comentario) => (
                <li
                  key={comentario.id}
                  className="border-t border-border pt-3 first:border-none first:pt-0"
                >
                  <p className="text-sm font-medium">{comentario.autor}</p>
                  <p className="text-sm text-foreground/70">{comentario.texto}</p>
                  <p className="mt-1 text-xs text-foreground/40">{comentario.fecha}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
          <Button onClick={handlePlay} className="w-full">
            ▶ Jugar
          </Button>
        </div>
      </main>

      {mapaCompleto ? (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold">{cerro.nombre}</h2>
            <button
              type="button"
              onClick={() => setMapaCompleto(false)}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium"
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
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

const ETIQUETA_DIFICULTAD: Record<Dificultad, string> = {
  facil: "Fácil",
  intermedia: "Intermedia",
  dificil: "Difícil",
};

const COLOR_BADGE_DIFICULTAD: Record<Dificultad, string> = {
  facil: "bg-difficulty-facil/15 text-difficulty-facil",
  intermedia: "bg-difficulty-intermedia/15 text-difficulty-intermedia",
  dificil: "bg-difficulty-dificil/15 text-difficulty-dificil",
};

function DifficultyBadge({ dificultad }: { dificultad: Dificultad }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_BADGE_DIFICULTAD[dificultad]}`}
    >
      {ETIQUETA_DIFICULTAD[dificultad]}
    </span>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-foreground/50">{label}</span>
    </div>
  );
}
