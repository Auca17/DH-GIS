# Gemini — Implementation plan: "DH" UI/UX polish (45 phases)

> You are an autonomous coding agent working **unattended** for about one hour.
> Claude Code will review your work afterwards, commit by commit.
> Read this whole file before writing any code. Follow it in order.

---

## 0. Context

**DH** is a downhill mountain bike (MTB) leaderboard built for the course "Diseño de Bases de Datos" (Universidad de Mendoza). It is a **classroom presentation**, not a real product. There is no real GPS: every run is simulated (demo mode) and that is intentional.

| Item | Value |
|---|---|
| Framework | Next.js **16.4** (App Router, `cacheComponents: true`, Turbopack) |
| UI | TypeScript, Tailwind **v4** (tokens in `src/app/globals.css`, no `tailwind.config`), Leaflet + react-leaflet |
| Database | **Local MongoDB**, official `mongodb` driver (no Mongoose), database `dh` |
| Branch | `feat/mongodb`. Work **only here** |
| Review base | commit `08028b6` (the HEAD before your run) |

Already working: map → trail → simulated timer → result → leaderboard. Screens read MongoDB through queries C1–C9 (`src/lib/queries/`). Descents are saved with server-side validation (`POST /api/descents`). When Mongo is down the app falls back to mock data with a clear notice.

**What gets graded:** only the MongoDB connectivity, the queries, and the team's technical knowledge. Your job is to make the app look **10/10** and to make the database work **visible and explainable** (the `/consultas` and `/acerca` pages). **The team writes all new MongoDB queries by hand.** You never do.

---

## A. Read first (mandatory)

1. `CLAUDE.md`, `AGENTS.md`, `Claude-code.md`: project rules and session context.
2. `REVISION.md`: known pending issues.
3. `DH-especificacion-claude-code.md`: the full spec (screens, rules, checklist in section 12).
4. `node_modules/next/dist/docs/`: **Next 16 differs from your training data.** Read the parts about:
   - `cacheComponents`
   - `connection()`
   - `<Suspense>` in layouts
   - `not-found` / `error` / `loading`
   - View Transitions
   - metadata
5. Skim these before touching them:
   - `src/providers/descent-provider.tsx` (state machine + simulation)
   - `src/hooks/use-is-visible.ts` (Leaflet + `<Activity>` workaround)

### Known environment gotchas

- **Hidden routes are not unmounted.** Next hides inactive routes with `<Activity>`: effects are cleaned up on hide and run again on show.
  - **Every** Leaflet map must use `useIsVisible()`, like the existing maps do.
- **`useSyncExternalStore` needs a stable snapshot.** Return the raw string and parse it with `useMemo` (see `src/hooks/use-ultimo-resultado.ts`).
- **Database reads in Next** go through `load()` in `src/lib/data/trail-data.ts`, which calls `await connection()`.
- **Dev doubles requests.** Every GET runs twice under React Strict Mode in dev. That is normal.
- **Line endings and formatting.** The repo uses **CRLF** line endings and has **no Prettier**. Do not reformat lines you did not change.
- **No standalone `mongosh`.** To probe the DB, use `npm run queries` or `node --env-file=.env.local -e "..."`. Never print the env file.
- **One `next dev` per folder.** Next refuses a second `next dev` in the same folder, and the user may already have one running on port 3000.
  - Use `npm run build` + `npx next start -p 3101` (or 3102…) instead.
  - **Always kill it** when you finish.

---

## B. Hard rules (violating one means: stop that phase, revert it, and log it)

### B1. Read-only files: never modify them

- `src/lib/queries/**`: every **existing** file (c1…c9)
- `src/lib/mongodb.ts`
- `scripts/seed.ts`, `scripts/queries.ts`, `scripts/generar-pequia.mjs`
- `src/lib/data/trail-data.ts`
- `src/app/api/descents/**`
- `src/lib/descents/validate-descent.ts`
- `src/lib/gps-simulator.ts` (logic). Adding tests for it is fine.
- Anything about indexes, `$jsonSchema`, or collection validators

### B2. New database access: stubs only

