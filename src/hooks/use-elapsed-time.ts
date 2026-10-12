"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

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

  return { ms, formateado: formatDuration(ms) };
}
