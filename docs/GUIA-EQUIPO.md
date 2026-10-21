# Guía del equipo: qué tenemos y qué podemos hacer

Para Augustus, Nicolas, Ariel y Josefina. Leela de arriba hacia abajo: en 10 minutos sabés qué hace la app, cómo
está armada la base y qué consultas mostrar en la presentación.

## 1. La app en un párrafo

**DH** es un ranking de descensos de mountain bike. Elegís un sendero (Pequia, El Llorón o el Escarpado del
Cerro de la Gloria), bajás con el GPS del celular midiendo el tiempo, y si la corrida es válida entra al
leaderboard. Se puede usar sin cuenta en **modo demo** (simula la bajada) y con cuenta usando **GPS real**.
Está publicada en **https://dh-gis.vercel.app**.

Lo que se evalúa en la materia **no es la app**, es la base: consultas, aggregations, relaciones entre
colecciones, `$lookup`, índices (incluidos los geoespaciales) y validación. La app sirve para mostrar que todo
eso se usa de verdad.

## 2. Las dos bases (no las confundas)

| Base | Dónde está | Para qué |
|---|---|---|
| **Local** | En tu compu (MongoDB Community + Compass) | **Practicar y romper sin miedo.** Es lo que pide el profe. |
| **Atlas** | En la nube | Solo para que funcione la app publicada y para la presentación. |

Las dos tienen los mismos datos de partida, cargados por el mismo script (el *seed*). Cómo levantar la local:
[README](../README.md), sección "Practicar consultas".

## 3. Las colecciones y cómo se relacionan

| Colección | Qué guarda | Cantidad (seed) | Apunta a |
|---|---|---|---|
| `usuarios` | Riders: nombre, nivel, ciudad, desde qué año anda | 70 | — |
| `bicis` | Las bicis de cada rider (tipo, marca, recorrido) | 105 | `usuarioId` → `usuarios` |
| `senderos` | Los senderos, con sus **tramos embebidos** y la salida/meta como puntos GPS (`inicio`, `fin`) | 3 | — |
| `bajadas` | Cada bajada: tiempo, velocidad, si es válida, el rastro GPS | 20.017 | `senderoId`, `usuarioId`, `biciId` |
| `resenas` | Calificaciones de 1 a 5 estrellas de un sendero | 306 | `senderoId`, `usuarioId` (y `bajadaId` si vino de la app) |
| `sesiones` | Las sesiones abiertas (login) | las que haya | `usuarioId` → `usuarios` |

**`_id` y los campos como `usuarioId`** (otra pregunta segura):
- `_id` es la **clave primaria** del propio documento. MongoDB lo crea siempre, aunque no lo pidamos.
- `usuarioId` es la **clave foránea**: guarda el `_id` de un documento de **otra** colección (en este caso, de
  `usuarios`). Es el campo sobre el que se une con `$lookup` (`localField: "usuarioId"`, `foreignField: "_id"`).
- Es lo mismo que en SQL una tabla `bicis` con `id` (PK) y `usuario_id` (FK). Por eso una bici tiene su propio
  `_id` y además `usuarioId`.

**Embebido vs. referenciado** (pregunta segura en la defensa):
- Los **tramos** van **dentro** del sendero porque siempre se leen juntos y no crecen.
- Los **descensos** y las **reseñas** van en su propia colección y **apuntan** al sendero por su `_id`, porque
  crecen sin límite. Meter 20.000 descensos adentro de un sendero haría el documento gigante (y Mongo tiene un
  límite de 16 MB por documento).

## 4. ¿Qué son C1, C3, C10...?

Es **"Consulta 1", "Consulta 3"**, una numeración que inventamos nosotros para no decir "la consulta del ranking
con `$lookup`" cada vez. Cada una vive en su archivo en `src/lib/queries/` (por ejemplo `c3-leaderboard.ts`), y
arriba tiene un comentario con el pipeline listo para **copiar y pegar en Compass** (pestaña Aggregations).

| | Qué pregunta responde | Concepto de la materia | Dónde se ve |
|---|---|---|---|
| **C1** | ¿Qué senderos hay cerca de donde estoy? | `$geoNear` (índice 2dsphere) | Mapa |
| **C2** | ¿El rider arrancó dentro del círculo de salida? | `$geoWithin` | Servidor, al guardar un descenso (anti-trampa) |
| **C3** | ¿Quiénes son los 10 más rápidos de un sendero? | `$match` + `$sort` + `$group` + `$limit` + `$lookup` a `usuarios` | Ranking |
| **C4** | ¿Cuál es el mejor tiempo de un rider en un sendero? | `$group` con `$min` y `$sum` | Solo Compass / `npm run queries` |
| **C5** | ¿Cuántas estrellas tiene en promedio cada sendero? | `$group` con `$avg` | Página del sendero |
| **C6** | ¿Cuántos descensos tiene cada sendero (totales y válidos)? | `$group` + `$lookup` a `senderos` | Solo Compass |
| **C7** | Lista de senderos | `find` con `sort` | Mapa |
| **C8** | Un sendero por su nombre de URL | `findOne` por índice único (`codigo`) | Página del sendero |
| **C9** | Reseñas de un sendero, las más nuevas primero | `$match` + `$sort` + `$lookup` | Página del sendero |
| **C10** | Mejor tiempo por nivel (principiante, intermedio, avanzado) | `$lookup` a `usuarios` + `$group` por nivel | Solo Compass |
| **C11** | ¿Cuántos descensos hay por ciudad y cuántos riders distintos? | `$lookup` + `$group` + `$addToSet` / `$size` | Solo Compass |
| **C12** | Descensos válidos y tiempo promedio por tipo de bici | `$lookup` a `bicis` + `$avg` | Solo Compass |
| **C13** | Perfil de un rider con todas sus bicis | `$lookup` con `pipeline` | Mi perfil |