When a feature needs a query that does not exist yet:

1. Create a **new** stub file in `src/lib/queries/` (`c10-*.ts`, `c11-*.ts`, …).
2. Its exported function must `throw new NotImplementedError("<name>")`. Put `NotImplementedError` in `src/lib/errors.ts`.
3. Put this comment block on top, in English (the team fills in the body):

```ts
/*
 * C10 — <title>
 * TODO(mongo-tuyo): implement this query by hand.
 *
 * What it must do: <one paragraph>
 * Contract: <inputs, output type, edge cases>
 * Course concept: <$match / $lookup / ...>
 * Hint (Compass → Aggregations), NOT the final answer:
 *   [ { $match: { ... } }, ... ]
 */
```

4. Route handlers that call a stub must catch `NotImplementedError` and answer **HTTP 501** with a Spanish message. The UI must show that message gracefully.

### B3. Never

- Read or print `.env`, `.env.local`, or any `.env*` file.
- Delete documents, collections, or indexes. Run `npm run seed` only if the database is completely empty.
- `git push`, touch `main`, or rebase or rewrite history.
- Add `Co-Authored-By` or any AI attribution to commits.
- Run Prettier or any formatter over whole files.
- Add dependencies other than **Vitest** (and `@vitest/coverage-v8` if you want). There are **no animation libraries**: use CSS and native View Transitions.
- Rename routes (`/cerro/[id]`, `/mapa`, …) or existing identifiers.
- Implement real GPS or `navigator.geolocation`.
- Use Google Maps or any cloud service.

### B4. Language

- **Code, comments, identifiers, commit messages:** English.
- **UI copy:** Rioplatense Spanish with voseo ("Elegí", "Tocá", "Mirá"), concise and confident.

### B5. Resilience

- If Mongo is down or the network fails, show a clear message. **Never** show a broken screen.
- Demo mode must always work.

### B6. Ask-free mode

Nobody will answer your questions. When something is ambiguous:

1. Choose the **safest, smallest** option.
2. Write it under `## Decisions` in `odd/tasks/ui-polish.md`.
3. Continue.

---

## C. Per-phase protocol (follow it for **every** phase)

1. **Implement** the smallest coherent change for the phase.
2. **Validate after every phase** (from P01 on):
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
3. **Checkpoint every 5 phases.** It is mandatory after **P05, P10, P15, P20, P25, P30, P35, M5, P40**:
   1. `npm run build`
   2. Start `npx next start -p 3101` in the background and wait until it answers.
   3. Use `curl -s -o /dev/null -w "%{http_code}"` on every page and every GET API route:
      - Pages: `/`, `/mapa`, `/cerro/circuito-dh-pequia`, `/cerro/circuito-dh-pequia/leaderboard`, `/consultas`, `/acerca` (once the last two exist).
      - API: `/api/health`, `/api/trails`, `/api/trails/circuito-dh-pequia`, `.../leaderboard`, `.../reviews`, `/api/trails/nearby?lat=-32.8959&lng=-68.89533`, and every new `/api/stats/*` route.
      - Expect **200**, or the documented 503 when the DB is off.
   4. Kill the server and confirm that port 3101 is free.
   5. Append `### Checkpoint N` to `odd/tasks/ui-polish.md` with every status code.
   6. If anything fails, **fix it before the next phase.**
4. **Commit** once per phase with a Conventional Commit, for example `feat(ui): add accessible dialog primitive`, `test(gps): cover simulator speed clamps`, or `style(map): restyle leaflet controls for light theme`.
5. **Log** the phase in `odd/tasks/ui-polish.md`: phase id, commit hash, files touched, the checks you ran with their **real** results, and anything left open.
6. **Failure policy:** if a phase still fails its checks after 2 attempts:
   1. `git restore`/revert that phase only.
   2. Mark it `BLOCKED: <reason>`.
   3. Continue with the next phase that does not depend on it.
   - Never fake a passing check.

---

## D. Design system: Impeccable (light), brand "DH"

