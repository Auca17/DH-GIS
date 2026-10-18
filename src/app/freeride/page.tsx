"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BikePicker } from "@/components/bikes/BikePicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Stat } from "@/components/ui/Stat";
import { useFreerideTracker } from "@/hooks/use-freeride-tracker";
import { biciPorDefecto, etiquetaBici } from "@/lib/bikes/bike-label";
import { formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import {
  eliminarSesionFreeride,
  guardarSesionFreeride,
  obtenerSesionesFreeride,
} from "@/lib/freeride-storage";
import type { SesionFreeride } from "@/lib/types";
import { useSesion } from "@/providers/session-provider";

const FreerideMap = dynamic(
  () => import("@/components/freeride/FreerideMap").then((m) => m.FreerideMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-text-muted">
        Cargando mapa GPS…
      </div>
    ),
  },
);

export default function FreeridePage() {
  const {
    estado,
    puntos,
    puntoActual,
    elapsedMs,
    distanciaTotalM,
    velocidadActualKmh,
    velocidadMaximaKmh,
    desnivelPositivoM,
    desnivelNegativoM,
    gpsError,
    modoSimulador,
    setModoSimulador,
    iniciar,
    pausar,
    reanudar,
    detener,
    descartar,
  } = useFreerideTracker();

  // Bike of this ride: picked before starting (only asked with 2 or more bikes).
  // Freeride sessions stay in this browser, so we keep the bike's label, not its id.
  const { bicis } = useSesion();
  const [biciElegida, setBiciElegida] = useState<string | null>(null);
  const biciUsada = bicis.find((b) => b.id === biciElegida) ?? biciPorDefecto(bicis);

  const [sesionTerminada, setSesionTerminada] = useState<SesionFreeride | null>(null);
  const [nombreSesion, setNombreSesion] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState<SesionFreeride[]>([]);

  useEffect(() => {
    setHistorial(obtenerSesionesFreeride());
  }, [mostrarHistorial]);

  function handleFinalizar() {
    const sesion = detener();
    if (sesion) {
      setSesionTerminada(sesion);
      setNombreSesion(sesion.titulo);
    }
  }

  function handleGuardarSesion() {
    if (!sesionTerminada) return;
    const final: SesionFreeride = {
      ...sesionTerminada,
      titulo: nombreSesion.trim() || sesionTerminada.titulo,
      bici: biciUsada ? etiquetaBici(biciUsada) : undefined,
    };
    guardarSesionFreeride(final);
    setSesionTerminada(null);
    descartar();
    setHistorial(obtenerSesionesFreeride());
    setMostrarHistorial(true);
  }

  function handleEliminar(id: string) {
    eliminarSesionFreeride(id);
    setHistorial(obtenerSesionesFreeride());
  }

  return (
    <main
      className="flex flex-col min-h-0 bg-background"
      style={{ height: "calc(100dvh - var(--header-height) - env(safe-area-inset-top))" }}
    >
      {/* HUD Superior / Métricas */}
      <div className="border-b border-border bg-surface px-4 py-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                Modo Freeride
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  estado === "grabando"
                    ? "bg-red-500/20 text-red-400 animate-pulse"
                    : estado === "pausado"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-surface-muted text-text-muted"
                }`}
              >
                {estado === "grabando"
                  ? "Grabando"
                  : estado === "pausado"
                    ? "Pausado"
                    : "Listo"}
              </span>
            </div>
            <p className="font-mono text-3xl font-bold tracking-tight text-text sm:text-4xl">
              {formatDuration(elapsedMs)}
            </p>
          </div>

          {/* Toggle Modo Simulador / GPS */}
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              disabled={estado !== "idle"}
              onClick={() => setModoSimulador(!modoSimulador)}
              className={`rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${
                modoSimulador
                  ? "border-primary bg-primary/20 text-primary-ink"
                  : "border-border bg-surface-muted text-text-muted hover:text-text"
              }`}
            >
              {modoSimulador ? "Simulador Activo" : "GPS Real"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarHistorial(true)}
              className="text-xs font-medium text-text-muted hover:text-primary transition-colors underline"
            >
              Mis recorridos ({historial.length})
            </button>
          </div>
        </div>

        {/* Barra de Estadísticas en Vivo */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:gap-4">
          <div className="rounded-lg border border-border bg-surface-muted/50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Velocidad
            </p>
            <p className="font-mono text-base font-bold text-text sm:text-lg">
              {formatSpeed(velocidadActualKmh)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted/50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Distancia
            </p>
            <p className="font-mono text-base font-bold text-text sm:text-lg">
              {formatDistance(distanciaTotalM)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted/50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Desnivel
            </p>
            <p className="font-mono text-base font-bold text-text sm:text-lg">
              +{desnivelPositivoM}m / -{desnivelNegativoM}m
            </p>
          </div>
        </div>

        {gpsError && (
          <div className="mt-2">
            <Notice variant="error" className="py-1 text-xs">
              {gpsError}
            </Notice>
          </div>
        )}
      </div>

      {/* Área del Mapa en Vivo */}
      <div className="relative flex-1 min-h-0">
        <FreerideMap puntos={puntos} puntoActual={puntoActual} />
      </div>

      {/* Barra de Control Inferior */}
      <div className="border-t border-border bg-surface p-4 shrink-0 shadow-lg">
        {estado === "idle" ? (
          <div className="mx-auto mb-3 max-w-md">
            <BikePicker
              id="bici-freeride"
              bicis={bicis}
              value={biciUsada?.id ?? ""}
              onChange={setBiciElegida}
            />
          </div>
        ) : null}
        <div className="mx-auto flex max-w-md items-center justify-center gap-3">
          {estado === "idle" && (
            <Button
              type="button"
              size="lg"
              onClick={iniciar}
              className="w-full bg-primary hover:bg-primary-ink text-text font-bold text-base py-3 shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-2 inline-block"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Iniciar Grabación Freeride
            </Button>
          )}

          {estado === "grabando" && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={pausar}
                className="flex-1 font-semibold"
              >
                Pausar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={handleFinalizar}
                className="flex-1 font-bold"
              >
                Terminar
              </Button>
            </>
          )}

          {estado === "pausado" && (
            <>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={reanudar}
                className="flex-1 font-bold"
              >
                Reanudar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={handleFinalizar}
                className="flex-1 font-bold"
              >
                Terminar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={descartar}
                className="text-text-muted hover:text-red-400"
              >
                Descartar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal de Guardado al Terminar */}
      <Dialog
        isOpen={Boolean(sesionTerminada)}
        onClose={() => {
          setSesionTerminada(null);
          descartar();
        }}
        titleId="dialog-guardar-freeride"
        title="¡Recorrido Freeride Completado!"
        description="Revisá las estadísticas de tu salida y guardala en tu dispositivo."
      >
        <div className="space-y-4 pt-2">
          <Input
            id="nombre-sesion"
            label="Nombre de la salida"
            value={nombreSesion}
            onChange={(e) => setNombreSesion(e.target.value)}
            placeholder="Ej: Bajada libre Cerro de la Gloria"
          />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Tiempo total" value={formatDuration(sesionTerminada?.tiempoTotalMs ?? 0)} />
            <Stat label="Distancia" value={formatDistance(sesionTerminada?.distanciaTotalM ?? 0)} />
            <Stat label="Velocidad prom." value={formatSpeed(sesionTerminada?.velocidadPromedioKmh ?? 0)} />
            <Stat label="Velocidad máx." value={formatSpeed(sesionTerminada?.velocidadMaximaKmh ?? 0)} />
          </div>

          <div className="flex gap-2 justify-end pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSesionTerminada(null);
                descartar();
              }}
            >
              Descartar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleGuardarSesion}
              className="font-bold"
            >
              Guardar Recorrido
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal / Historial de Recorridos Guardados */}
      <Dialog
        isOpen={mostrarHistorial}
        onClose={() => setMostrarHistorial(false)}
        titleId="dialog-historial-freeride"
        title="Mis Recorridos Freeride"
        description="Salidas grabadas en local con GPS y almacenadas en tu navegador."
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pt-2">
          {historial.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">
              Aún no tenés recorridos freeride guardados. ¡Salí a rodar y dale al play!
            </p>
          ) : (
            historial.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-surface-muted/40 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-text text-sm">{s.titulo}</h3>
                    {s.bici ? <p className="text-xs text-text-muted">{s.bici}</p> : null}
                    <p className="text-xs text-text-muted">
                      {new Date(s.startedAt).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEliminar(s.id)}
                    className="text-xs text-text-muted hover:text-red-400 p-1"
                    title="Eliminar recorrido"
                  >
                    Borrar
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t border-border/50">
                  <div>
                    <span className="text-[10px] text-text-muted block">Dist.</span>
                    <span className="font-mono text-xs font-semibold text-text">
                      {formatDistance(s.distanciaTotalM)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Tiempo</span>
                    <span className="font-mono text-xs font-semibold text-text">
                      {formatDuration(s.tiempoTotalMs)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Prom.</span>
                    <span className="font-mono text-xs font-semibold text-text">
                      {formatSpeed(s.velocidadPromedioKmh)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Desnivel</span>
                    <span className="font-mono text-xs font-semibold text-text">
                      -{s.desnivelNegativoM}m
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>
    </main>
  );
}
