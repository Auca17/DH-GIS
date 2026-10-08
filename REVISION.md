# Pending review items

Known issues and open decisions. Not fixed yet unless marked as fixed.

## Open

- **`/cerro/zzz` answers HTTP 200.** An unknown slug renders the not-found page, but `curl` gets status 200 instead of 404. The same happens with the legacy-id redirect (`/cerro/pequia`). Likely cause, not confirmed: with `cacheComponents` the response streams and the status is sent before the layout calls `notFound()` / `redirect()` (both now run inside `<Suspense>` in `src/app/cerro/[id]/layout.tsx`).
- **Network failure without a clear message.** If a request to `/api/...` itself fails (network error, not a database state), `useTrailApi` (`src/hooks/use-trail-api.ts`) returns `dbStatus: null` and `data: null`. Since arreglo 3 the trail page and the timer no longer fetch the trail (it comes from the layout), so this only affects the map ("No se pudieron cargar los senderos."), the reviews list (shows none) and the leaderboard (shows none). No offline notice is shown in that case.
- **Test descents in the database.** `check-fast-1`, `check-ok-1` and `check-sos-1` (`source: "app"`) were created while testing `POST /api/descents`. Because of `check-ok-1` (45 s), "Demo rider" is first in Pequia's leaderboard. Not deleted (rule: no deleting data); the team decides.
- **API error messages in English.** The 400 and 404 messages of `POST /api/descents` are in English and the result screen shows them as they come. Only the offline message is in Spanish.
- **`minValidTimeS` placeholders.** Pequia is 30 s (agreed). Cantera 60, Zampal 30 and Quebrada Seca 45 are placeholders (`src/lib/mock-data.ts`, written by the seed).
- **"Guardando descenso…" can stay stuck.** If the page reloads while the POST is in flight, the "pending" marker in sessionStorage stays and the result screen keeps showing "Guardando descenso…" for that run. No expiry logic.
- **Offline save message not checked in the browser.** The offline answer of `POST /api/descents` (503, "No se pudo guardar el descenso (sin conexión a la base)") was checked with `curl`; the automated browser flow intercepted the POST, so the message on the result screen still needs a manual check.
- **Trail list fetched again on every return to `/mapa`.** One GET per visit (production). Fine for now; it could be cached if needed.

## Fixed

- **Leaflet `_leaflet_pos` error after pressing "Parar" (production build).** Cause: `fitBounds` started a zoom animation when a mini map mounted; if the screen changed before it ended, the map was removed and the end of the animation crashed in `_onZoomTransitionEnd`. Fix: `fitBounds(..., { animate: false })` in `src/components/track-preview/TrackMapPreview.tsx`.
