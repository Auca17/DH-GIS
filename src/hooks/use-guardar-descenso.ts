"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ResultadoDescenso } from "@/lib/types";

// Saves the finished run with POST /api/descents, only ONCE per run, and remembers
// what happened in sessionStorage (key per trail slug):
//   { runId, outcome: "pending" | "saved" | "invalid" | "failed", invalidReason?, message?, sentAt? }
//
// Why sessionStorage: React Strict Mode runs effects twice in development and Next's
// <Activity> runs them again when a page is shown again. If the stored runId equals
// the current one, the POST was already sent and we skip it.
//
// Timeout: a "pending" mark older than PENDING_TIMEOUT_MS means the page was closed or
// reloaded while the POST was in flight, so the answer never arrived. We send the run
// again: runId makes the save idempotent, so if it was already saved the server answers
// with what it stored and does not create a second descent. The fetch itself also gives
// up after PENDING_TIMEOUT_MS, so "Sincronizando…" can never stay forever.

export const PENDING_TIMEOUT_MS = 30_000;

const TIMEOUT_MESSAGE = "No pudimos confirmar si se guardó el descenso. Revisá el ranking en un rato.";

export interface GuardadoDescenso {
  runId: string;
  outcome: "pending" | "saved" | "invalid" | "failed";
  invalidReason?: string | null;
  message?: string;
  /** Only for "pending": when the POST was sent (Date.now()). */
  sentAt?: number;
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

/** True when this stored save still blocks a new POST for runId (see the timeout above). */
export function yaEnviado(stored: GuardadoDescenso | null, runId: string, now: number): boolean {
  if (stored?.runId !== runId) return false;
  if (stored.outcome !== "pending") return true;
  return now - (stored.sentAt ?? 0) <= PENDING_TIMEOUT_MS;
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
  // Older results (before the real GPS) have no mode: they were all simulated.
  const isDemo = (resultado?.modo ?? "demo") === "demo";
  const track = resultado?.track ?? null;
  const bikeId = resultado?.bikeId ?? null;

  const runId = guardadoEn === null ? null : crearRunId(slug, guardadoEn);
  const guardado = useGuardadoDescenso(slug, runId);

  useEffect(() => {
    if (runId === null || guardadoEn === null) return;

    // Already sent (or being sent, and not timed out) for this run: do nothing.
    if (yaEnviado(parse(readRaw(slug)), runId, Date.now())) return;

    // Mark it as pending BEFORE the fetch, so a second run of this effect skips the POST.
    write(slug, { runId, outcome: "pending", sentAt: Date.now() });

    const body = {
      runId,
      trailSlug: slug,
      startedAt: guardadoEn - tiempoMs,
      durationMs: tiempoMs,
      avgSpeedKmh: velocidadPromedioKmh,
      elevationChangeM: cambioElevacionM,
      endedBySos: interrumpidoPorSos,
      // Real GPS -> false, simulated route -> true. The ranking shows "DEMO" when true.
      isDemo,
      // [lng, lat, ms since the start], at most one point per second. The server checks it.
      track: track ?? [],
      // The server checks that this bike belongs to the signed-in rider.
      bikeId,
    };

    fetch("/api/descents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Gives up after the timeout: the .catch below shows TIMEOUT_MESSAGE.
      signal: AbortSignal.timeout(PENDING_TIMEOUT_MS),
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
      .catch((error: unknown) => {
        const timedOut = error instanceof DOMException && error.name === "TimeoutError";
        write(slug, { runId, outcome: "failed", message: timedOut ? TIMEOUT_MESSAGE : undefined });
      });
  }, [
    slug,
    runId,
    guardadoEn,
    tiempoMs,
    velocidadPromedioKmh,
    cambioElevacionM,
    interrumpidoPorSos,
    isDemo,
    track,
    bikeId,
  ]);

  return guardado;
}
