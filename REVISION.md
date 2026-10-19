# Pending review items

Known issues and open decisions. Not fixed yet unless marked as fixed.

## Open

- **Unknown trail slug answers HTTP 200 (known limitation).** `/cerro/zzz` shows the not-found page with `<meta name="robots" content="noindex">`, but the status is 200. Cause (confirmed in `node_modules/next/dist/docs/01-app/02-guides/streaming.md`, "The HTTP contract"): the trail layout reads MongoDB inside `<Suspense>`, so the 200 is already sent when `notFound()` runs. A real 404 would need a database query in `proxy.ts` on every request; not worth it. Explained in `src/app/cerro/[id]/layout.tsx`.
- **Network failure without a clear message.** If a request to `/api/...` itself fails (network error, not a database state), `useTrailApi` (`src/hooks/use-trail-api.ts`) returns `dbStatus: null` and `data: null`. Since arreglo 3 the trail page and the timer no longer fetch the trail (it comes from the layout), so this only affects the map ("No se pudieron cargar los senderos."), the reviews list (shows none) and the leaderboard (shows none). No offline notice is shown in that case.
- **`minValidTimeS` placeholders.** Pequia is 30 s (agreed). Cantera 60, Zampal 30 and Quebrada Seca 45 are placeholders (`src/lib/mock-data.ts`, written by the seed).
- **Offline save message not checked in the browser.** The offline answer of `POST /api/descents` (503, "No se pudo guardar el descenso (sin conexión a la base)") was checked with `curl`; the automated browser flow intercepted the POST, so the message on the result screen still needs a manual check.
- **Trail list fetched again on every return to `/mapa`.** One GET per visit (production). Fine for now; it could be cached if needed.

## Fixed

- **Test descents in the database.** `check-fast-1`, `check-ok-1` and `check-sos-1` (created while testing `POST /api/descents`) were deleted from the local database on 2026-10-19. Atlas never had them.
- **Legacy ids (`/cerro/pequia`) redirected on the client.** Now `next.config.ts` `redirects()` answers a real 307 and keeps the sub-path (`/cerro/pequia/leaderboard` → `/cerro/circuito-dh-pequia/leaderboard`).
- **API error messages in English.** Every message the screens can show (`POST /api/descents`, `/api/trails/...`) is in Spanish now. Only `/api/health` (for developers) stays in English.
- **"Guardando descenso…" could stay stuck.** The pending mark stores `sentAt`; after 30 s it is sent again (runId keeps it idempotent) and the fetch gives up after 30 s with "No pudimos confirmar si se guardó el descenso. Revisá el ranking en un rato." (`src/hooks/use-guardar-descenso.ts`).
- **Leaflet `_leaflet_pos` error after pressing "Parar" (production build).** Cause: `fitBounds` started a zoom animation when a mini map mounted; if the screen changed before it ended, the map was removed and the end of the animation crashed in `_onZoomTransitionEnd`. Fix: `fitBounds(..., { animate: false })` in `src/components/track-preview/TrackMapPreview.tsx`.
