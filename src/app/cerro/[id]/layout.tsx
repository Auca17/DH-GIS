import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { DbStatusNotice } from "@/components/db-status/DbStatusNotice";
import { loadTrail } from "@/lib/data/trail-data";
import { DescentProvider } from "@/providers/descent-provider";
import { TrailProvider } from "@/providers/trail-provider";

// Keeps the descent state alive across /cerro/[id] -> /cronometro -> /resultado ->
// /leaderboard for the same cerro: the provider lives at this layout level, above all
// four routes, so navigating between them does not remount (and reset) the Context.
//
// The trail is read from MongoDB on every request. With `cacheComponents`, data that
// arrives at request time must be inside <Suspense>: Next.js sends the fallback right
// away and streams the real content when the database answers. (A loading.tsx file
// would not help here: it only wraps the page, not this layout.)
//
// Known limitation: an unknown slug shows the not-found page but the HTTP status is
// 200, not 404. Once the <Suspense> fallback is sent, the status is already on its
// way and cannot change; Next.js adds <meta name="robots" content="noindex"> instead
// (node_modules/next/dist/docs/01-app/02-guides/streaming.md, "The HTTP contract").
// A real 404 would need a database query before any <Suspense> (in proxy.ts) on every
// request, only for a status code that no screen shows. Old ids ("pequia") are
// redirected in next.config.ts, before rendering.
export default function CerroLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-6 text-center text-text-muted">
          Cargando sendero…
        </div>
      }
    >
      <CerroContent params={params}>{children}</CerroContent>
    </Suspense>
  );
}

async function CerroContent({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;

  const { dbStatus, data: cerro } = await loadTrail(id);

  // Database up but without trails: tell how to fill it (no mock data here).
  if (dbStatus === "empty") {
    return <DbStatusNotice dbStatus="empty" />;
  }

  if (!cerro) {
    notFound();
  }

  // TrailProvider shares the trail loaded here with the screens below, so they
  // do not fetch it again.
  return (
    <TrailProvider cerro={cerro} dbStatus={dbStatus}>
      <DescentProvider cerroId={cerro.id} pista={cerro.pista}>
        {children}
      </DescentProvider>
    </TrailProvider>
  );
}