## 5. Índices: qué son y cuáles tenemos

Un índice es como el índice de un libro: en vez de leer página por página buscando algo, vas directo.

| Índice | Para qué |
|---|---|
| `senderos.inicio` **2dsphere** | Búsquedas geográficas (C1, C2). Sin él, `$geoNear` ni siquiera corre. |
| `senderos.codigo` único | Encontrar un sendero por su URL y que no haya dos iguales. |
| `bajadas` `{senderoId, estado, valida, duracion}` | El ranking (C3): filtra y ya lee los tiempos ordenados. |
| `bajadas.idCorrida` único parcial | Que la misma corrida no se guarde dos veces (doble click, reintento). |
| `resenas` `{senderoId, fecha: -1}` | Reseñas de un sendero, las más nuevas primero (C9). |
| `resenas.bajadaId` único parcial (`una_resena_por_bajada`) | Una sola reseña por bajada. |
| `usuarios.nombre` único / `usuarios.email` único parcial | Nombres y emails sin repetir. |
| `bicis` `{usuarioId, principal: -1}` | Las bicis de un rider, la principal primero. |
| `bicis.usuarioId` único parcial (solo `principal: true`, `una_bici_principal_por_usuario`) | **Una sola bici principal por rider**, la base lo garantiza. |
| `sesiones.hashToken` único | Encontrar la sesión del login. |
| `sesiones.venceEn` **TTL** | Mongo borra solo las sesiones vencidas. |

**La prueba de que sirven**: `docs/explain.md`. El ranking (C3) sin índice lee los 20.028 descensos; con
índice lee **10**. Se genera con `npm run explain`.

"Parcial" = el índice solo cubre los documentos que cumplen una condición (por ejemplo, solo los que tienen
`idCorrida`). "Único" = la base rechaza un segundo documento con el mismo valor.

## 6. Validación (`$jsonSchema`)

Todas las colecciones tienen reglas: qué campos son obligatorios, de qué tipo y qué valores aceptan (por ejemplo,
`calificacion` entre 1 y 5, `tipo` de bici solo DH, Enduro o Trail). Si alguien intenta guardar algo mal, **la base lo
rechaza** (error 121), aunque venga de Compass. Las reglas están en `scripts/seed.ts` (`VALIDATORS`).

## 7. Qué podemos hacer cada uno

**Practicar** (lo más importante):
1. Levantá la base local y cargá los datos: paso a paso en [PRACTICAR.md](PRACTICAR.md).
2. Abrí `docs/consultas-mongo.md` y hacé las consultas en la shell de Compass (mongosh).
3. Agarrá una consulta de la tabla de arriba, abrí su archivo en `src/lib/queries/`, copiá el pipeline del
   comentario y corrélo en Compass. Después cambiale algo (otro sendero, otro límite, sacá una etapa) y mirá qué pasa.
4. Probá `explain("executionStats")` vos mismo:
   ```js
   const pequia = db.senderos.findOne({ codigo: "circuito-dh-pequia" })._id
   db.bajadas.find({ senderoId: pequia, estado: "completada", valida: true })
     .sort({ duracion: 1 }).limit(10).explain("executionStats")
   ```
   Mirá `totalDocsExamined` (da 10). Después agregale `.hint({ $natural: 1 })` antes del `.explain` y compará
   (da unos 20.000). Ojo: si sacás `senderoId` del filtro, el índice no se puede usar, porque **empieza** por
   `senderoId`. Es como buscar en una guía telefónica ordenada por apellido cuando solo sabés el nombre.

**Comandos útiles** (en la carpeta del proyecto):

| Comando | Qué hace |
|---|---|
| `npm run seed` | Carga los datos de ejemplo en la base que diga tu `.env.local` (la local, si seguiste el README). |
| `npm run queries` | Imprime en la terminal los resultados de C1 a C6 y C10 a C12. |
| `npm run explain` | Mide los índices (siempre en la base local) y actualiza `docs/explain.md`. |
| `npm run dev` | Levanta la app en http://localhost:3000. |

**Repartirse la presentación** (sugerencia): cada uno se adueña de 3 o 4 consultas y las sabe explicar etapa por
etapa sin mirar. Así si el profe pregunta "¿qué hace este `$unwind`?" siempre hay alguien que la tiene clara.

## 8. Glosario rápido

- **Pipeline**: la lista de etapas de una aggregation. Cada etapa recibe lo que sale de la anterior.
- **`$match`**: filtra (como el `WHERE` de SQL). Conviene ponerlo primero, así usa índices.
- **`$group`**: agrupa y calcula (`$sum`, `$avg`, `$min`, `$addToSet`).
- **`$lookup`**: trae documentos de otra colección (como un `JOIN`).
- **`$unwind`**: convierte un array en un documento por elemento (después de un `$lookup` el resultado es un array).
- **`$project`**: elige qué campos mostrar y con qué nombre.
- **2dsphere**: índice para coordenadas sobre la Tierra. GeoJSON guarda `[longitud, latitud]`, al revés de como lo decimos.
- **COLLSCAN / IXSCAN**: en un `explain`, "leí toda la colección" vs. "usé un índice".
- **TTL**: índice que borra documentos solos cuando vence una fecha.
