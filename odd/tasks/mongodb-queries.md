# Feature: MongoDB local — queries C1 to C6

## Objective
Implement the six key queries over the local MongoDB database (seed data), one function per query in `src/lib/queries/`, each with its Compass-pasteable pipeline documented, plus `npm run queries` to print all results.

## Scope
- In scope: `src/lib/queries/*`, `scripts/queries.ts`, `package.json` script.
- Out of scope: screens, API routes, UI, GPS, wiring the UI to the database.

## Constraints
- Branch `feat/mongodb`, no push, `main` untouched. One commit per query.
- Do not read or print `.env.local`. Do not delete data.
- TDD: not configured. Checks: `npx tsc --noEmit`, `npx eslint`, `npm run queries` output.

## Tasks
- [x] T0 — Base commits: docs cleanup, client, health check, seed. Commits: `0fe697b`, `9d651f4`.
- [x] C1 — Nearby trails (`$geoNear`). Commit: `e7d2743`.
- [x] C2 — Inside start radius (`$geoWithin` + `$centerSphere`). Commit: `ef8e8b9`.
- [x] C3 — Top-N leaderboard (`$match` + `$sort` + `$limit` + `$lookup`). Commit: `e018887`.
- [x] C4 — Personal best (`$group` + `$min`). Commit: `6c6e854`.
- [x] C5 — Average rating per trail (`$group` + `$avg`). Commit: `4b4be6a`.
- [x] C6 — Descents per trail (`$group` + `$lookup`). Commit: `2ba9741`.

## Verification
- `tsc --noEmit` and `eslint` pass after every query.
- `npm run queries` output checked against seed data; C3 excludes the SOS (21.0 s) and the invalid time (31.0 s).
- Pending: pasting each pipeline in Compass by hand (no mongosh available to automate it).

## Next step
User review of the six queries; then wire Route Handlers / UI to the database (separate step).

## Acceptance
- `npm run queries` prints all six results; C3 excludes the SOS and the invalid descent.
