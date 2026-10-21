@AGENTS.md

Contexto de la última sesión (qué se hizo, en qué paso estamos y qué falta): @Claude-code.md

## Base de datos

### Decisión del docente (Diseño de Bases de Datos, Universidad de Mendoza)

- Usamos MongoDB LOCAL (Community Server) + Compass. Solo base local, ningún servicio en la nube.
- El objetivo de la materia es aplicar lo cursado: consultas, aggregations, relaciones entre colecciones, conteos cruzados con `$lookup`, índices e índices geoespaciales. Es lo que se evalúa.
- Se pueden usar todas las colecciones que queramos. GIS / geolocalización está dentro de lo esperado.
- El modo demo tiene que funcionar sí o sí (la presentación probablemente sea en un aula).
- La documentación se hace AL FINAL. Primero el proyecto funcionando.

### Reglas de trabajo

1. Conexión: `MONGODB_URI=mongodb://127.0.0.1:27017/dh` en `.env.local` (y `.env.example` sin secretos). Cliente singleton en `src/lib/mongodb.ts`. Ninguna base en la nube en código, README ni comentarios.
   - Excepción (2026-10-17): para publicar en Vercel se usa MongoDB Atlas, **solo** por variable de entorno (`MONGODB_URI` en Vercel y en `.env.production`, ambos fuera de git). El código no cambia: es el mismo driver y las mismas consultas. Desarrollo y evaluación de la cátedra siguen en local.
   - Cambiar de base = cambiar solo `MONGODB_URI` (tabla en `README.md`, sección "Base local o MongoDB Atlas"). Presentación: app en Vercel + Compass conectado a Atlas; plan B: `npm start` contra la base local. `npm run seed:prod` (lee `.env.production`) carga Atlas con el mismo script y los mismos datos que `npm run seed`. La URI de Atlas tiene que terminar en `/dh`.
2. Driver oficial `mongodb`, sin Mongoose, así las consultas quedan visibles y se parecen a lo que escribimos en Compass.
3. Colecciones y campos **en español** (2026-10-21): `usuarios`, `senderos`, `bajadas`, `resenas`, `bicis`, `sesiones`. Embebemos lo que se lee junto (`tramos` dentro de `senderos`) y referenciamos lo que crece (`bajadas`, `resenas` apuntan a `senderoId`/`usuarioId`; `bicis` apunta a `usuarioId`; `bajadas` apunta a `biciId`). Todas tienen validación `$jsonSchema` (se aplica en `scripts/seed.ts`). Sin campo `source`: los riders del seed son los `usuarios` sin email. El código (variables, funciones, cuerpos de la API) sigue en inglés; solo la base y las salidas de las consultas van en español.
4. Índices (con comentario de por qué cada uno): `senderos` 2dsphere en `inicio`, único en `codigo`; `bajadas` `{senderoId, estado, valida, duracion}` y único parcial en `idCorrida`; `resenas` `{senderoId, fecha: -1}` y único parcial en `bajadaId`; `usuarios` único en `nombre` y único parcial en `email`; `bicis` `{usuarioId, principal: -1}` y único parcial en `usuarioId` con `principal: true` (una sola bici principal); `sesiones` único en `hashToken` y TTL en `venceEn`.
   - Registro con contraseña (scrypt de `node:crypto`), sesión en cookie httpOnly. Mongo no tiene RLS: cada ruta filtra por el `userId` de la sesión, nunca por uno que mande el cliente.
5. Las consultas importantes viven en `src/lib/queries/`, una función por consulta, con un comentario arriba que diga: qué hace, en lenguaje de Compass (el pipeline equivalente) y qué concepto de la materia ilustra:
   - C1 senderos cercanos (`$geoNear`)
   - C2 ¿estoy dentro del radio de salida? (`$near` / `$geoWithin`)
   - C3 ranking top-N por sendero (`$match` + `$sort` + `$limit` + `$lookup` a `users`)
   - C4 mejor tiempo personal (`$group`)
   - C5 promedio de calificación por sendero (`$group` + `$avg`)
   - C6 cantidad de descensos por sendero (`$lookup` + `$count` / `$group`)
   - C10 mejor tiempo por nivel en un sendero (`$lookup` a `users` + `$group` por nivel)
   - C11 descensos por ciudad (`$lookup` + `$group` + `$addToSet`/`$size`)
   - C12 descensos válidos por tipo de bici (`$lookup` a `bikes` + `$avg`)
   - C13 perfil con sus bicis (`$lookup` con `pipeline` de `users` a `bikes`)

   Cada consulta debe poder copiarse y pegarse en Compass (pestaña Aggregations).
6. Código simple y legible: somos estudiantes y tenemos que poder explicar cada línea. Claridad antes que "elegancia".
7. Un paso por vez. Al terminar cada paso: qué se hizo, cómo probarlo en el navegador y cómo verlo en Compass. Esperar OK antes de seguir.
8. No tocar la UI ni la lógica de GPS salvo que el paso lo pida. No hacer commits sin aprobación.
9. El modo demo no puede depender de que Mongo esté andando de forma frágil: si la base no responde, mostrar un mensaje claro, no una pantalla rota.
