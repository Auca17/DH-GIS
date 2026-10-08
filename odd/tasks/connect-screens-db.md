# Connect screens to MongoDB (read-only)

## Objective
Map, trail detail, timer, leaderboard and reviews read from MongoDB instead of `src/lib/mock-data.ts`, through read-only API routes, with slug-based URLs.

## Constraints
- Read-only: no POST of descents or reviews.
- Do not touch GPS logic or visual design. Do not fix unrelated Next.js errors: list them.
- No commits until the user approves (CLAUDE.md overrides ODD per-task commits).
- TDD: off (source: no test runner configured). Checks: `npm run lint`, `npm run build`, manual three-state test.

## Database states
- `ok`: read from MongoDB.
- `offline`: Mongo down → mock fallback + notice "Sin conexión a la base: mostrando datos de ejemplo".
- `empty`: Mongo up, no trails → message "La base está vacía. Corré `npm run seed` en la terminal." (no silent fallback).

## Tasks
- [x] T1 Queries C7 (trail list), C8 (trail by slug), C9 (reviews per trail with `$lookup`); add `slug` to C5 output.
- [x] T2 Data layer `src/lib/data/trail-data.ts` (status decision, doc → UI types, mock fallback, `legacyIdToSlug`).
- [x] T3 API routes: `/api/trails`, `/api/trails/[slug]`, `/api/trails/[slug]/leaderboard`, `/api/trails/[slug]/reviews`.
- [x] T4 Client hook + `DbStatusNotice` component.
- [x] T5 Wire screens: map, `MapaCerros` href, `[id]` layout (legacy redirect), trail page, leaderboard, timer.
- [x] T6 Lint + build; list unrelated Next.js errors.

## Progress
All tasks implemented, uncommitted. Observed: `npm run lint` clean; `npm run build` OK (new routes dynamic, no Mongo hit at prerender).
Three states checked against `next start` with env overrides (ok on the real db, offline with a dead port, empty with an empty db name): `/api/trails*` return the right `dbStatus`; unknown slug gives 404 (ok/offline); `/cerro/pequia` redirects to `/cerro/circuito-dh-pequia`; the layout shows the seed message in empty mode.
Legacy id -> slug mapping lives only in `legacyIdToSlug` (`src/lib/data/trail-data.ts`). Old sub-paths redirect to the trail root.
Not tested in a real browser (offline bar visuals, map, timer).

## Next step
User approved. Committed as one step commit (feat: connect screens); open items moved to REVISION.md. Wait for the next step.
