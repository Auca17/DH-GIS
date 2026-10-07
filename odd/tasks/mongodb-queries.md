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
- [ ] T0 — Base commits: docs cleanup, client, health check, seed.
- [ ] C1 — Nearby trails (`$geoNear`).
- [ ] C2 — Inside start radius (`$geoWithin` + `$centerSphere`).
- [ ] C3 — Top-N leaderboard (`$match` + `$sort` + `$limit` + `$lookup`).
- [ ] C4 — Personal best (`$group` + `$min`).
- [ ] C5 — Average rating per trail (`$group` + `$avg`).
- [ ] C6 — Descents per trail (`$group` + `$lookup`).

## Acceptance
- `npm run queries` prints all six results; C3 excludes the SOS and the invalid descent.
