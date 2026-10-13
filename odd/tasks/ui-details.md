# UI details: about page, rated map popup, downhill branding, leaderboard polish

## Objective
Make the presentation UI more attractive (Impeccable light theme) before the team moves on to the MongoDB work.

## Problem / why
After the Gemini run (P00–P13) the app looks clean but plain. The user asked for:
- An "about us" page (`/acerca`) listing the team in this exact order: Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli, with a few standout details.
- Stars next to the trail name on the first click of a map pin (Google Maps style).
- Animations and downhill bike imagery.
- Leaderboard column "Bici" renamed to "Tipo" (every entry is a bike).

## Scope and constraints
- No MongoDB code changes (queries, seed, `mongodb.ts`, `trail-data.ts`, descents route).
- No real photos: no downloads (licensing and permission). Use original inline SVG illustrations instead.
- Every animation respects `prefers-reduced-motion`.
- UI copy in Rioplatense Spanish; code and comments in English.
- `/consultas` (the MongoDB query panel) is NOT built here: it belongs to the MongoDB phase. Its nav link is hidden until the page exists.
- TDD: off (no project/session setting). Checks per task: `npm run typecheck && npm run lint && npm test`. `npm run build` at the end.

## Tasks
- [x] T1 — Route states from Gemini P14: replace `<Link><Button>` (nested interactive) with links styled via a shared `buttonClassName`; commit P14.
- [x] T2 — Brand and motion: `DhLogo`, `DownhillRider` SVG illustration, motion keyframes + reduced-motion in `globals.css`; header uses the logo, default rider "Vos", hide "Consultas" until it exists.
- [x] T3 — Login poster hero with the animated rider.
- [x] T4 — Map popup: name with stars to its right, difficulty badge, styled CTA.
- [x] T5 — Leaderboard: "Tipo" column, podium accents, row stagger, DEMO badge.
- [x] T6 — `/acerca` page: team in order, animated mountain with a rider descending the trail, how the database is organized.

## Acceptance criteria
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
- Walkthrough in the browser (production build): login → map (popup with stars) → trail → leaderboard ("Tipo") → `/acerca`; no console errors besides tile loads.
- Team names appear in the requested order.

## Progress
| Task | Commit | Checks |
|---|---|---|
| T1 route states | `a2bf488` | typecheck, lint, test (69) |
| T2 brand + motion | `9c653de` | typecheck, lint, test (69) |
| T3 login hero | `c427e42` | typecheck, lint, test (69) |
| T4 map popup | `995ab11` | typecheck, lint, test (69) |
| (found while doing T5) date bug | `3dd0a70` | new test fails before / passes after (TZ Mendoza) |
| T5 leaderboard | `8dfa1ba` | typecheck, lint, test (70) |
| T6 about page | `35fcc82` | typecheck, lint, test (70), `npm run build` (15 routes) |

Browser walkthrough on `next start` (desktop + 375px): login → header shows the typed name → map pin popup (name + 4.5 ★ to its right, close button no longer overlaps) → leaderboard (podium, "Tipo") → `/acerca` (team order verified via DOM, rider follows the trail). No horizontal overflow at 375px. No console errors on the final build.

## Decisions
- No photos: original SVG illustration (`DownhillRider`) instead of downloaded images (licensing, no downloads).
- Rider name is stored in localStorage (`dh_rider`) because the header (from Gemini P12) already reads it there.
- Nav link "Consultas" hidden until `/consultas` exists (MongoDB phase); "Acerca" label shown as "Nosotros".
- `formatDate` bug: bare `YYYY-MM-DD` strings were parsed as UTC midnight (one day early in Mendoza); fixed to local date.

## Next step
MongoDB phase (the user writes the queries): see `docs/consultas-mongo.md` and `docs/Gemini.md` sections P29/P32–P35 for the pieces that depend on the database.
