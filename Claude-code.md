# Contexto de sesión: DH Leaderboard (MongoDB local + Atlas, publicado en Vercel)

> Archivo para retomar el trabajo en otra sesión. Leelo entero antes de seguir.
> Última actualización: 2026-10-19. Rama de trabajo: `main` (publicado en **https://dh-gis.vercel.app**).

## 1. Qué es el proyecto

Leaderboard de descensos de mountain bike (DH) medidos con GPS, en Next.js 16.4 (App Router, `cacheComponents: true`, Turbopack) + TypeScript + Tailwind + Leaflet. Proyecto académico de **Diseño de Bases de Datos (Universidad de Mendoza)**. Equipo: Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli.

Documentos de referencia en el repo:
- `CLAUDE.md`: decisión del docente y reglas de trabajo (sección "Base de datos"). **Manda sobre todo lo demás.**
- `README.md`: cómo levantar todo, base local vs Atlas, cuentas, bicis, reseñas, `npm run explain`.
- `REVISION.md`: **pendientes conocidos** (leerlo antes de arrancar).
- `docs/PRACTICAR.md`: instalación paso a paso para que el equipo practique en su base local.
- `docs/GUIA-EQUIPO.md`: guía para el equipo (colecciones, índices, qué es cada consulta C1–C13, glosario).
- `docs/consultas-mongo.md`: guía de estudio de consultas para mongosh.
- `docs/explain.md`: reporte de índices sin/con índice (lo genera `npm run explain`).

## 2. Reglas (resumen de CLAUDE.md y del usuario)

- **Practicar y evaluar en MongoDB local** + Compass. **Atlas** solo para la app publicada y la presentación, por `MONGODB_URI`.
- Se evalúa: consultas, aggregations, relaciones, `$lookup`, índices, índices geoespaciales, validación.
- La "presentación" es informal: sentarse con el profe, explicar lo que hicieron y correr alguna consulta en mongosh. No hace falta guion ni pantalla de estadísticas (descartado: las consultas se muestran en mongosh).
- Driver oficial `mongodb`, **sin Mongoose**. Cada consulta tiene que poder pegarse en Compass.
- Código simple y explicable (son estudiantes).
- **Un paso por vez**: explicar en simple, cómo probarlo en el navegador y en Compass. Esperar el OK.
- **No commitear sin aprobación; push y merge a `main` solo cuando el usuario lo pide** (mostrando antes la lista de commits).
- No borrar datos ni colecciones del usuario.
- Modo demo tiene que andar sí o sí, sin cuenta y sin GPS. Mongo caído: mensaje claro, nunca pantalla rota.
- Conventional commits, **sin** `Co-Authored-By` ni atribución de IA.
- Respuestas cortas, una pregunta por vez, en español rioplatense. Código y comentarios en inglés; textos de pantalla y docs del equipo en español.
- Para trabajos grandes el usuario pide **un plan para Gemini** ("Gemini solo codea, no piensa"): implementarlo y probarlo primero en una copia del proyecto en el scratchpad, generar el plan desde ese código probado (archivos enteros o buscar/reemplazar exactos, un commit por paso) y aplicarlo sobre un clon limpio para verificar que coincide. Al volver, comparar la rama de Gemini contra la copia probada.

## 3. Gotchas del entorno

- **No leer ni imprimir `.env*`.** El `.env.local` del usuario **apunta a Atlas** (host `dh.35crots.mongodb.net`, confirmado 2026-10-19) y **no existe `.env.production`**: en su compu `npm run seed` carga Atlas y `npm run seed:prod` falla. Para ver a qué base apunta sin mostrar la contraseña: `node --env-file=.env.local -e "console.log(new URL(process.env.MONGODB_URI).host)"` (que lo corra el usuario). Para la base local: `MONGODB_URI="mongodb://127.0.0.1:27017/dh" npx tsx scripts/seed.ts`. `npm run explain` tiene la URI local fija.
- El clasificador de permisos bloquea borrar datos y leer Atlas desde la terminal: pedírselo al usuario (comando para la shell de Compass).
- El servicio Windows `MongoDB` se inicia/detiene con `Start-Service` / `Stop-Service MongoDB` en PowerShell de administrador. Versión local: 8.0.
- El usuario suele tener `npm run dev` en el puerto **3000**. No lo cierres. Usá otro puerto y cerralo al terminar (`taskkill /PID … /T /F`).
- Copia del proyecto en el scratchpad: `git clone` + copiar `node_modules` con `robocopy /E /MT:32` (un junction rompe Turbopack; si usás junction, borralo con `rmdir`, nunca `rm -rf`). En la copia, `next build` falla en `/_global-error` (también sin cambios): usar `next dev`. Si `tsc` no encuentra `RouteContext`/`LayoutProps`, correr `npx next typegen`.
- Con `cacheComponents: true`: datos con `await connection()`; Next no desmonta páginas (`<Activity>`), por eso el GPS vive en `DescentProvider`; `cookies()` es async. Un `notFound()`/`redirect()` dentro de `<Suspense>` no puede cambiar el status (ya salió el 200): las redirecciones fijas van en `next.config.ts`.
- Lint con reglas del React Compiler: no llamar `setState` directo en el cuerpo de un efecto. `npm run lint` **ya falla** con 7 problemas ajenos: correr lint solo sobre los archivos tocados.
- El repo no usa Prettier. No hay `mongosh` en la terminal: usar `node -e` con el driver o scripts `tsx`.
- En Git Bash, rutas que empiezan con `/` como argumento se convierten: usar `MSYS_NO_PATHCONV=1`.
- Vercel: el conector MCP no puede crear proyectos en `aucas-projects`; el usuario lo hace desde el panel.

## 4. Lo que está hecho

- **GPS real**, anti-trampa en el servidor (`src/lib/descents/descent-rules.ts`), cuentas con contraseña (scrypt) y sesión en cookie httpOnly, bicis (una sola principal por índice único parcial), seed con volumen (70 riders, 105 bicis, 20.017 descensos, 306 reseñas) en local y Atlas.
- **2026-10-18/19 (`feat/mejoras`, mergeado):** `npm run explain` + `docs/explain.md`; `$jsonSchema` en todas las colecciones (`users`, `bikes`, `sessions`, `trails`, `descents`, `reviews`); reseñas reales desde la pantalla de resultado (`POST /api/reviews`, solo descenso propio, válido y con GPS real, índice único parcial `one_review_per_descent`); reenvío del guardado "pendiente" a los 30 s; mensajes de la API en español; ids viejos redirigidos en `next.config.ts`.
- 2026-10-19: Atlas recargado con el seed (validadores en todas las colecciones e índice `one_review_per_descent`; el usuario de la base volvió a "Read and write"). Descensos `check-*` borrados de la local.
- Consultas C1–C13 en `src/lib/queries/` (tabla en `docs/GUIA-EQUIPO.md`). 170 tests (`npx vitest run`), `tsc` limpio.
- **2026-10-21 (`feat/espanol-db`, mergeado):** base en español (`usuarios`, `senderos`, `bajadas`, `resenas`, `bicis`, `sesiones`; campos como `usuarioId`, `duracion`, `principal`, `estado: "completada"`). Sin `source` (riders del seed = usuarios sin email), sin `createdAt` en bicis, sin `path`/radios/`visibleOnMap`/`dataSource` en senderos, sin `null` en bajadas sin bici. El código y los cuerpos de la API siguen en inglés. Pendiente del usuario: borrar las colecciones viejas en inglés (local y Atlas) y volver a registrar sus cuentas.

## 5. Lo que falta

1. **El usuario:** probar su cuenta y una corrida con GPS real en el cerro.
2. Freeride guardado en Mongo (colección `rides` con `LineString`), opción B acordada.
3. Después de la presentación: sacar `0.0.0.0/0` de Atlas y cambiar la contraseña del usuario de la base (y en Vercel).

## 6. Cómo retomar

1. Leer `CLAUDE.md`, este archivo y `REVISION.md`.
2. `git status` y `git log --oneline -12` en `main`.
3. Confirmar Mongo local: `MONGODB_URI="mongodb://127.0.0.1:27017/dh" npx tsx scripts/queries.ts` imprime las tablas.
4. Seguir el pedido del usuario, de a un paso, y esperar el OK.
