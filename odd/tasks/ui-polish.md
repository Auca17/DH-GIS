# UI/UX Polish (45 phases)

## Objective
Implement comprehensive UI/UX polish for DH downhill MTB leaderboard according to Impeccable design system (light theme, cream/burnt orange/amber poster aesthetic) and make MongoDB database concepts visible and explainable for classroom evaluation, while leaving all database queries and core GPS logic to the student team.

## Baseline
- Branch: `feat/mongodb`
- Review base: `08028b6`
- `npx tsc --noEmit`: Exit 0
- `npm run lint`: Exit 0
- `npm run build`: Exit 0 (Next.js 16.4.0 Turbopack, 13 static/dynamic routes compiled)
- Working tree: Only `prompt.md` and `docs/` untouched.

## Decisions

## Phase Checklist

### Block 0: Setup and safety net
- [x] P00 — Baseline tracker
- [x] P01 — Vitest setup and smoke test
- [x] P02 — Tests for `src/lib/gps-simulator.ts`
- [x] P03 — Tests for `src/lib/track-geometry.ts`
- [x] P04 — Tests for `src/lib/descents/validate-descent.ts`
- [x] P05 — Shared formatters in `src/lib/format.ts` (Checkpoint 1)
- [x] P06 — Difficulty single source in `src/lib/difficulty.ts`

### Block 1: Impeccable foundation
- [ ] P07 — Tokens (`globals.css`, light scheme, semantic color mappings)
- [ ] P08 — Fonts and document (Chakra Petch, es-AR, viewport zoom, metadata)
- [ ] P09 — Primitives (`Button`, `Card`, `Input`, `Textarea`, `Badge`, `Stat`, `Notice`, `Skeleton`)
- [ ] P10 — Dialog primitive (a11y modal, focus trap, Esc, scroll lock) (Checkpoint 2)
- [ ] P11 — Leaflet light theme restyle and local marker assets
- [ ] P12 — App shell (`AppHeader.tsx`, safe-area insets, container, remove 73px magic number)
- [ ] P13 — Landmarks and DB status notice restyle

### Block 2: Routing states and connectivity
- [ ] P14 — Route states (`not-found.tsx`, `error.tsx`, loading skeletons)
- [ ] P15 — `/cerro/zzz` investigation and 404 streaming status (Checkpoint 3)
- [ ] P16 — Network vs DB error handling in `use-trail-api.ts`
- [ ] P17 — Client-side Spanish error messages for descent validation
- [ ] P18 — Stuck "Guardando descenso..." TTL and retry logic

### Block 3: Screens
- [ ] P19 — Login screen poster hero and rider name hook
- [ ] P20 — Map screen difficulty pins, legend, and accessible trail list (Checkpoint 4)
- [ ] P21 — Trail detail poster header and responsive stats grid
- [ ] P22 — Trail detail mini map legend and reviews cards empty state
- [ ] P23 — Trail detail full-map overlay using `Dialog`
- [ ] P24 — Trail detail sticky CTA "Empezar descenso" with safe-area padding
- [ ] P25 — Timer layout giant mono display, progressbar, polite announcer (Checkpoint 5)
- [ ] P26 — Timer SOS swipe/double-activation confirm and emergency panel
- [ ] P27 — Result summary stats, valid/invalid stamp, Notice status
- [ ] P28 — Result review form conditional render (valid descents only), star radiogroup
- [ ] P29 — Review submission boundary (`validate-review.ts`, C10/C11 stubs, POST route)
- [ ] P30 — Leaderboard accessible table, podium top 3, rider highlight, MODO DEMO badge (Checkpoint 6)
- [ ] P31 — Leaderboard states (skeleton, empty, offline, network retry)

### Block 4: Presentation. The database, made visible
- [ ] P32 — Query catalog `src/lib/query-catalog.ts` (C1–C11 metadata and pipelines)
- [ ] P33 — Thin read-only routes (`/api/stats/*`, `/api/trails/[slug]/start-radius`)
- [ ] P34 — `/consultas` page (catalog cards, Compass copy, execution, result view)
- [ ] P35 — Interactive GIS demo on `/consultas` (C1 nearby, C2 radius, 30m circle) (Checkpoint 7)
- [ ] P36 — `/acerca` page (team, stack, data model diagram, indexes justification)

