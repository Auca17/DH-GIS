"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RatingStars } from "@/components/ui/RatingStars";
import { cerros, comentarios } from "@/lib/mock-data";
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
        Loading track…
      </div>
    ),
  },
);

export default function CerroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { start } = useDescent();

  const cerro = cerros.find((c) => c.id === id);
  const comentariosDelCerro = comentarios.filter((c) => c.cerroId === id);

  if (!cerro) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-foreground/60">
        Trail not found.
      </main>
    );
  }

  const cerroId = cerro.id;

  function handlePlay() {
    start();
    router.push(`/cerro/${cerroId}/cronometro`);
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pb-28">
      <header>
        <h1 className="text-2xl font-bold">{cerro.nombre}</h1>
        <RatingStars rating={cerro.calificacion} className="mt-1" />
      </header>

      <p className="text-sm leading-relaxed text-foreground/80">{cerro.descripcion}</p>

      <div className="h-56 overflow-hidden rounded-2xl border border-border sm:h-72">
        <TrackMapPreview pista={cerro.pista} />
      </div>

      <div className="flex gap-4 text-xs text-foreground/60">
        <LegendItem colorClass="bg-difficulty-facil" label="Easy" />
        <LegendItem colorClass="bg-difficulty-intermedia" label="Intermediate" />
        <LegendItem colorClass="bg-difficulty-dificil" label="Difficult" />
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">Comments</h2>
        {comentariosDelCerro.length === 0 ? (
          <p className="text-sm text-foreground/50">No comments yet.</p>
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
          ▶ Play
        </Button>
      </div>
    </main>
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
