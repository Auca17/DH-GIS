# Pending review items

Known issues noted during development. Not fixed yet.

## Connect screens to MongoDB (read-only)

- **Network failure shows "Sendero no encontrado".** If the request to `/api/trails/...` itself fails (network error, not a database state), `useTrailApi` (`src/hooks/use-trail-api.ts`) returns `dbStatus: null` and `data: null`. The trail, timer and leaderboard screens then show "Sendero no encontrado" (the map shows "No se pudieron cargar los senderos.") instead of the offline notice.
- **`/cerro/zzz` answers HTTP 200.** An unknown slug renders the not-found page, but `curl` gets status 200 instead of 404. The same happens with the legacy-id redirect (`/cerro/pequia`). Likely cause, not confirmed: with `cacheComponents` the response streams and the status is sent before the layout calls `notFound()` / `redirect()`.
