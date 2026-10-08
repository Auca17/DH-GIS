import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { legacyIdToSlug, loadTrail } from "@/lib/data/trail-data";
import { DescentProvider } from "@/providers/descent-provider";

// This route reads the trail from MongoDB per dynamic `id` (now the trail slug) at
// request time — it is not static content — so it opts out of the project's Cache
// Components static/streaming requirement (next.config.ts `cacheComponents: true`)
// and renders as a normal blocking (dynamic) route instead.
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

  // Old links used ids like "pequia". Send them to the slug URL. A layout does not
  // know the rest of the path, so old sub-paths (/cronometro, ...) land on the trail page.
  const slug = legacyIdToSlug(id);
  if (slug && slug !== id) {
    redirect(`/cerro/${slug}`);
  }

  const { dbStatus, data: cerro } = await loadTrail(id);

  // Database up but without trails: tell how to fill it (no mock data here).
  if (dbStatus === "empty") {
    return <DbStatusNotice dbStatus="empty" />;
  }

  if (!cerro) {
    notFound();
  }

  return (
    <DescentProvider cerroId={cerro.id} pista={cerro.pista}>
      {children}
    </DescentProvider>
  );
}
