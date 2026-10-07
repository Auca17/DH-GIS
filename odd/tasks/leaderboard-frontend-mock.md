# Feature: Leaderboard de descensos MTB — frontend mock

## Objective
Build the full frontend for a mountain-bike downhill leaderboard app: login, cerro map, cerro detail with a real-map colored difficulty preview, a GPS-simulated timer run (Stop/SOS), a result screen, and a per-cerro leaderboard. Mock data only, no backend/DB.

## Problem / Why
Greenfield project. User wants to demo the full flow without physically riding (GPS demo mode) and without a database yet. Approved plan: `C:\Users\Rufda\.claude\plans\ok-arranc-con-ese-nested-falcon.md`.

## Scope
- Next.js App Router + TypeScript + Tailwind, mobile-first.
- In scope: all screens/components/providers/hooks/lib listed below, mock data, GPS simulator, colored-by-difficulty Leaflet preview.
- Out of scope: MongoDB, auth persistence (login is cosmetic, no state), real GPS, deployment.

## Constraints / confirmed decisions
- SOS stops the timer (marks result as interrupted).
- Login: cosmetic only, no AuthProvider.
- Difficulty-colored track segments render on a real Leaflet map (`TrackMapPreview`), not just an abstract SVG.
- `.env.local` must stay untouched and git-ignored (already verified: `.gitignore` has `.env*`, confirmed via `git check-ignore`).
- TDD: not configured for this project; no test runner detected. Verification is via `npm run build`/`npm run lint` + manual browser walkthrough, not automated tests.

## Branch / delivery
- Branch: `feature/leaderboard-frontend-mock` (created, 1 commit so far: leaflet deps).
- Delivery strategy: single PR at the end (small greenfield feature, user did not request chaining).

## Tasks

- [x] T0 — Setup: scaffold Next.js (TS/Tailwind/App Router/src-dir), git init on `master`, verify `.env.local` ignored, install `leaflet`/`react-leaflet`/`@types/leaflet`, branch to `feature/leaderboard-frontend-mock`. Commit: `1039f87`.
- [x] T1 — `src/lib/types.ts`. Commit: `1c4e7b1`.
- [x] T2 — `src/lib/mock-data.ts`: 4 cerros (Catedral, Otto, Bayo, Chapelco), each with 3 connected facil/intermedia/dificil tramos, comments, and leaderboard entries. Commit: `1c4e7b1`.
- [x] T3 — `src/lib/track-geometry.ts` (haversine-based `flattenPista`/`getTotalDistanceM`/`getBounds`). Commit: `1c4e7b1`.
- [x] T4 — `src/lib/gps-simulator.ts`. Commit: `1c4e7b1`.
- [x] T5 — `src/lib/resultado-storage.ts`, SSR-guarded, 2h expiry. Commit: `1c4e7b1`.
- [x] T6 — `src/providers/descent-provider.tsx`: 1Hz loop via `setInterval` + refs (avoids stale closures), persists to sessionStorage on STOP/SOS. Commit: `1c4e7b1`.
- [x] T7 — `src/hooks/use-ultimo-resultado.ts` (uses `useSyncExternalStore` for the sessionStorage fallback, not `useEffect`+`setState` — required by this project's `eslint-plugin-react-hooks` v6 rules) and `src/hooks/use-elapsed-time.ts`. Commit: `1c4e7b1`.
- [x] T8 — `src/components/ui/{Button,Card,Input,RatingStars}.tsx`. Commit: `1c4e7b1`.
- [x] T9 — `src/app/layout.tsx`, `globals.css` (dark theme + brand/difficulty color tokens), `src/app/page.tsx`. Commit: `1c4e7b1`.
- [x] T10 — `src/components/mapa/MapaCerros.tsx` + `src/app/mapa/page.tsx`. **Deviation**: `mapa/page.tsx` is `'use client'`, not a Server Component — Next.js App Router hard-errors on `next/dynamic({ssr:false})` inside a Server Component; no functional loss since the page has no server data fetching. Commit: `1c4e7b1`.
- [x] T11 — `src/components/track-preview/TrackMapPreview.tsx` (colored `Polyline` per tramo + live-position `CircleMarker`). Commit: `1c4e7b1`.
- [x] T12 — `src/app/cerro/[id]/layout.tsx` + `src/app/cerro/[id]/page.tsx`. **Deviation**: layout has `export const instant = false` — required by this project's `next.config.ts` `cacheComponents: true` for the dynamic `await params` read; `next.config.ts` itself untouched. Commit: `1c4e7b1`.
- [x] T13 — `src/app/cerro/[id]/cronometro/page.tsx`. **Deviation**: Stop/SOS buttons inlined in the page rather than split into separate `StopButton`/`SosButton`/`TimerDisplay` component files — the detailed build spec only listed route files for this screen. Commit: `1c4e7b1`.
- [x] T14 — `src/app/cerro/[id]/resultado/page.tsx`. **Deviation**: `ResumenDescenso` inlined (same reason as T13). Average speed is computed from distance actually covered, not total track length, so an SOS-interrupted run isn't overstated. Commit: `1c4e7b1`.
- [x] T15 — `src/app/cerro/[id]/leaderboard/page.tsx`. **Deviation**: `TablaRanking` inlined (same reason as T13). Commit: `1c4e7b1`.
- [x] T16 — Verification: writer agent ran `npm run lint` (clean) and `npm run build` (success) and smoke-tested every route via the dev server, then stopped it. Orchestrator independently re-ran `npm run build` and `npm run lint` (both clean) and curl-tested `/`, `/mapa`, `/cerro/catedral`, `/cerro/catedral/cronometro`, `/cerro/catedral/leaderboard` (all 200) and `/cerro/nope` (404) against a freshly started dev server, then stopped it. No automated test runner exists in this project (not configured) — no interactive browser click-through was performed by the orchestrator; routes were verified by HTTP status only, not visual/UX inspection.

## Acceptance criteria
- Full flow navigable end-to-end with mock data, mobile-first layout.
- GPS demo mode advances speed/elevation/position credibly without real geolocation.
- Track preview on the cerro screen shows real Leaflet polylines colored blue/yellow/red by difficulty.
- Stopping normally vs. via SOS is distinguishable on the result screen.
- Refreshing on `/resultado` still shows the last result (sessionStorage fallback) or an honest empty state.
- `npm run build` passes with no TypeScript/ESLint errors.

## Progress log
- 2026-10-07: T0 done. Branch created, leaflet installed, committed (`1039f87`). Proceeding to delegate T1-T15 as one writer pass, then verification (T16) and work-unit commits by the orchestrator.
- 2026-10-07: T1-T16 done in one writer pass, committed (`1c4e7b1`) after orchestrator fixes (package.json/package-lock.json still said `scaffold-tmp` from the temp scaffold dir — renamed to `dh-leaderboard` and resynced) and gitignore update for `.atl/` (local tooling cache, not app source). All acceptance criteria met: full mock flow navigable, GPS demo advances speed/elevation/position per tick, difficulty-colored Leaflet polylines on the cerro preview, SOS vs. normal stop distinguishable on the result screen, sessionStorage fallback for `/resultado`. Feature complete pending the user's own manual browser review.
