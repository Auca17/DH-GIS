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
- [ ] T1 — `src/lib/types.ts`: domain types (`Cerro`, `TramoPista`, `Dificultad`, `Usuario`, `Descenso`, `ResultadoDescenso`, `PuntoDescenso`).
- [ ] T2 — `src/lib/mock-data.ts`: 3-5 cerros with multi-segment `pista` (lat/lng/elevation per difficulty tramo), leaderboard entries, comments.
- [ ] T3 — `src/lib/track-geometry.ts`: flatten tramos to one ordered point list with cumulative distance + bounds helper.
- [ ] T4 — `src/lib/gps-simulator.ts`: pure functions — difficulty-based speed curve, distance integration, position/elevation interpolation over the flattened track.
- [ ] T5 — `src/lib/resultado-storage.ts`: `sessionStorage` wrapper (get/set/clear) keyed by cerro id, with a 2h expiration check.
- [ ] T6 — `src/providers/descent-provider.tsx`: `DescentContext` + reducer (`idle/corriendo/detenido`, START/TICK/STOP/SOS/RESET) + 1s simulation loop + `useDescent()` hook. SOS triggers the same STOP logic plus an interrupted flag.
- [ ] T7 — `src/hooks/use-ultimo-resultado.ts` (Context → sessionStorage fallback → empty state) and `src/hooks/use-elapsed-time.ts` (local ~200ms display tick).
- [ ] T8 — `src/components/ui/*`: `Button`, `Card`, `Input`, `RatingStars`.
- [ ] T9 — `src/app/layout.tsx`, `globals.css` pass, `src/app/page.tsx` (cosmetic login → navigates to `/mapa`).
- [ ] T10 — `src/components/mapa/MapaCerros.tsx` (Leaflet client-only via `next/dynamic`, pins for all cerros) + `src/app/mapa/page.tsx`.
- [ ] T11 — `src/components/track-preview/TrackMapPreview.tsx` (Leaflet client-only, one colored `Polyline` per tramo, auto-fit bounds).
- [ ] T12 — `src/app/cerro/[id]/layout.tsx` (mounts `DescentProvider` scoped to cerro) + `src/app/cerro/[id]/page.tsx` (info, rating, `TrackMapPreview`, comments, Play → `start()` + navigate to cronómetro).
- [ ] T13 — `src/components/cronometro/{TimerDisplay,StopButton,SosButton}.tsx` + `src/app/cerro/[id]/cronometro/page.tsx`.
- [ ] T14 — `src/components/resultado/ResumenDescenso.tsx` + `src/app/cerro/[id]/resultado/page.tsx` (reads `use-ultimo-resultado`, shows interrupted state if SOS).
- [ ] T15 — `src/components/leaderboard/TablaRanking.tsx` + `src/app/cerro/[id]/leaderboard/page.tsx` (ranking + own result highlighted + Finalizar → `reset()` + back to `/mapa`).
- [ ] T16 — Verification pass: `npm run lint`, `npm run build`, manual walkthrough (login → mapa → cerro → play → cronómetro → stop/SOS → resultado → leaderboard → finalizar; refresh on `/resultado`).

## Acceptance criteria
- Full flow navigable end-to-end with mock data, mobile-first layout.
- GPS demo mode advances speed/elevation/position credibly without real geolocation.
- Track preview on the cerro screen shows real Leaflet polylines colored blue/yellow/red by difficulty.
- Stopping normally vs. via SOS is distinguishable on the result screen.
- Refreshing on `/resultado` still shows the last result (sessionStorage fallback) or an honest empty state.
- `npm run build` passes with no TypeScript/ESLint errors.

## Progress log
- 2026-10-07: T0 done. Branch created, leaflet installed, committed (`1039f87`). Proceeding to delegate T1-T15 as one writer pass, then verification (T16) and work-unit commits by the orchestrator.
