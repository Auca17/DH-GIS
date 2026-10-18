"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Bici, PerfilRider } from "@/lib/types";

// Who is signed in, shared by every screen (header, start panel, freeride, profile).
// It asks GET /api/me once when the app opens; after signing in, signing up,
// adding a bike or signing out, the screen calls `recargar()` to ask again.
//
// The browser never sees the session token: it lives in an httpOnly cookie that
// fetch sends by itself. Here we only keep what /api/me answers.

export interface SesionValue {
  usuario: PerfilRider | null;
  bicis: Bici[];
  /** True until the first answer of /api/me arrives. */
  cargando: boolean;
  recargar: () => Promise<void>;
  salir: () => Promise<void>;
}

// Used when there is no provider (tests, or a screen rendered alone): signed out.
const SIN_SESION: SesionValue = {
  usuario: null,
  bicis: [],
  cargando: false,
  recargar: async () => {},
  salir: async () => {},
};

const SesionContext = createContext<SesionValue>(SIN_SESION);

interface Datos {
  usuario: PerfilRider | null;
  bicis: Bici[];
}

const VACIO: Datos = { usuario: null, bicis: [] };

/** Asks the server who is signed in. Only fetches: it does not touch React state. */
async function pedirSesion(): Promise<Datos> {
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    const json = await response.json();
    return json.ok ? { usuario: json.usuario, bicis: json.bicis } : VACIO;
  } catch {
    // Network error: behave as signed out; the screens still work (demo mode).
    return VACIO;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargando, setCargando] = useState(true);

  // First load. The state is set inside .then (when the answer arrives), never
  // directly in the effect body. `vigente` ignores a late answer after unmounting.
  useEffect(() => {
    let vigente = true;
    void pedirSesion().then((nuevos) => {
      if (!vigente) return;
      setDatos(nuevos);
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    setDatos(await pedirSesion());
    setCargando(false);
  }, []);

  const salir = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setDatos(VACIO);
    }
  }, []);

  const value = useMemo<SesionValue>(
    () => ({ usuario: datos.usuario, bicis: datos.bicis, cargando, recargar, salir }),
    [datos, cargando, recargar, salir],
  );

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionValue {
  return useContext(SesionContext);
}
