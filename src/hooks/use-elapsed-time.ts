"use client";

import { useEffect, useState } from "react";

// Display-only refresh rate for a smooth-looking clock. Independent from the 1Hz GPS
// simulation tick in descent-provider.tsx — this must never recompute position.
const DISPLAY_TICK_MS = 200;

export interface TiempoTranscurrido {
  ms: number;
  formateado: string;
}

export function useElapsedTime(
  startedAt: number | null,
  isRunning: boolean,
): TiempoTranscurrido {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (!isRunning || startedAt === null) return;

    const actualizar = () => setMs(Date.now() - startedAt);
    actualizar();
    const intervalId = setInterval(actualizar, DISPLAY_TICK_MS);
    return () => clearInterval(intervalId);
  }, [isRunning, startedAt]);

  return { ms, formateado: formatearTiempo(ms) };
}

function formatearTiempo(ms: number): string {
  const totalDeciseconds = Math.floor(ms / 100);
  const deciseconds = totalDeciseconds % 10;
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${mm}:${ss}.${deciseconds}`;
}
