"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Cosmetic login only: no auth state, no persistence. Any non-empty input is
// accepted and simply navigates on to the map.
export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const puedeContinuar = usuario.trim().length > 0 && password.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeContinuar) return;
    router.push("/mapa");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-brand-foreground">
            DH
          </div>
          <h1 className="text-xl font-bold">DH Leaderboard</h1>
          <p className="text-sm text-foreground/60">
            Track your downhill runs and race the mountain.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="usuario"
            label="Username"
            placeholder="your username"
            autoComplete="username"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button type="submit" disabled={!puedeContinuar} className="mt-2 w-full">
            Enter
          </Button>
        </form>
      </Card>
    </main>
  );
}
