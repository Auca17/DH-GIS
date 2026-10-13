"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DhLogo } from "@/components/brand/DhLogo";
import { DownhillRider } from "@/components/brand/DownhillRider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Key the AppHeader reads to show the rider's name.
const RIDER_STORAGE_KEY = "dh_rider";

// Cosmetic login only: no auth. Any non-empty input is accepted; the name is
// remembered in localStorage so the header can greet the rider.
export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const puedeContinuar = usuario.trim().length > 0 && password.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeContinuar) return;
    try {
      localStorage.setItem(RIDER_STORAGE_KEY, usuario.trim());
    } catch {
      // Storage blocked (private mode): the header falls back to "Vos".
    }
    router.push("/mapa");
  }

  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      {/* Poster band */}
      <section
        aria-labelledby="login-title"
        className="dh-contours relative flex flex-col justify-between gap-8 overflow-hidden bg-secondary px-6 py-10 text-white sm:px-10 lg:w-1/2 lg:py-16"
      >
        <div className="dh-fade-up" style={{ "--i": 0 } as React.CSSProperties}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-white">
            Downhill · Mendoza
          </p>
          <h1
            id="login-title"
            className="mt-3 text-7xl font-bold leading-none tracking-tighter sm:text-8xl lg:text-9xl"
          >
            DH
          </h1>
          <p className="mt-4 max-w-sm text-lg font-medium leading-snug text-white">
            Medí tus descensos. Competí en el ranking de cada sendero.
          </p>
        </div>

        <div className="dh-ride-in relative mx-auto w-full max-w-md lg:mx-0">
          <DownhillRider className="w-full drop-shadow-[0_12px_0_rgb(0_0_0_/_0.15)]" title="" />
          {/* Slope under the wheels */}
          <div
            aria-hidden="true"
            className="absolute -bottom-2 left-0 h-2 w-full origin-left rotate-[10deg] rounded-full bg-text/40"
          />
        </div>
      </section>

      {/* Sign-in form */}
      <section className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <Card className="dh-fade-up w-full max-w-sm" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="mb-6 flex items-center gap-3">
            <DhLogo size={44} title="" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text">Entrá a DH</h2>
              <p className="text-sm text-text-muted">Elegí un nombre para el ranking.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="usuario"
              label="Nombre de rider"
              placeholder="ej. Lucas R."
              autoComplete="username"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-text-muted">Demo: cualquier contraseña sirve.</p>

            <Button type="submit" size="lg" disabled={!puedeContinuar} className="mt-1 w-full">
              Entrar
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