### Block M: Motion and brand
- [ ] M1 — Brand "DH" wordmark SVG and favicon
- [ ] M2 — Motion tokens and keyframes in `globals.css`
- [ ] M3 — Page transitions (View Transitions or main enter animations)
- [ ] M4 — Per-screen choreography (countUp, draw-line, countdown, stamp, podium)
- [ ] M5 — Editorial poster pass (cream/burnt-orange bands, contour texture, micro-interactions) (Checkpoint 8)

### Block 5: Quality sweep and handoff
- [ ] P37 — Accessibility sweep (keyboard path, visible focus, labeled inputs, contrast ratios)
- [ ] P38 — Responsive and copy sweep (320-1280px, voseo, es-AR dates/numbers)
- [ ] P39 — Cleanup (unused default Next assets, stale comments, dead exports)
- [ ] P40 — Final regression and handoff (3 DB states smoke-test, `docs/mongo-tarea.md`, tracker summary)

## Phase Logs
### P00 — Baseline
- Commit: `562929a`
- Touched: `odd/tasks/ui-polish.md`
- Checks: `npx tsc --noEmit` (0), `npm run lint` (0), `npm run build` (0)
- Notes: Baseline established at `08028b6`.

### P01 — Vitest
- Commit: `f46163c`
- Touched: `package.json`, `package-lock.json`, `vitest.config.ts`, `tests/smoke.test.ts`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (1 passed)
- Notes: Vitest 3.2.7 installed with `@/` alias and smoke test passing.

### P02 — Tests for gps-simulator
- Commit: `24c68d5`
- Touched: `tests/gps-simulator.test.ts`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (7 passed across 2 test files)
- Notes: Tests cover speed clamping to base ± 6, minimum speed 8 km/h, monotonic distance advancement, and total distance completion.

### P03 — Tests for track-geometry
- Commit: `748d315`
- Touched: `tests/track-geometry.test.ts`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (16 passed across 3 test files)
- Notes: Tests cover flattenPista deduplication and distances, getTotalDistanceM, getBounds, and obtenerFlechasDeDireccion bearings.

### P04 — Tests for validate-descent
- Commit: `355c09a`
- Touched: `tests/validate-descent.test.ts`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (29 passed across 4 test files)
- Notes: Tests cover valid bodies (ISO dates, timestamps, SOS flag) and all 400 validation cases (null body, missing runId/trailSlug, bad dates, non-finite/negative numbers, non-booleans).

### P05 — Shared formatters
- Commit: `a0eb6e3`
- Touched: `src/lib/format.ts`, `tests/format.test.ts`, `src/app/cerro/[id]/resultado/page.tsx`, `src/app/cerro/[id]/leaderboard/page.tsx`, `src/app/cerro/[id]/cronometro/page.tsx`, `src/app/cerro/[id]/page.tsx`, `src/hooks/use-elapsed-time.ts`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (39 passed across 5 test files)
- Notes: Centralized duration (m:ss.d), speed (km/h), distance (m), and es-AR date formatters. Replaced duplicate implementations across screens.

### P06 — Difficulty single source
- Commit: pending
- Touched: `src/lib/difficulty.ts`, `tests/difficulty.test.ts`, `src/components/track-preview/TrackMapPreview.tsx`, `src/components/mapa/MapaCerros.tsx`, `src/app/cerro/[id]/page.tsx`, `odd/tasks/ui-polish.md`
- Checks: `npm run typecheck` (0), `npm run lint` (0), `npm test` (42 passed across 6 test files)
- Notes: Centralized difficulty metadata (label, hex, cssVar). Replaced duplicated hex definitions and replaced legacy Suave/Media/Fuerte with Fácil/Intermedia/Difícil.

### Checkpoint 1 (after P05)
- Server started: `npx next start -p 3101`
- Pages:
  - `/` -> 200
  - `/mapa` -> 200
  - `/cerro/circuito-dh-pequia` -> 200
  - `/cerro/circuito-dh-pequia/leaderboard` -> 200
- API:
  - `/api/health` -> 200
  - `/api/trails` -> 200
  - `/api/trails/circuito-dh-pequia` -> 200
  - `/api/trails/circuito-dh-pequia/leaderboard` -> 200
  - `/api/trails/circuito-dh-pequia/reviews` -> 200
  - `/api/trails/nearby?lat=-32.8959&lng=-68.89533` -> 200
- Server stopped: Port 3101 confirmed clean and free.

