# Save descent with server-side validation

## Objective
When a descent ends, save it to `descents` through `POST /api/descents`. The server validates it; too-fast runs are saved as invalid and never enter the leaderboard (C3). Demo runs are saved with `isDemo: true` and shown with a "DEMO" tag.

## Decisions
- Test user: new seed user `"Demo rider"` (an existing rider would get their best time overwritten in C3, which shows one row per rider).
- Every run is simulated today (no real GPS yet), so every run is saved with `isDemo: true`.
- `minValidTimeS` per trail lives in `trails` (seed). Pequia: 30. Others are placeholders.
- Demo runs in the leaderboard: one constant in C3 (`INCLUDE_DEMO_RUNS`).
- Double-POST protection: each run carries a `runId`; the server upserts by it.

## Constraints
- No GPS logic or visual design changes beyond the messages and the DEMO tag.
- Do not delete data or collections. No commits until the user approves.
- TDD: off (no test runner). Checks: lint, tsc, build, manual POST tests.

## Tasks
- [x] T1 Seed: `minValidTimeS` on every trail, `"Demo rider"` user.
- [x] T2 `POST /api/descents`: validation (400), offline (503), too-fast → invalid, SOS → interrupted.
- [x] T3 C3: `isDemo` in the output + `INCLUDE_DEMO_RUNS`; leaderboard shows "DEMO".
- [x] T4 Result screen: POST once per run, show invalid / offline messages.
- [x] T5 Checks: 4 s run (invalid), 45 s run (valid), offline POST; lint, tsc, build.

## Progress
T1-T5 done and observed: seed (minValidTimeS, Demo rider, unique partial index on descents.runId), POST /api/descents, C3 isDemo + INCLUDE_DEMO_RUNS, result and leaderboard screens, lint/tsc/build exit 0, POST checks (4 s invalid, 45 s valid, repeated runId no duplicate, 0 ms and missing field 400, SOS interrupted, offline 503). Test descents left in the database: check-fast-1, check-ok-1, check-sos-1.
Not verified in a browser: the result/leaderboard screens (only API and type/build checks).

## Next step
User tries a full simulated run in the browser, then decides on commits and on the test descents.
