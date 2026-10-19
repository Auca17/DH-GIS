"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Footprints,
  MapPin,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { crearRunId, useGuardarDescenso } from "@/hooks/use-guardar-descenso";
import { MAX_COMMENT_LENGTH } from "@/lib/reviews/validate-review";
import { useUltimoResultado } from "@/hooks/use-ultimo-resultado";
import { useTrail } from "@/providers/trail-provider";

// Spanish message for each invalidReason the server can answer (lib/descents/descent-rules.ts).
// "sos" (older runs, there is no SOS button now) has its own box below.
const MENSAJES_INVALIDO: Record<string, string> = {
  "too fast": "Descenso no válido: el tiempo es inverosímil para este sendero (anti-cheat).",
  "empty track": "Descenso no válido: no hay suficiente rastro GPS.",
  "did not start at the start": "Descenso no válido: no arrancó desde la salida del sendero.",
  "did not reach the finish": "Descenso no válido: no llegó a la meta.",
  "implausible speed": "Descenso no válido: el GPS marcó una velocidad imposible.",
  "gps signal lost": "Descenso no válido: se perdió la señal GPS durante el descenso.",
  "track does not match the time": "Descenso no válido: el rastro no coincide con el tiempo medido.",
};

export default function ResultadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { cerro } = useTrail();
  const resultado = useUltimoResultado(id);
  const guardado = useGuardarDescenso(id, resultado);
  // Invalid for any reason except SOS (SOS has its own message).
  const mensajeInvalido =
    guardado?.outcome === "invalid" && guardado.invalidReason !== "sos"
      ? (MENSAJES_INVALIDO[guardado.invalidReason ?? ""] ?? "Descenso no válido.")
      : null;

  const [texto, setTexto] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorResena, setErrorResena] = useState<string | null>(null);

  // POST /api/reviews. The server checks again that the descent is ours, valid and real GPS.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resultado || calificacion === 0) return;
    setEnviando(true);
    setErrorResena(null);
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: crearRunId(id, resultado.guardadoEn),
        rating: calificacion,
        comment: texto,
      }),
    })
      .then(async (response) => {
        const json = await response.json();
        if (response.ok && json.ok) {
          setEnviado(true);
        } else {
          setErrorResena(json.message ?? "No se pudo guardar la reseña.");
        }
      })
      .catch(() => {
        setErrorResena("No se pudo guardar la reseña (sin conexión).");
      })
      .finally(() => {
        setEnviando(false);
      });
  }

  if (!resultado) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-text-muted">
          No encontramos un descenso reciente en este sendero.
        </p>
        <Button onClick={() => router.push(`/cerro/${id}`)}>
          Volver al sendero
        </Button>
      </main>
    );
  }

  // Reviews only for a valid run measured with real GPS (the server checks it again).
  const puedeResenar = guardado?.outcome === "saved" && resultado.modo === "gps";

  const criatura = cerro.criatura;
  const escapo = criatura
    ? resultado.tiempoMs / 1000 <= criatura.tiempoLimiteS
    : true;

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 max-w-2xl mx-auto w-full pb-16">
      {/* Banner de victoria (Light Theme) */}
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Flag className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-text tracking-tight sm:text-3xl">
          ¡Descenso Finalizado!
        </h1>
        <p className="font-mono text-5xl font-extrabold text-primary my-2.5 tracking-tighter">
          {formatDuration(resultado.tiempoMs)}
        </p>
        <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">
          Tiempo cronometrado oficial · {cerro.nombre}
        </p>
      </div>

      {/* Resultado de la criatura (El Pomberito) */}
      {criatura && !resultado.interrumpidoPorSos ? (
        escapo ? (
          <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/20 dark:border-emerald-700/40 p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                ¡Le ganaste al {criatura.nombre}!
              </p>
              <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                Completaste el sendero antes de los {Math.floor(criatura.tiempoLimiteS / 60)} min. El Pomberito se quedó silbando solo entre las piedras.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/20 dark:border-amber-700/40 p-4 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
                ¡Te alcanzó el {criatura.nombre}!
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Superaste el límite de {Math.floor(criatura.tiempoLimiteS / 60)} min. El Pomberito te sopló la nuca en la meta, pero tu tiempo clasifica igual en el Leaderboard.
              </p>
            </div>
          </div>
        )
      ) : null}

      {resultado.interrumpidoPorSos ? (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Interrumpido por SOS — no cuenta para el leaderboard</span>
        </div>
      ) : null}

      {mensajeInvalido ? (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{mensajeInvalido}</span>
        </div>
      ) : null}

      {guardado?.outcome === "failed" ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {guardado.message ?? "No se pudo sincronizar el descenso con la base de datos."}
        </div>
      ) : null}

      {/* Grid de telemetría resumen */}
      <div className={`grid grid-cols-3 gap-3 text-center ${mensajeInvalido ? "opacity-40" : ""}`}>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <p className="font-mono text-xl font-extrabold text-text tabular-nums">
            {formatDuration(resultado.tiempoMs)}
          </p>
          <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mt-1">
            Tiempo
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <p className="font-mono text-xl font-extrabold text-text tabular-nums">
            {formatSpeed(resultado.velocidadPromedioKmh)}
          </p>
          <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mt-1">
            Vel. Promedio
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <p className="font-mono text-xl font-extrabold text-text tabular-nums">
            -{formatDistance(resultado.cambioElevacionM)}
          </p>
          <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mt-1">
            Desnivel
          </p>
        </div>
      </div>

      {guardado?.outcome === "pending" ? (
        <p className="text-xs text-text-muted text-center animate-pulse">
          Sincronizando con base de datos…
        </p>
      ) : null}
      {guardado?.outcome === "saved" ? (
        <p className="text-xs text-emerald-700 font-semibold text-center flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Descenso registrado en el Leaderboard oficial.
        </p>
      ) : null}

      {/* Botón de acceso directo al Leaderboard */}
      <Button
        onClick={() => router.push(`/cerro/${id}/leaderboard`)}
        size="lg"
        className="w-full bg-primary hover:bg-primary-ink text-text font-bold text-base py-3.5 shadow-sm flex items-center justify-center gap-2"
      >
        <Trophy className="h-5 w-5" /> Ver mi Posición en el Ranking
      </Button>

      {/* Dejá tu opinión: only after a valid real-GPS run */}
      {puedeResenar ? (
      <Card className="flex flex-col gap-3 border-border bg-surface">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text">
          Calificá el sendero
        </h2>
        {enviado ? (
          <p className="text-sm text-emerald-700 font-semibold">
            ¡Muchas gracias por tu reseña y puntuación!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCalificacion(n)}
                  aria-label={`Calificar ${n} de 5`}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      n <= calificacion
                        ? "fill-primary text-primary"
                        : "text-border"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={texto}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Cómo estaba el terreno? Saltos, barro, piedras…"
              className="min-h-20 w-full rounded-xl border border-border bg-surface-muted/60 p-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {errorResena ? (
              <p className="text-sm font-medium text-danger">{errorResena}</p>
            ) : null}
            <Button
              type="submit"
              variant="secondary"
              disabled={calificacion === 0 || enviando}
            >
              {enviando ? "Enviando…" : "Enviar reseña"}
            </Button>
          </form>
        )}
      </Card>
      ) : null}

      <Button
        variant="ghost"
        onClick={() => router.push("/mapa")}
        className="w-full text-text-muted hover:text-text flex items-center justify-center gap-2"
      >
        <MapPin className="h-4 w-4" /> Volver al Mapa de Senderos
      </Button>
    </main>
  );
}
