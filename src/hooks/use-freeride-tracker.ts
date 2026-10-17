"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { guardarDraftFreeride, limpiarDraftFreeride, obtenerDraftFreeride } from "@/lib/freeride-storage";
import { haversineDistanceM } from "@/lib/track-geometry";
import { pistaEscarpadoGloria } from "@/lib/trazados";
import type { PuntoFreeride, SesionFreeride } from "@/lib/types";

export type FreerideEstado = "idle" | "grabando" | "pausado" | "detenido";

const MIN_ACCURACY_THRESHOLD_M = 35; // Descartamos lecturas con error mayor a 35 metros (jitter)
const MIN_DISTANCE_MOVEMENT_M = 2.5; // Descartamos micro-movimientos espurios si está quieto

export function useFreerideTracker() {
  const [estado, setEstado] = useState<FreerideEstado>("idle");
  const [puntos, setPuntos] = useState<PuntoFreeride[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanciaTotalM, setDistanciaTotalM] = useState(0);
  const [velocidadActualKmh, setVelocidadActualKmh] = useState(0);
  const [velocidadMaximaKmh, setVelocidadMaximaKmh] = useState(0);
  const [desnivelPositivoM, setDesnivelPositivoM] = useState(0);
  const [desnivelNegativoM, setDesnivelNegativoM] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [modoSimulador, setModoSimulador] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const simIndexRef = useRef<number>(0);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointRef = useRef<PuntoFreeride | null>(null);
  const accumulatedPausedTimeRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number | null>(null);

  // Inicializar draft si existe en sessionStorage
  useEffect(() => {
    const draft = obtenerDraftFreeride();
    if (draft && draft.puntos.length > 0) {
      setPuntos(draft.puntos);
      setStartedAt(draft.startedAt);
      const ultimo = draft.puntos[draft.puntos.length - 1];
      lastPointRef.current = ultimo;
      setDistanciaTotalM(ultimo.distanciaAcumuladaM);
    }
  }, []);

  // Timer para tiempo transcurrido
  useEffect(() => {
    if (estado !== "grabando" || startedAt === null) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = now - startedAt - accumulatedPausedTimeRef.current;
      setElapsedMs(Math.max(0, totalElapsed));
    }, 250);

    return () => clearInterval(interval);
  }, [estado, startedAt]);

  const procesarNuevoPunto = useCallback(
    (lat: number, lng: number, elevacionM: number | null, accuracyM: number | null, speedMs: number | null) => {
      const now = Date.now();
      const puntoAnterior = lastPointRef.current;

      let distanciaTramoM = 0;
      let nuevaDistanciaTotal = distanciaTotalM;
      let nuevaVelocidadKmh = 0;

      if (puntoAnterior) {
        distanciaTramoM = haversineDistanceM(
          { lat: puntoAnterior.lat, lng: puntoAnterior.lng },
          { lat, lng },
        );

        // Si la precisión es muy mala, ignoramos el punto para no ensuciar el track
        if (accuracyM !== null && accuracyM > MIN_ACCURACY_THRESHOLD_M) {
          return;
        }

        // Filtro de ruido cuando el ciclista está detenido
        if (distanciaTramoM < MIN_DISTANCE_MOVEMENT_M && (speedMs === null || speedMs < 0.5)) {
          setVelocidadActualKmh(0);
          return;
        }

        nuevaDistanciaTotal = puntoAnterior.distanciaAcumuladaM + distanciaTramoM;
        const dtMs = now - puntoAnterior.timestampMs;

        if (speedMs !== null && speedMs >= 0) {
          nuevaVelocidadKmh = Math.round(speedMs * 3.6 * 10) / 10;
        } else if (dtMs > 0) {
          nuevaVelocidadKmh = Math.round((distanciaTramoM / (dtMs / 3_600_000) / 1000) * 10) / 10;
        }

        // Cálculo de desnivel
        if (elevacionM !== null && puntoAnterior.elevacionM !== null) {
          const deltaEle = elevacionM - puntoAnterior.elevacionM;
          if (deltaEle > 0) {
            setDesnivelPositivoM((prev) => prev + deltaEle);
          } else if (deltaEle < 0) {
            setDesnivelNegativoM((prev) => prev + Math.abs(deltaEle));
          }
        }
      } else {
        // Primer punto
        nuevaVelocidadKmh = speedMs !== null && speedMs >= 0 ? Math.round(speedMs * 3.6 * 10) / 10 : 0;
      }

      const nuevoPunto: PuntoFreeride = {
        lat,
        lng,
        elevacionM,
        accuracyM,
        timestampMs: now,
        velocidadKmh: nuevaVelocidadKmh,
        distanciaAcumuladaM: nuevaDistanciaTotal,
      };

      lastPointRef.current = nuevoPunto;
      setDistanciaTotalM(nuevaDistanciaTotal);
      setVelocidadActualKmh(nuevaVelocidadKmh);
      setVelocidadMaximaKmh((prev) => Math.max(prev, nuevaVelocidadKmh));
      setPuntos((prev) => {
        const actualizados = [...prev, nuevoPunto];
        if (startedAt) {
          guardarDraftFreeride(actualizados, startedAt);
        }
        return actualizados;
      });
    },
    [distanciaTotalM, startedAt],
  );

  // Manejador del GPS Real (HTML5 Geolocation API)
  useEffect(() => {
    if (estado !== "grabando" || modoSimulador) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsError("La geolocalización no está soportada por este navegador.");
      return;
    }

    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        procesarNuevoPunto(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.altitude,
          pos.coords.accuracy,
          pos.coords.speed,
        );
      },
      (err) => {
        let msg = "Error al obtener la señal GPS.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Permiso de ubicación denegado. Habilitalo en los ajustes de tu navegador.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Señal GPS no disponible. Asegurate de estar al aire libre.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Tiempo de espera de señal GPS agotado.";
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 1000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [estado, modoSimulador, procesarNuevoPunto]);

  // Manejador de Simulación para demostración en clase o desarrollo en PC
  useEffect(() => {
    if (estado !== "grabando" || !modoSimulador) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    // Aplanamos la pista de prueba para recorrerla punto a punto
    const puntosSimulacion = pistaEscarpadoGloria.flatMap((t) => t.puntos);

    simIntervalRef.current = setInterval(() => {
      const idx = simIndexRef.current;
      if (idx >= puntosSimulacion.length) {
        // Reiniciamos o terminamos
        simIndexRef.current = 0;
        return;
      }

      const p = puntosSimulacion[idx];
      // Simulamos velocidad variable entre 20 y 32 km/h
      const speedKmh = 22 + (idx % 7) * 1.5;
      const speedMs = speedKmh / 3.6;

      procesarNuevoPunto(p.lat, p.lng, p.elevacionM, 5, speedMs);
      simIndexRef.current += 1;
    }, 1200);

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [estado, modoSimulador, procesarNuevoPunto]);

  const iniciar = useCallback(() => {
    const now = Date.now();
    setStartedAt(now);
    setElapsedMs(0);
    setPuntos([]);
    setDistanciaTotalM(0);
    setVelocidadActualKmh(0);
    setVelocidadMaximaKmh(0);
    setDesnivelPositivoM(0);
    setDesnivelNegativoM(0);
    setGpsError(null);
    lastPointRef.current = null;
    accumulatedPausedTimeRef.current = 0;
    pauseStartedAtRef.current = null;
    simIndexRef.current = 0;
    setEstado("grabando");
  }, []);

  const pausar = useCallback(() => {
    if (estado !== "grabando") return;
    pauseStartedAtRef.current = Date.now();
    setVelocidadActualKmh(0);
    setEstado("pausado");
  }, [estado]);

  const reanudar = useCallback(() => {
    if (estado !== "pausado") return;
    if (pauseStartedAtRef.current !== null) {
      accumulatedPausedTimeRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    setEstado("grabando");
  }, [estado]);

  const detener = useCallback((): SesionFreeride | null => {
    if (estado === "idle") return null;

    setEstado("detenido");
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    const now = Date.now();
    const duracionMs = startedAt ? now - startedAt - accumulatedPausedTimeRef.current : elapsedMs;
    const velPromedio =
      duracionMs > 0 ? Math.round((distanciaTotalM / (duracionMs / 3_600_000) / 1000) * 10) / 10 : 0;

    const sesion: SesionFreeride = {
      id: `freeride-${now}`,
      titulo: `Freeride ${new Date(now).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      startedAt: startedAt ?? now,
      endedAt: now,
      tiempoTotalMs: duracionMs,
      distanciaTotalM,
      velocidadPromedioKmh: velPromedio,
      velocidadMaximaKmh,
      desnivelPositivoM: Math.round(desnivelPositivoM),
      desnivelNegativoM: Math.round(desnivelNegativoM),
      puntos,
      guardadoEn: now,
    };

    limpiarDraftFreeride();
    return sesion;
  }, [
    estado,
    startedAt,
    elapsedMs,
    distanciaTotalM,
    velocidadMaximaKmh,
    desnivelPositivoM,
    desnivelNegativoM,
    puntos,
  ]);

  const descartar = useCallback(() => {
    setEstado("idle");
    setPuntos([]);
    setStartedAt(null);
    setElapsedMs(0);
    setDistanciaTotalM(0);
    setVelocidadActualKmh(0);
    setVelocidadMaximaKmh(0);
    setDesnivelPositivoM(0);
    setDesnivelNegativoM(0);
    setGpsError(null);
    lastPointRef.current = null;
    accumulatedPausedTimeRef.current = 0;
    pauseStartedAtRef.current = null;
    simIndexRef.current = 0;
    limpiarDraftFreeride();
  }, []);

  return {
    estado,
    puntos,
    puntoActual: lastPointRef.current,
    startedAt,
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
  };
}
