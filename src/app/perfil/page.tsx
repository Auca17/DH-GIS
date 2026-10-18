"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BikeFields, BIKE_FORM_EMPTY, biciParaEnviar, type BikeFormValues } from "@/components/bikes/BikeFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { etiquetaBici } from "@/lib/bikes/bike-label";
import { useSesion } from "@/providers/session-provider";

// "Mi perfil": rider data, their bikes, add a bike, choose the main one, sign out.
// Bikes cannot be deleted: descents already saved point to them (bikeId).

export default function PerfilPage() {
  const router = useRouter();
  const { usuario, bicis, cargando, recargar, salir } = useSesion();

  const [agregando, setAgregando] = useState(false);
  const [nueva, setNueva] = useState<BikeFormValues>(BIKE_FORM_EMPTY);
  const [nuevaPrincipal, setNuevaPrincipal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (cargando) {
    return <main className="flex flex-1 items-center justify-center p-6 text-text-muted">Cargando…</main>;
  }

  if (!usuario) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-text">Ingresá a tu cuenta para ver tu perfil.</p>
        <Link href="/" className="font-bold text-primary underline-offset-2 hover:underline">
          Ingresar
        </Link>
      </main>
    );
  }

  async function handleAgregar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch("/api/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...biciParaEnviar(nueva), isPrimary: nuevaPrincipal }),
      });
      const json = await response.json();
      if (!json.ok) {
        setError(json.message ?? "No se pudo guardar la bici.");
        return;
      }
      setNueva(BIKE_FORM_EMPTY);
      setNuevaPrincipal(false);
      setAgregando(false);
      await recargar();
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function handlePrincipal(bikeId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/bikes/${bikeId}/primary`, { method: "PATCH" });
      const json = await response.json();
      if (!json.ok) setError(json.message ?? "No se pudo cambiar la bici principal.");
      await recargar();
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    }
  }

  async function handleSalir() {
    await salir();
    router.push("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 sm:p-8">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-text">{usuario.nombre}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Email</dt>
          <dd className="truncate text-text">{usuario.email}</dd>
          <dt className="text-text-muted">Nivel</dt>
          <dd className="capitalize text-text">{usuario.nivel}</dd>
          <dt className="text-text-muted">Ciudad</dt>
          <dd className="text-text">{usuario.ciudad}</dd>
          <dt className="text-text-muted">Anda desde</dt>
          <dd className="text-text">{usuario.andaDesde}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Mis bicis</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {bicis.map((bici) => (
            <li
              key={bici.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 first:border-none first:pt-0"
            >
              <div>
                <p className="font-bold text-text">{etiquetaBici(bici)}</p>
                <p className="text-xs text-text-muted">
                  Suspensión {bici.recorridoDelanteroMm} mm adelante ·{" "}
                  {bici.recorridoTraseroMm === 0 ? "rígida atrás" : `${bici.recorridoTraseroMm} mm atrás`}
                </p>
              </div>
              {bici.principal ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Principal
                </span>
              ) : (
                <Button variant="ghost" onClick={() => handlePrincipal(bici.id)}>
                  Hacer principal
                </Button>
              )}
            </li>
          ))}
        </ul>

        {agregando ? (
          <form onSubmit={handleAgregar} className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
            <BikeFields idPrefix="nueva" values={nueva} onChange={setNueva} />
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={nuevaPrincipal}
                onChange={(e) => setNuevaPrincipal(e.target.checked)}
                className="h-4 w-4"
              />
              Usarla como principal
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={enviando} className="flex-1">
                {enviando ? "Guardando…" : "Guardar bici"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAgregando(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" onClick={() => setAgregando(true)} className="mt-5 w-full">
            Agregar bici
          </Button>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </Card>

      <Button variant="ghost" onClick={handleSalir} className="w-full">
        Cerrar sesión
      </Button>
    </main>
  );
}