**Intent in one sentence:** a modern, graphic, editorial-poster interface, warm and confident, built on alternating cream and burnt-orange bands with an amber brand color. It should read well on a classroom projector and in sunlight.

### D1. Tokens (`src/app/globals.css`, `:root` + `@theme inline`)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#FBF6EC` (cream) | page background |
| `--surface` | `#FFFFFF` | cards |
| `--surface-muted` | `#F3EADB` | secondary panels, table stripes |
| `--border` | `#E2D5BF` | hairlines |
| `--text` | `#111827` | body text |
| `--text-muted` | `#4B5563` | secondary text (≥ 4.5:1 on cream) |
| `--primary` | `#CC8800` (amber) | fills only, **with dark text** (#111827, about 6:1) |
| `--primary-ink` | `#7A5200` | amber-toned **text** on light backgrounds |
| `--secondary` | `#C55221` (burnt orange) | bands and secondary buttons, **with white text** |
| `--success` | `#16A34A` | valid run, saved |
| `--warning` | `#D97706` | offline notice (dark text on top) |
| `--danger` | `#DC2626` | SOS, errors |
| `--diff-facil` / `--diff-intermedia` / `--diff-dificil` | `#2563EB` / `#EAB308` / `#DC2626` | difficulty, **always paired with a text label** |

- **Never** put amber `#CC8800` text on cream or white: it fails WCAG AA. Use `--primary-ink` for that.
- **Never** use opacity-faded text (`text-foreground/40` and similar) for content. Replace every one of them with `--text-muted`.

### D2. Typography

- **Chakra Petch** (`next/font/google`, weights 400/500/600/700) for display **and** body, exposed as `--font-display` and `--font-sans`.
- **JetBrains Mono** (already loaded) for every number: times, speeds, distances, pipeline code.
- **Type scale:** 12 / 14 / 16 / 20 / 24 / 32, plus display sizes 48 / 72 / 96 for hero titles and the timer.
- **Minimum body text:** 14px. 12px is allowed only for labels with `--text` color. No `text-[10px]`.

### D3. Spacing, shape, and interaction

- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 (plus 48 / 64 for section rhythm). Don't use one-off values.
- **Shape:** radius 4 (controls) and 12 (cards). The poster bands are full-bleed with no radius.
- **Touch targets:** at least 44×44px.
- **Focus:** `:focus-visible` ring 2px `--text` + 2px offset on **every** interactive element.
- **States:** every interactive component explicitly defines default, hover, focus-visible, active, disabled, and (where relevant) loading and error.

### D4. Motion (phase block M)

- **Durations:** 120 / 200 / 320 / 600 ms.
- **Easings:** `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)`.
- **Animate only** `transform` and `opacity`, plus `stroke-dashoffset` for line drawing.
- **Required:** `@media (prefers-reduced-motion: reduce)` disables every non-essential animation.

### D5. Copy glossary (UI)

| Use | Not |
|---|---|
| sendero | cerro (in visible copy), pista |
| descenso | corrida, bajada (as a noun for a run) |
| opinión | comentario, review |
| Fácil / Intermedia / Difícil | Suave / Media / Fuerte |
| MODO DEMO | Demo, simulado (as badge) |
| tiempo `m:ss.d` (e.g. `0:49.8`) | mixed formats |
| dates `es-AR` (e.g. `12 sep 2026`) | ISO strings |

---

## E. Phases

### Block 0: Setup and safety net

- **P00 — Baseline.**
  1. Confirm the branch is `feat/mongodb`, never `main`. `git status` must show only `prompt.md` and `docs/` as changed or untracked; leave those alone and do not commit them.
  2. Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`.
  3. Create `odd/tasks/ui-polish.md` with: objective, review base `08028b6`, baseline results, an empty `## Decisions`, and the phase checklist.
  4. Commit `docs(odd): start ui polish tracker`.
- **P01 — Vitest.**
  - Add `vitest` as a dev dependency.
  - Add scripts `"test": "vitest run"` and `"typecheck": "tsc --noEmit"`.
  - Add `vitest.config.ts` with the `@/` alias.
  - Add one smoke test.
- **P02 — Tests for `src/lib/gps-simulator.ts`:** speed clamped to base ±6 and to at least 8 km/h, distance monotonic, completion at total distance. Mock `Math.random`.
- **P03 — Tests for `src/lib/track-geometry.ts`:** `flattenPista`, `getTotalDistanceM`, `getBounds`, `obtenerFlechasDeDireccion`.
- **P04 — Tests for `src/lib/descents/validate-descent.ts`:** SOS, too fast, valid, and each 400 case. Write **tests only**; the file is read-only.
- **P05 — Shared formatters.**
  - Extract the duplicated `formatearMs` (in the resultado and leaderboard pages) into `src/lib/format.ts`.
  - Provide: `formatDuration(ms)` → `m:ss.d`, `formatSpeed(kmh)`, `formatDistance(m)`, `formatDate(date)` in `es-AR`.
  - Use them everywhere. Add tests. → **Checkpoint 1**
- **P06 — Difficulty single source.**
  - Create `src/lib/difficulty.ts` with label, CSS variable, and hex for Leaflet.
  - Use it in `cerro/[id]/page.tsx`, `TrackMapPreview.tsx`, and `MapaCerros.tsx`.
  - Remove the duplicated hex values and the Suave/Media/Fuerte labels.

### Block 1: Impeccable foundation

- **P07 — Tokens.**
  - Rewrite `src/app/globals.css` with section D1 and the motion tokens from D4 (keyframes come in M2).
  - Switch `color-scheme` to `light`.
  - Replace every `foreground/NN` opacity text color in the app with semantic tokens.
- **P08 — Fonts and document.**
  - Load Chakra Petch in `src/app/layout.tsx`.
  - Set `<html lang="es-AR">`.
  - **Remove `maximumScale: 1`**, because it blocks pinch zoom and is an accessibility failure.
  - Metadata: `title: { default: "DH", template: "%s · DH" }`, plus a Spanish description.
- **P09 — Primitives** (`src/components/ui/`):
  - `Button`: variants `primary` (amber fill, dark text), `secondary` (burnt orange, white text), `danger`, and `ghost`. Sizes `md`/`lg`. Support a `loading` prop with a spinner and `aria-busy`. **Remove the forced uppercase.**
  - `Card`, `Input` (label required).
  - New: `Textarea` (label and optional counter), `Badge` (`difficulty`, `demo`, `success`, `warning`, `danger`, `neutral`), `Stat` (label, value, unit), `Notice` (`info`, `warning`, `error`, `success`, with `role="status"` or `role="alert"`), and `Skeleton`.
- **P10 — `Dialog` primitive.**
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  - Esc closes it, focus is trapped, focus returns to the trigger, and the body scroll is locked.
  - Unit-test any pure helper. → **Checkpoint 2**
- **P11 — Leaflet theme.**
  - Restyle popups, controls, and attribution in `globals.css` for the light theme, and cut `!important` to the minimum.
  - Serve the marker icons from `public/leaflet/` instead of unpkg: copy them from `node_modules/leaflet/dist/images/`.
- **P12 — App shell.**
  - Create `src/components/layout/AppHeader.tsx` with the DH wordmark placeholder (finished in M1), nav links (Mapa, Consultas, Acerca, using `aria-current`), and the rider's name.
  - Use safe-area insets (`env(safe-area-inset-*)`).
  - Add a `max-w-6xl` container for desktop, plus one shared header height token.
  - **Remove** the `calc(100dvh - 73px)` magic number in `src/app/mapa/page.tsx`.
- **P13 — Landmarks and DB notice.**
  - Only pages render `<main>`. `DbStatusNotice` and the Suspense fallbacks use `<section>`/`<div>`.
  - Restyle `DbStatusNotice` with `Notice`. The empty-DB message must still mention `npm run seed`.

### Block 2: Routing states and connectivity

- **P14 — Route states.**
  - Add `not-found.tsx`, `error.tsx` (a client component with "Reintentar"), and loading UIs at the app root and under `src/app/cerro/[id]/`.
  - Style them and write them in Spanish.
  - Check the Next 16 docs for how they behave with `cacheComponents` and `<Suspense>`.
- **P15 — `/cerro/zzz` returns 200 (`REVISION.md` item 1).**
  - Timebox it to about 20 minutes.
  - Find out why the layout's `notFound()` inside `<Suspense>` streams 200.
  - Fix it only if you can do so **without** touching `trail-data.ts` or the queries.
  - Either way, document the cause and what you tried in `REVISION.md`. → **Checkpoint 3**
- **P16 — Network vs DB errors (`REVISION.md` item 2).**
  - `src/hooks/use-trail-api.ts` must tell three cases apart: `fetch` rejected (network), 503 (Mongo offline), and other errors.
  - Expose a `retry()` function.
  - Screens show a `Notice` with a "Reintentar" button.
- **P17 — Spanish error messages (`REVISION.md` item 4).**
  - Map the English 400/404/503 responses of `POST /api/descents` to Spanish **on the client**, in `use-guardar-descenso.ts` or a helper. **Do not change the route.**
- **P18 — Stuck "Guardando descenso…" (`REVISION.md` item 6).**
  - Give the sessionStorage pending marker in `use-guardar-descenso.ts` a timestamp and a TTL of about 15 s.
  - A stale marker lets the save retry.
  - Extract the logic into a pure function and test it.

### Block 3: Screens

- **P19 — Login (`src/app/page.tsx`).**
  - Full-bleed poster hero: cream background, burnt-orange band, giant "DH" display type, a one-line pitch ("Medí tus descensos. Competí en el ranking.").
  - Name field stored through a new `src/hooks/use-rider-name.ts` (sessionStorage, stable snapshot).
  - Password field stays cosmetic and gets the hint "Demo: cualquier clave sirve".
  - Primary CTA "Entrar".
- **P20 — Map (`src/app/mapa/page.tsx`, `src/components/mapa/MapaCerros.tsx`).**
  - Pins colored by difficulty, plus a floating difficulty legend.
  - Under or beside the map: an accessible list of trail cards (name, difficulty badge, length, drop, average rating if already loaded). Each card links to the trail. This is the keyboard and screen-reader alternative to the pins.
  - Placeholder trails carry an "Ejemplo" badge. → **Checkpoint 4**
- **P21 — Trail: header and stats** (`src/app/cerro/[id]/page.tsx`).
  - Poster header: name in display type, difficulty `Badge`, rating stars and count.
  - Stats in a responsive grid: 2 columns at 320px, 3 at ≥ 375px, 5 at ≥ 768px. Use `Stat` with proper units (m, %, s).
- **P22 — Trail: mini map and reviews.**
  - Difficulty legend using `difficulty.ts`.
  - Reviews list as cards (author, stars, date, text) with an empty state ("Todavía no hay opiniones. ¡Sé el primero en bajar!").
- **P23 — Trail: full-map overlay.** Replace the ad-hoc overlay `div` with `Dialog` (title "Mapa del sendero", close button with a label).
- **P24 — Trail: sticky CTA.**
  - The "Jugar" bar becomes "Empezar descenso".
  - It is safe-area aware and has 44px targets.
  - Small pills are raised to 44px. Add bottom padding so the content never hides behind the bar.
- **P25 — Timer layout** (`src/app/cerro/[id]/cronometro/page.tsx`).
  - Giant mono timer at display size, a responsive stats row (speed, altitude, distance), and a visible **MODO DEMO** badge.
  - The progress bar gets `role="progressbar"` with `aria-valuenow`/`min`/`max`.
  - Add a visually hidden `aria-live="polite"` region that announces **only state changes** (start, stop, SOS), never every tick. → **Checkpoint 5**
- **P26 — Timer SOS.**
  - Swipe-right-to-confirm control: pointer and touch drag past 80% of the track confirms.
  - Keyboard fallback: focus the control and press Enter twice, or use a separate "Confirmar SOS" button that appears after the first activation.
  - After SOS, show an emergency panel: "Emergencias: 911" with a `tel:911` link and "Volver al sendero".
  - Use the **existing** SOS action of `DescentProvider`. Do not change the GPS logic.
- **P27 — Result summary** (`src/app/cerro/[id]/resultado/page.tsx`).
  - `Stat` cards: time, average speed, drop.
  - A big validity stamp:
    - Valid: "Descenso válido".
    - Invalid: "Descenso no válido", with a Spanish reason (`"too fast"` → "Demasiado rápido para ser real", SOS → "Interrumpido por SOS").
  - Save status through `Notice`: saving, saved, offline (the existing 503 message), and error.
- **P28 — Result review form.**
  - **Render the form only when the descent is valid.** This is a pending user request. Invalid runs show a short note instead ("Las opiniones solo se habilitan con un descenso válido").
  - Rating is a `radiogroup` of 5 stars (arrow keys, `aria-checked`).
  - Comment uses a labeled `Textarea` with a 500-character counter.
- **P29 — Review submission (Mongo boundary).**
  - `src/lib/reviews/validate-review.ts`: rating integer 1–5, comment trimmed and 1–500 characters, slug required. Add tests.
  - New stub `src/lib/queries/c10-has-valid-descent.ts`: `hasValidDescent(slug, displayName): Promise<boolean>`. Contract: true only if the user has a descent on that trail with `status: "completed"` and `validated: true`.
  - New stub `src/lib/queries/c11-insert-review.ts`: `insertReview(input): Promise<{ insertedId: string }>`. Contract: insert into `reviews` with `trailId`, `userId`, `rating`, `comment`, `createdAt`, `source: "app"`.
  - New route `POST /api/trails/[slug]/reviews` (keep the existing GET in the same file working):
    1. Validate the body; invalid → 400 in Spanish.
    2. Call `hasValidDescent`; false → 403 "Solo podés opinar después de un descenso válido".
    3. Call `insertReview`; success → 201.
    4. `NotImplementedError` → **501** "Guardar opiniones todavía no está disponible".
    5. Mongo down → 503.
  - The result page posts the review and shows each outcome with `Notice`. Runs are saved as "Demo rider"; send that name.
- **P30 — Leaderboard table** (`src/app/cerro/[id]/leaderboard/page.tsx`).
  - Table structure: `<caption>`, `<th scope="col">`, and a horizontal-scroll wrapper on mobile (`overflow-x-auto` + `tabIndex=0` + label).
  - Top 3 get a podium treatment (gold, silver, and bronze accents plus a position number; never color alone).
  - Highlight the rider's own row with their name from `use-rider-name` (fall back to "Vos"). Remove the duplicated "(vos)".
  - Show the `MODO DEMO` badge on demo runs, use the shared time format, and show "—" with an `aria-label` for a missing bike type. → **Checkpoint 6**
- **P31 — Leaderboard states:** loading skeleton, empty ("Todavía no hay descensos válidos en este sendero"), offline, and network error with retry.

### Block 4: Presentation. The database, made visible (the graded part)

- **P32 — Query catalog: `src/lib/query-catalog.ts`.** One entry per C1…C9, plus C10/C11 marked "pendiente":
  - `id`, `title` (Spanish), `collection`, and `concept` (Spanish, one sentence).
  - `tags`, for example `["$geoNear", "2dsphere"]` or `["$group", "$lookup"]`.
  - `pipeline`: the Compass text, **copied verbatim** from the header comment of each query file. Do not edit those files.
  - `index`: which index it uses, if any.
  - `endpoint`: the GET route that runs it.
  - `defaultParams`: Pequia slug `circuito-dh-pequia`, start `lat -32.8959, lng -68.89533`, rider `Lucas R.`.
- **P33 — Thin read-only routes.** Add them only for queries without an endpoint. Each one **only calls the existing function**, runs `isDbAvailable()` first, and returns 503 like the existing routes:
  - `GET /api/stats/personal-best?slug=&rider=` → `getPersonalBest` (C4)
  - `GET /api/stats/ratings` → `getAverageRatings` (C5)
  - `GET /api/stats/descents-per-trail` → `getDescentsPerTrail` (C6)
  - `GET /api/trails/[slug]/start-radius?lat=&lng=&radiusM=` → `isInsideStartRadius` (C2)
  - Validate the query params, returning 400 in Spanish.
- **P34 — `/consultas` page** (`src/app/consultas/page.tsx`).
  - Poster header: "Consultas MongoDB", with a subtitle explaining that each card is a real query against the local `dh` database.
  - One card per catalog entry:
    - Title, collection badge, concept tags, and the index used.
    - Pipeline in a mono code block with a "Copiar para Compass" button (Clipboard API, with a confirmation).
    - Editable params (inputs) and an "Ejecutar" button.
    - The result as a table when it is tabular, otherwise pretty JSON.
    - Elapsed ms, and states for loading, offline (503), and 501 (C10/C11: "Pendiente: la implementa el equipo").
- **P35 — Interactive GIS demo on `/consultas`.**
  - A Leaflet map (with `useIsVisible`) where clicking a point:
    1. Calls `/api/trails/nearby` (C1) and lists trails with their distance.
    2. Calls `start-radius` (C2) for Pequia and shows "Dentro / Fuera del radio de salida".
    3. Draws a 30 m circle around Pequia's start and the clicked point.
  - Include a "Ir a la salida de Pequia" button so the "inside" case is easy to show in class. → **Checkpoint 7**
- **P36 — `/acerca` page** (static, `src/app/acerca/page.tsx`).
  - Team: Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli. Course and university.
  - Stack: Next.js 16, local MongoDB with the official driver, Leaflet.
  - Data model: the 4 collections (`users`, `trails`, `descents`, `reviews`) as a simple SVG or HTML diagram showing the references, plus the rule "embed what is read together (segments inside trails), reference what grows (descents, reviews → trailId/userId)".
  - Indexes, one line of justification each. Read them from `scripts/seed.ts` comments (read-only):
    - 2dsphere `trails.start`
    - unique `trails.slug`
    - unique `users.displayName`
    - `descents {trailId, status, validated, durationMs}`
    - partial unique `descents.runId`
    - `reviews {trailId, createdAt:-1}`
  - "Cómo correr la demo": start the MongoDB service, `npm run seed`, `npm run dev`, open the app.

### Block M: Motion and brand (Impeccable to the max)

- **M1 — Brand "DH".**
  - `src/components/brand/DhLogo.tsx`: an SVG wordmark, bold Chakra Petch "DH" with a slanted downhill stroke or contour line in amber and burnt orange.
  - Use it in the header and the login hero, and add `src/app/icon.svg` as the favicon.
- **M2 — Motion tokens and keyframes in `globals.css`:**
  - `fade-up`, `scale-in`, `shimmer` (skeleton), `pulse-soft`, `draw-line` (`stroke-dashoffset`), `rise` (podium), `stamp` (validity stamp).
  - Utility classes plus `--stagger` support via the `style={{ "--i": n }}` pattern.
  - The global reduced-motion override.
- **M3 — Page transitions.**
  - Check the Next 16 docs for View Transitions support (`viewTransition` / React `<ViewTransition>`).
  - If it is supported and stable, cross-fade route changes and morph the trail name from the map card to the trail header.
  - Otherwise use CSS enter animations on `<main>`. Log the decision.
- **M4 — Per-screen choreography:**
  - Login: hero letters rise and the band slides in.
  - Map: trail cards stagger with `fade-up`, and pins drop in.
  - Trail: stats count up (a `useCountUp` hook built on `requestAnimationFrame`, respecting reduced motion) and the mini-map track draws in.
  - Timer: a "3 · 2 · 1 · ¡Ya!" countdown overlay **before** dispatching the existing START action (UI only, no logic change), `pulse-soft` on the clock while running, and swipe-track feedback for SOS.
  - Result: numbers count up, and the valid/invalid `stamp` animation plays.
  - Leaderboard: the podium rises and the rows stagger.
  - `/consultas`: the result panel expands, the copy button morphs to a checkmark, and a tiny "running" indicator shows during fetch.
- **M5 — Editorial poster pass.**
  - Alternating cream and burnt-orange full-bleed bands on the login, map header, trail header, `/consultas`, and `/acerca`.
  - A subtle topographic contour SVG pattern (inline, low-contrast) as the texture on hero bands.
  - Oversized display numerals (the leaderboard position and the result time).
  - Hover and press micro-interactions on cards and buttons: `translateY(-2px)` with a shadow and an active press. → **Checkpoint 8**

### Block 5: Quality sweep and handoff

- **P37 — Accessibility sweep.** Go through every page:
  - Keyboard-only path through the whole flow.
  - Visible focus everywhere.
  - Every input labeled.
  - No color-only signals.
  - Headings in order (one `h1` per page).
  - Compute the contrast ratio of every text/background token pair you use and list them in the tracker. All must be ≥ 4.5:1 (≥ 3:1 for large text and UI components).
- **P38 — Responsive and copy sweep.**
  - Check 320, 375, 768, and 1280px for overflow (stats rows, tables, timer).
  - Apply the copy glossary (D5) everywhere, with voseo, `es-AR` dates and numbers, and no English in the UI.
- **P39 — Cleanup.**
  - Remove the unused default Next SVGs in `public/`, the stale comment at `src/lib/types.ts:36`, and dead code or unused exports.
  - Lint, typecheck, and tests must be clean.
- **P40 — Final regression and handoff.**
  1. Run `npm run typecheck && npm run lint && npm test && npm run build`.
  2. Smoke-test with `next start -p 3101` in three DB states. The env var overrides `.env.local`:
     - With data: the normal start.
     - Mongo off: `MONGODB_URI=mongodb://127.0.0.1:27999/dh npx next start -p 3102`. You should see the offline notice and demo mode still working.
     - Empty: `MONGODB_URI=mongodb://127.0.0.1:27017/dh_empty_check npx next start -p 3103`. You should see the "run seed" message.
     - Kill every server.
  3. Update `REVISION.md`: close what you fixed and list what remains.
  4. Write `docs/mongo-tarea.md`, the team's MongoDB homework, in Spanish:
     - Implement C10 `hasValidDescent` and C11 `insertReview`, with the file paths and contracts.
     - `$jsonSchema` validators for `trails` and `descents`. Note that app descents have `bikeType: null`, `isDemo`, `runId`, and `source: "app"`.
     - The volume seed: tens of thousands of `source: "seed"` descents.
     - `explain("executionStats")` before and after the indexes for at least 3 queries.
     - Pending decisions:
       - The test descents `check-fast-1`, `check-ok-1`, `check-sos-1`.
       - `minValidTimeS` for Cantera, Zampal, and Quebrada Seca.
       - `INCLUDE_DEMO_RUNS`.
     - Point to `docs/consultas-mongo.md` for practice.
  5. Write the final summary in `odd/tasks/ui-polish.md`:
     - The phase → commit table.
     - BLOCKED phases.
     - Decisions.
     - Checkpoint results.
     - What Claude Code should look at first.
  6. Last commit: `docs: close ui polish run`.

---

## F. Out of scope (do not do)

- Real GPS, geolocation, proximity rules on real devices, or Google login.
- **Any new MongoDB query body**, aggregation, index, validator, or seed change. These are the team's work; create stubs only.
- Deleting data, including the test descents.
- README, pull requests, push.

---

## G. Definition of done

- About 46 commits on `feat/mongodb` after `08028b6`, one per phase, each logged in `odd/tasks/ui-polish.md`.
- This must print **only** the new `c10-*` / `c11-*` stub files:
  ```bash
  git diff 08028b6..HEAD --stat -- src/lib/queries src/lib/mongodb.ts scripts src/lib/data src/app/api/descents src/lib/descents src/lib/gps-simulator.ts
  ```
- `npm run typecheck && npm run lint && npm test && npm run build` all pass.
- The full demo flow works with data, with Mongo off, and with an empty DB, and never shows a broken screen.
- `/consultas` runs C1–C9 live and copies each pipeline for Compass. `/acerca` explains the model and the indexes.
- No port left open (3101–3103), no `.env*` read, no push.
