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
2. Driver oficial `mongodb`, sin Mongoose, así las consultas quedan visibles y se parecen a lo que escribimos en Compass.
3. Colecciones: `users`, `trails`, `descents`, `reviews`. Embebemos lo que se lee junto (tramos dentro de `trails`) y referenciamos lo que crece (`descents`, `reviews` apuntan a `trailId`/`userId`).
4. Índices (con comentario de por qué cada uno): `trails` 2dsphere en `start`, único en `slug`; `descents` `{trailId, status, validated, durationMs}`; `reviews` `{trailId, createdAt: -1}`.
5. Las consultas importantes viven en `src/lib/queries/`, una función por consulta, con un comentario arriba que diga: qué hace, en lenguaje de Compass (el pipeline equivalente) y qué concepto de la materia ilustra:
   - C1 senderos cercanos (`$geoNear`)
   - C2 ¿estoy dentro del radio de salida? (`$near` / `$geoWithin`)
   - C3 ranking top-N por sendero (`$match` + `$sort` + `$limit` + `$lookup` a `users`)
   - C4 mejor tiempo personal (`$group`)
   - C5 promedio de calificación por sendero (`$group` + `$avg`)
   - C6 cantidad de descensos por sendero (`$lookup` + `$count` / `$group`)

   Cada consulta debe poder copiarse y pegarse en Compass (pestaña Aggregations).
6. Código simple y legible: somos estudiantes y tenemos que poder explicar cada línea. Claridad antes que "elegancia".
7. Un paso por vez. Al terminar cada paso: qué se hizo, cómo probarlo en el navegador y cómo verlo en Compass. Esperar OK antes de seguir.
8. No tocar la UI ni la lógica de GPS salvo que el paso lo pida. No hacer commits sin aprobación.
9. El modo demo no puede depender de que Mongo esté andando de forma frágil: si la base no responde, mostrar un mensaje claro, no una pantalla rota.
