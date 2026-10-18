"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BikeFields, BIKE_FORM_EMPTY, biciParaEnviar, type BikeFormValues } from "@/components/bikes/BikeFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSesion } from "@/providers/session-provider";

// Sign-up: rider data plus the first bike (POST /api/auth/register).
// The first bike becomes the main one. The server signs the rider in right away.

const LEVEL_OPTIONS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export default function RegistroPage() {
  const router = useRouter();
  const { recargar } = useSesion();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("principiante");
  const [city, setCity] = useState("");
  const [ridingSinceYear, setRidingSinceYear] = useState("");
  const [bike, setBike] = useState<BikeFormValues>(BIKE_FORM_EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          level,
          city,
          ridingSinceYear: Number(ridingSinceYear),
          bike: biciParaEnviar(bike),
        }),
      });
      const json = await response.json();
      if (!json.ok) {
        setError(json.message ?? "No se pudo crear la cuenta.");
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
    <main className="flex flex-1 justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-text">Crear cuenta</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tus descensos con GPS se guardan a tu nombre y con la bici que elijas.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Tus datos
            </legend>
            <Input
              id="displayName"
              label="Nombre visible (sale en el ranking)"
              placeholder="ej. Lucas R."
              autoComplete="nickname"
              maxLength={30}
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              helperText="Mínimo 8 caracteres."
              minLength={8}
              maxLength={72}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select
              id="level"
              label="Nivel"
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
            <Input
              id="city"
              label="Ciudad"
              placeholder="ej. Mendoza"
              autoComplete="address-level2"
              maxLength={60}
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              id="ridingSinceYear"
              label="¿En qué año empezaste a andar?"
              type="number"
              inputMode="numeric"
              placeholder="ej. 2019"
              required
              value={ridingSinceYear}
              onChange={(e) => setRidingSinceYear(e.target.value)}
            />
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Tu bici
            </legend>
            <BikeFields idPrefix="bike" values={bike} onChange={setBike} />
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={enviando} className="w-full">
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-text-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/" className="font-bold text-primary underline-offset-2 hover:underline">
              Ingresá
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
