import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { cerros } from "@/lib/mock-data";
import { DescentProvider } from "@/providers/descent-provider";

// This route looks up mock data per dynamic `id` at request time — it is not static
// content — so it opts out of the project's Cache Components static/streaming
// requirement (next.config.ts `cacheComponents: true`) and renders as a normal
// blocking (dynamic) route instead.
export const instant = false;

// Keeps the descent state alive across /cerro/[id] -> /cronometro -> /resultado ->
// /leaderboard for the same cerro: the provider lives at this layout level, above all
// four routes, so navigating between them does not remount (and reset) the Context.
export default async function CerroLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const cerro = cerros.find((c) => c.id === id);

  if (!cerro) {
    notFound();
  }

  return (
    <DescentProvider cerroId={cerro.id} pista={cerro.pista}>
      {children}
    </DescentProvider>
  );
}
