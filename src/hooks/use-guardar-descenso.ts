"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ResultadoDescenso } from "@/lib/types";

// Saves the finished run with POST /api/descents, only ONCE per run, and remembers
// what happened in sessionStorage (key per trail slug):
//   { runId, outcome: "pending" | "saved" | "invalid" | "failed", invalidReason?, message? }
//
// Why sessionStorage: React Strict Mode runs effects twice in development and Next's
// <Activity> runs them again when a page is shown again. If the stored runId equals
// the current one, the POST was already sent and we skip it.

export interface GuardadoDescenso {
  runId: string;
  outcome: "pending" | "saved" | "invalid" | "failed";
  invalidReason?: string | null;
  message?: string;
}

// One id per run: the slug plus the stop timestamp. The server uses it to avoid duplicates.
export function crearRunId(slug: string, guardadoEn: number): string {
  return `${slug}-${guardadoEn}`;
}

function storageKey(slug: string): string {
  return `guardadoDescenso:${slug}`;
}

// sessionStorage does not notify the same tab, so we keep our own list of listeners
// and call them after every write. That re-renders the components that read it.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Raw string snapshot: useSyncExternalStore needs a stable value between reads
// (see resultado-storage.ts), and JSON.parse would create a new object every time.
function readRaw(slug: string): string | null {
  try {
    return window.sessionStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}

function write(slug: string, value: GuardadoDescenso) {
  try {
    window.sessionStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // sessionStorage can be blocked (private mode): the screen still works without it.
  }
  listeners.forEach((listener) => listener());
}

function parse(raw: string | null): GuardadoDescenso | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuardadoDescenso;
    return typeof parsed.runId === "string" && typeof parsed.outcome === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Read only: what happened with the save of THIS run (null if nothing was stored for it). */
export function useGuardadoDescenso(slug: string, runId: string | null): GuardadoDescenso | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(slug),
    () => null,
  );
  return useMemo(() => {
    const stored = parse(raw);
    return stored && stored.runId === runId ? stored : null;
  }, [raw, runId]);
}

/** Sends the run to the server once and returns what happened. */
export function useGuardarDescenso(
  slug: string,
  resultado: ResultadoDescenso | null,
): GuardadoDescenso | null {
  const guardadoEn = resultado?.guardadoEn ?? null;
  const tiempoMs = resultado?.tiempoMs ?? 0;
  const velocidadPromedioKmh = resultado?.velocidadPromedioKmh ?? 0;
  const cambioElevacionM = resultado?.cambioElevacionM ?? 0;
  const interrumpidoPorSos = resultado?.interrumpidoPorSos ?? false;

  const runId = guardadoEn === null ? null : crearRunId(slug, guardadoEn);
  const guardado = useGuardadoDescenso(slug, runId);

  useEffect(() => {
    if (runId === null || guardadoEn === null) return;

    // Already sent (or being sent) for this run: do nothing.
    if (parse(readRaw(slug))?.runId === runId) return;

    // Mark it as pending BEFORE the fetch, so a second run of this effect skips the POST.
    write(slug, { runId, outcome: "pending" });

    const body = {
      runId,
      trailSlug: slug,
      startedAt: guardadoEn - tiempoMs,
      durationMs: tiempoMs,
      avgSpeedKmh: velocidadPromedioKmh,
      elevationChangeM: cambioElevacionM,
      endedBySos: interrumpidoPorSos,
      // Every run is simulated for now (there is no real GPS yet).
      isDemo: true,
    };

    fetch("/api/descents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.ok) {
          write(slug, { runId, outcome: "failed", message: json.message });
        } else if (json.data.validated) {
          write(slug, { runId, outcome: "saved" });
        } else {
          write(slug, { runId, outcome: "invalid", invalidReason: json.data.invalidReason });
        }
      })
      .catch(() => {
        write(slug, { runId, outcome: "failed" });
      });
  }, [
    slug,
    runId,
    guardadoEn,
    tiempoMs,
    velocidadPromedioKmh,
    cambioElevacionM,
    interrumpidoPorSos,
  ]);

  return guardado;
}
