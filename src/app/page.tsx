"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DhLogo } from "@/components/brand/DhLogo";
import { DownhillRider } from "@/components/brand/DownhillRider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useSesion } from "@/providers/session-provider";

// Sign in with email and password (POST /api/auth/login). The server sets an
// httpOnly session cookie; then we ask GET /api/me again so the header shows the name.
// Without an account you can still look at the map and use the demo mode.
export default function LoginPage() {
  const router = useRouter();
  const { recargar } = useSesion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeContinuar = email.trim().length > 0 && password.length > 0 && !enviando;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeContinuar) return;
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();
      if (!json.ok) {
        setError(json.message ?? "No se pudo ingresar.");
        return;
      }
      await recargar();
      router.push("/mapa");
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
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
          <DownhillRider className="w-full drop-shadow-[0_12px_0_rgb(0_0_0_/_0.15)]" title="" accent="var(--bg)" />
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
              <p className="text-sm text-text-muted">Ingresá para guardar tus descensos.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="vos@mail.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            {error ? (
              <p role="alert" className="text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={!puedeContinuar} className="mt-1 w-full">
              {enviando ? "Ingresando…" : "Entrar"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-sm">
            <p className="text-text-muted">
              ¿No tenés cuenta?{" "}
              <Link href="/registro" className="font-bold text-primary underline-offset-2 hover:underline">
                Creá una
              </Link>
            </p>
            <Link href="/mapa" className="text-text-muted underline-offset-2 hover:underline">
              Entrar sin cuenta (mapa y modo demo)
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
