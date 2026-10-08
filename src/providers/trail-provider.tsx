"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DbStatus } from "@/lib/data/trail-data";
import type { Cerro } from "@/lib/types";

// The /cerro/[id] layout already loads the trail on the server (loadTrail). This
// context hands that same trail to the screens below it (trail page, timer), so
// they do not ask /api/trails/<slug> for it again.

interface TrailContextValue {
  cerro: Cerro;
  dbStatus: DbStatus;
}

const TrailContext = createContext<TrailContextValue | null>(null);

export function TrailProvider({
  cerro,
  dbStatus,
  children,
}: TrailContextValue & { children: ReactNode }) {
  return <TrailContext value={{ cerro, dbStatus }}>{children}</TrailContext>;
}

export function useTrail(): TrailContextValue {
  const value = useContext(TrailContext);
  if (!value) {
    throw new Error("useTrail must be used inside the /cerro/[id] layout (TrailProvider).");
  }
  return value;
}
