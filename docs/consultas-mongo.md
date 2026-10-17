# Consultas MongoDB — base `dh` (guía de estudio y práctica)

Guía para escribir y ejecutar consultas contra la base local `dh` del proyecto DH. Todo está pensado para pegarse en la **shell mongosh integrada en MongoDB Compass**.

Cada consulta explica:

- **Responde:** qué pregunta contesta.
- **Código:** listo para pegar.
- **Concepto:** qué tema de la materia muestra.

> Regla del proyecto: **no se borran datos ni colecciones**. Las secciones 1 a 7 solo leen. Las escrituras (sección 9) se practican en una base aparte, `dh_practica`.

---

## Índice

1. [Cómo abrir la shell](#1-cómo-abrir-la-shell)
2. [El modelo de datos en 1 minuto](#2-el-modelo-de-datos-en-1-minuto)
3. [Inspección](#3-inspección)
4. [find: filtros, proyección, orden](#4-find-filtros-proyección-orden)
5. [Geoespaciales (GIS)](#5-geoespaciales-gis)
6. [Aggregations](#6-aggregations)
7. [Las consultas de la app (C1–C9)](#7-las-consultas-de-la-app-c1c9)
8. [Índices y explain](#8-índices-y-explain)
9. [Validación con $jsonSchema](#9-validación-con-jsonschema)
10. [Escrituras (con cuidado, en dh_practica)](#10-escrituras-con-cuidado-en-dh_practica)
11. [Ejercicios](#11-ejercicios)

---

## 1. Cómo abrir la shell

1. Abrí **MongoDB Compass** y conectate a `mongodb://127.0.0.1:27017`.
2. Abajo de todo está la barra **`>_MONGOSH`**. Hacé clic para expandirla.
3. Elegí la base:

```js
use dh
```

En esta guía usamos variables para no copiar ObjectIds a mano. **Pegalas primero cada vez que abras la shell:**

```js
const pequia = db.trails.findOne({ slug: "circuito-dh-pequia" })
const lucas  = db.users.findOne({ displayName: "Lucas R." })
const demo   = db.users.findOne({ displayName: "Demo rider" })
// Salida de Pequia en formato GeoJSON: [longitud, latitud]
const salidaPequia = [-68.89533, -32.8959]
```

> **GeoJSON va al revés de como lo decimos:** primero la **longitud** y después la **latitud**. Es el error más común con datos geográficos.

En la pestaña **Aggregations** de Compass se pega solo el array `[ ... ]` del pipeline. En la shell se usa `db.coleccion.aggregate([ ... ])`.

---

## 2. El modelo de datos en 1 minuto

| Colección | Qué guarda | Campos clave |
|---|---|---|
| `users` | Riders (11, incluye "Demo rider") | `displayName` (único), `createdAt`, `source` |
| `trails` | Senderos (4; solo Pequia es real) | `slug` (único), `name`, `difficulty` (`facil`/`intermedia`/`dificil`), `terrain`, `start`/`end` (GeoJSON Point), `path` (GeoJSON LineString), `segments[]` (embebidos: `difficulty`, `points[]`), `stats` (`lengthM`, `dropM`, `avgGradePct`, `avgTimeS`), `minValidTimeS`, `startRadiusM`, `endRadiusM`, `isPlaceholder`, `visibleOnMap` |
| `descents` | Cada bajada | `trailId` → trails, `userId` → users, `startedAt`, `durationMs`, `avgSpeedKmh`, `elevationChangeM`, `bikeType` (`DH`/`Enduro`/`Trail`, o `null` en las de la app), `status` (`completed`/`interrupted`), `validated`, `invalidReason`, `source` (`seed`/`app`), `isDemo`, `runId` |
| `reviews` | Opiniones | `trailId` → trails, `userId` → users, `rating` (1–5), `comment`, `createdAt`, `source` |

**Decisión de diseño:**

- **Embebemos lo que se lee junto.** Los tramos (`segments`) viven dentro del sendero.
- **Referenciamos lo que crece sin límite.** `descents` y `reviews` guardan `trailId` y `userId`, y se unen con `$lookup`.

---

## 3. Inspección

**Responde:** qué hay en la base.
**Concepto:** exploración del esquema flexible de MongoDB.

```js
show collections

db.users.countDocuments()
db.trails.countDocuments()
db.descents.countDocuments()
db.reviews.countDocuments()

// Un documento de ejemplo de cada colección
db.trails.findOne({}, { segments: 0, path: 0 })   // sin los campos pesados
db.descents.findOne()

// Valores distintos de un campo
db.descents.distinct("bikeType")
db.descents.distinct("invalidReason")
db.descents.distinct("source")

// Qué índices tiene cada colección
db.trails.getIndexes()
db.descents.getIndexes()
db.reviews.getIndexes()
db.users.getIndexes()
```

> `distinct("invalidReason")` muestra `"SOS"` (seed) y `"sos"` (app) escritos distinto. Es un buen ejemplo de por qué conviene validar el esquema (sección 9).

---

## 4. find: filtros, proyección, orden

### 4.1 Igualdad y proyección

**Responde:** el sendero Pequia, mostrando solo algunos campos.
**Concepto:** filtro por igualdad + proyección (`1` incluye, `0` excluye).

```js
db.trails.find(
  { slug: "circuito-dh-pequia" },
  { _id: 0, name: 1, difficulty: 1, terrain: 1, stats: 1 }
)
```

### 4.2 Comparación: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`

**Responde:** los descensos de más de 60 segundos.
**Concepto:** operadores de comparación.

```js
db.descents.find(
  { durationMs: { $gt: 60000 } },
  { _id: 0, durationMs: 1, bikeType: 1, status: 1 }
)
```

**Responde:** los descensos entre 50 y 55 segundos.

```js
db.descents.find({ durationMs: { $gte: 50000, $lte: 55000 } })
```

### 4.3 `$in` y `$nin`

**Responde:** los descensos hechos en bici de DH o Enduro.
**Concepto:** pertenencia a un conjunto.

```js
db.descents.find({ bikeType: { $in: ["DH", "Enduro"] } }).count()
```

### 4.4 `$and`, `$or`, `$not`

**Responde:** los descensos no válidos o interrumpidos.
**Concepto:** operadores lógicos.

```js
db.descents.find({
  $or: [ { validated: false }, { status: "interrupted" } ]
}, { _id: 0, durationMs: 1, status: 1, validated: 1, invalidReason: 1 })
```

> Dos condiciones sobre campos distintos en el mismo objeto ya son un AND implícito: `{ status: "completed", validated: true }`.

### 4.5 `$exists` y `$type`

**Responde:** los descensos guardados desde la app (los únicos que tienen `runId`).
**Concepto:** esquema flexible, porque no todos los documentos tienen los mismos campos.

```js
db.descents.find({ runId: { $exists: true } })
db.descents.find({ bikeType: { $type: "null" } })   // las corridas de la app guardan bikeType: null
```

### 4.6 `$regex`

**Responde:** los senderos cuyo nombre empieza con "Bajada" (sin importar mayúsculas).
**Concepto:** búsqueda por patrón.

```js
db.trails.find({ name: { $regex: "^bajada", $options: "i" } }, { _id: 0, name: 1 })
```

### 4.7 Campos embebidos (notación punto)

**Responde:** los senderos de más de 1000 m de largo.
**Concepto:** consultar dentro de subdocumentos.

```js
db.trails.find({ "stats.lengthM": { $gt: 1000 } }, { _id: 0, name: 1, "stats.lengthM": 1 })
```

### 4.8 Arrays de subdocumentos: `$elemMatch` y `$size`

**Responde:** los senderos que tienen al menos un tramo difícil.
**Concepto:** consultar dentro de arrays embebidos.

```js
db.trails.find({ "segments.difficulty": "dificil" }, { _id: 0, name: 1 })

// $elemMatch: un MISMO elemento del array cumple todas las condiciones
db.trails.find(
  { segments: { $elemMatch: { difficulty: "dificil" } } },
  { _id: 0, name: 1 }
)

// Senderos con exactamente 3 tramos
db.trails.find({ segments: { $size: 3 } }, { _id: 0, name: 1 })
```

### 4.9 Fechas

**Responde:** los descensos de septiembre de 2026.
**Concepto:** rangos de fechas con `ISODate`.

```js
db.descents.find({
  startedAt: { $gte: ISODate("2026-09-01T00:00:00-03:00"), $lt: ISODate("2026-10-01T00:00:00-03:00") }
}).count()
```

### 4.10 `sort`, `limit` y `skip` (paginación)

**Responde:** los 5 descensos más rápidos, y después la "página 2".
**Concepto:** orden y paginación.

```js
db.descents.find({ validated: true }, { _id: 0, durationMs: 1 }).sort({ durationMs: 1 }).limit(5)
db.descents.find({ validated: true }, { _id: 0, durationMs: 1 }).sort({ durationMs: 1 }).skip(5).limit(5)
```

### 4.11 Usando una referencia

**Responde:** todos los descensos de Lucas R.
**Concepto:** las referencias son ObjectIds. Primero buscás el `_id` y después filtrás.

```js
db.descents.find({ userId: lucas._id }, { _id: 0, durationMs: 1, startedAt: 1, validated: 1 })
```

---

## 5. Geoespaciales (GIS)

El proyecto tiene un índice **2dsphere** en `trails.start`. Sin ese índice, `$near`, `$nearSphere` y `$geoNear` **fallan**. En cambio, `$geoWithin` y `$geoIntersects` funcionan sin índice, aunque más lento.

### 5.1 `$near`: senderos más cercanos a un punto

**Responde:** qué senderos tienen la salida a menos de 5 km de mi posición, del más cercano al más lejano.
**Concepto:** consulta de proximidad sobre índice 2dsphere. Las distancias van en **metros**.

```js
db.trails.find(
  {
    start: {
      $near: {
        $geometry: { type: "Point", coordinates: salidaPequia },
        $maxDistance: 5000
      }
    }
  },
  { _id: 0, name: 1 }
)
```

### 5.2 `$nearSphere`

**Responde:** lo mismo que 5.1, calculado siempre sobre la esfera.
**Concepto:** diferencia entre geometría plana y esférica. Con GeoJSON y 2dsphere, los dos dan lo mismo.

```js
db.trails.find(
  { start: { $nearSphere: { $geometry: { type: "Point", coordinates: salidaPequia }, $maxDistance: 5000 } } },
  { _id: 0, name: 1 }
)
```

### 5.3 `$geoWithin` + `$centerSphere`: ¿estoy dentro del radio?

**Responde:** si la salida de Pequia está dentro de un círculo de 30 m alrededor de mi posición. Es la regla para habilitar "Empezar".
**Concepto:** pertenencia a un área. `$centerSphere` usa el radio en **radianes**: `metros / 6378100`.

```js
db.trails.find({
  slug: "circuito-dh-pequia",
  start: { $geoWithin: { $centerSphere: [ salidaPequia, 30 / 6378100 ] } }
}, { _id: 0, name: 1 })
// Un resultado = adentro. Cero resultados = afuera.
```

Para ver el caso "afuera", probá con un punto a unos 100 m de distancia:

```js
db.trails.find({
  slug: "circuito-dh-pequia",
  start: { $geoWithin: { $centerSphere: [ [-68.8943, -32.8959], 30 / 6378100 ] } }
}).count()
```

### 5.4 `$geoWithin` + polígono

**Responde:** qué senderos arrancan dentro de un rectángulo alrededor del Gran Mendoza.
**Concepto:** polígono GeoJSON. El anillo tiene que **cerrarse**: el primer punto se repite al final.

```js
const zonaMendoza = {
  type: "Polygon",
  coordinates: [[
    [-69.5, -33.5], [-68.5, -33.5], [-68.5, -32.5], [-69.5, -32.5], [-69.5, -33.5]
  ]]
}
db.trails.find({ start: { $geoWithin: { $geometry: zonaMendoza } } }, { _id: 0, name: 1 })
```

### 5.5 `$geoIntersects`: ¿el trazado cruza una zona?

**Responde:** qué senderos tienen su recorrido (`path`, una LineString) cruzando la zona.
**Concepto:** intersección entre geometrías, línea contra polígono.

```js
db.trails.find({ path: { $geoIntersects: { $geometry: zonaMendoza } } }, { _id: 0, name: 1 })
```

### 5.6 `$geoNear` en una aggregation, con distancia calculada

**Responde:** los senderos cercanos con su distancia en km y solo los visibles en el mapa.
**Concepto:** `$geoNear` tiene que ser la **primera etapa** del pipeline. Agrega el campo con la distancia y ya ordena.

```js
db.trails.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.85, -32.89] },
      key: "start",
      distanceField: "distanciaKm",
      distanceMultiplier: 0.001,          // metros → km
      query: { visibleOnMap: true },       // filtro extra
      spherical: true
    }
  },
  { $project: { _id: 0, name: 1, distanciaKm: { $round: ["$distanciaKm", 2] } } }
])
```

---

## 6. Aggregations

Un pipeline es una cadena de etapas, y cada etapa recibe lo que devolvió la anterior.

### 6.1 `$group` + `$sum`: conteo por categoría

**Responde:** cuántos descensos hay por tipo de bici.
**Concepto:** agrupar y contar.

```js
db.descents.aggregate([
  { $group: { _id: "$bikeType", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])
```

### 6.2 `$avg`, `$min`, `$max`

**Responde:** el tiempo promedio, el mejor y el peor de los descensos válidos de cada sendero.
**Concepto:** acumuladores estadísticos.

```js
db.descents.aggregate([
  { $match: { validated: true } },
  {
    $group: {
      _id: "$trailId",
      promedioMs: { $avg: "$durationMs" },
      mejorMs:    { $min: "$durationMs" },
      peorMs:     { $max: "$durationMs" },
      cantidad:   { $sum: 1 }
    }
  }
])
```

### 6.3 `$lookup` simple: traer el nombre en vez del ObjectId

**Responde:** lo mismo que 6.2, con el nombre del sendero.
**Concepto:** relación entre colecciones, el equivalente a un JOIN.

```js
db.descents.aggregate([
  { $match: { validated: true } },
  { $group: { _id: "$trailId", promedioMs: { $avg: "$durationMs" }, cantidad: { $sum: 1 } } },
  { $lookup: { from: "trails", localField: "_id", foreignField: "_id", as: "trail" } },
  { $unwind: "$trail" },
  { $project: { _id: 0, sendero: "$trail.name", promedioS: { $round: [{ $divide: ["$promedioMs", 1000] }, 1] }, cantidad: 1 } },
  { $sort: { promedioS: 1 } }
])
```

### 6.4 `$lookup` con pipeline: incluir los que tienen cero

**Responde:** cada sendero con su cantidad de descensos válidos, **incluidos los que no tienen ninguno**.
**Concepto:** `$lookup` con `let` + `pipeline`. Arrancar desde `trails` (y no desde `descents`, como C6) hace que aparezcan los senderos sin descensos.

```js
db.trails.aggregate([
  {
    $lookup: {
      from: "descents",
      let: { idSendero: "$_id" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$trailId", "$$idSendero"] },
          { $eq: ["$validated", true] }
        ] } } },
        { $count: "n" }
      ],
      as: "validos"
    }
  },
  { $project: {
      _id: 0,
      sendero: "$name",
      descensosValidos: { $ifNull: [ { $arrayElemAt: ["$validos.n", 0] }, 0 ] }
  } },
  { $sort: { descensosValidos: -1 } }
])
```

### 6.5 `$unwind` sobre arrays embebidos

**Responde:** cuántos tramos de cada dificultad hay en todos los senderos, y cuántos puntos GPS suman.
**Concepto:** desarmar un array embebido para agrupar sus elementos.

```js
db.trails.aggregate([
  { $unwind: "$segments" },
  { $group: {
      _id: "$segments.difficulty",
      tramos: { $sum: 1 },
      puntos: { $sum: { $size: "$segments.points" } }
  } },
  { $sort: { tramos: -1 } }
])
```

### 6.6 `$project` / `$addFields` con cálculos

**Responde:** los descensos con el tiempo en segundos y si superan el mínimo válido del sendero.
**Concepto:** campos calculados y comparación entre colecciones.

```js
db.descents.aggregate([
  { $lookup: { from: "trails", localField: "trailId", foreignField: "_id", as: "t" } },
  { $unwind: "$t" },
  { $addFields: {
      segundos: { $round: [{ $divide: ["$durationMs", 1000] }, 1] },
      superaMinimo: { $gte: [{ $divide: ["$durationMs", 1000] }, "$t.minValidTimeS"] }
  } },
  { $project: { _id: 0, sendero: "$t.name", segundos: 1, minimo: "$t.minValidTimeS", superaMinimo: 1, validated: 1 } }
])
```

### 6.7 Motivos de invalidez

**Responde:** por qué se invalidaron los descensos y cuántos hay de cada motivo.
**Concepto:** `$match` + `$group` + normalización con `$toLower`.

```js
db.descents.aggregate([
  { $match: { validated: false } },
  { $group: { _id: { $toLower: "$invalidReason" }, cantidad: { $sum: 1 } } }
])
```

### 6.8 `$dateToString`: descensos por mes

**Responde:** cuántos descensos hubo cada mes.
**Concepto:** agrupar por fecha formateada, con zona horaria.

```js
db.descents.aggregate([
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$startedAt", timezone: "America/Argentina/Mendoza" } },
      descensos: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
])
```

### 6.9 `$bucket`: histograma de tiempos

**Responde:** cuántos descensos caen en cada franja de tiempo.
**Concepto:** agrupar por rangos.

```js
db.descents.aggregate([
  { $bucket: {
      groupBy: "$durationMs",
      boundaries: [0, 30000, 60000, 90000, 120000],
      default: "120 s o más",
      output: { cantidad: { $sum: 1 } }
  } }
])
```

### 6.10 `$facet`: varios reportes en una sola consulta

**Responde:** en una sola pasada, los descensos por estado, por bici y los 3 más rápidos.
**Concepto:** pipelines paralelos sobre la misma entrada.

```js
db.descents.aggregate([
  { $facet: {
      porEstado: [ { $group: { _id: "$status", n: { $sum: 1 } } } ],
      porBici:   [ { $group: { _id: "$bikeType", n: { $sum: 1 } } } ],
      top3:      [ { $match: { validated: true } }, { $sort: { durationMs: 1 } }, { $limit: 3 },
                   { $project: { _id: 0, durationMs: 1 } } ]
  } }
])
```

### 6.11 `$count`

**Responde:** cuántos descensos válidos hay en Pequia.
**Concepto:** contar al final de un pipeline.

```js
db.descents.aggregate([
  { $match: { trailId: pequia._id, validated: true } },
  { $count: "descensosValidos" }
])
```

### 6.12 Conteos cruzados entre colecciones

**Responde:** riders sin ningún descenso.
**Concepto:** `$lookup` + filtrar por array vacío, el equivalente a un LEFT JOIN … WHERE NULL.

```js
db.users.aggregate([
  { $lookup: { from: "descents", localField: "_id", foreignField: "userId", as: "d" } },
  { $match: { d: { $size: 0 } } },
  { $project: { _id: 0, displayName: 1 } }
])
```

**Responde:** cuántos descensos y cuántas opiniones tiene cada rider.
**Concepto:** dos `$lookup` sobre colecciones distintas.

```js
db.users.aggregate([
  { $lookup: { from: "descents", localField: "_id", foreignField: "userId", as: "d" } },
  { $lookup: { from: "reviews",  localField: "_id", foreignField: "userId", as: "r" } },
  { $project: { _id: 0, rider: "$displayName", descensos: { $size: "$d" }, opiniones: { $size: "$r" } } },
  { $sort: { descensos: -1 } }
])
```

**Responde:** las opiniones escritas por alguien que tiene un descenso válido en ese mismo sendero.
**Concepto:** `$lookup` con dos condiciones, sendero **y** usuario. Es la regla de negocio de las opiniones.

```js
db.reviews.aggregate([
  { $lookup: {
      from: "descents",
      let: { t: "$trailId", u: "$userId" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$trailId", "$$t"] },
          { $eq: ["$userId", "$$u"] },
          { $eq: ["$validated", true] }
        ] } } },
        { $limit: 1 }
      ],
      as: "valido"
  } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, autor: "$u.displayName", rating: 1, tieneDescensoValido: { $gt: [{ $size: "$valido" }, 0] } } }
])
```

### 6.13 Bonus: `$setWindowFields` (posición en el ranking)

**Responde:** cada descenso válido de Pequia con su posición.
**Concepto:** funciones de ventana (MongoDB 5.0+).

```js
db.descents.aggregate([
  { $match: { trailId: pequia._id, validated: true } },
  { $setWindowFields: { sortBy: { durationMs: 1 }, output: { puesto: { $rank: {} } } } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, puesto: 1, rider: "$u.displayName", durationMs: 1 } }
])
```

---

## 7. Las consultas de la app (C1–C9)

Son las mismas que usa la app (`src/lib/queries/`), escritas para la shell. Antes de correrlas, ejecutá las variables de la sección 1.

### C1 — Senderos cercanos (`$geoNear`)

**Concepto:** proximidad sobre el índice 2dsphere.

```js
db.trails.aggregate([
  { $geoNear: { near: { type: "Point", coordinates: [-68.8953, -32.8959] }, key: "start",
                distanceField: "distanceM", maxDistance: 10000, spherical: true } },
  { $limit: 5 },
  { $project: { slug: 1, name: 1, difficulty: 1, distanceM: { $round: ["$distanceM", 0] } } }
])
```

### C2 — ¿Estoy dentro del radio de salida? (`$geoWithin`)

**Concepto:** círculo esférico con el radio en radianes.

```js
db.trails.aggregate([
  { $match: { slug: "circuito-dh-pequia",
              start: { $geoWithin: { $centerSphere: [salidaPequia, 30 / 6378100] } } } },
  { $project: { _id: 0, slug: 1, name: 1 } }
])
```

### C3 — Ranking top 10 de un sendero, una fila por rider

**Concepto:** `$match` + `$sort` sobre el índice compuesto, `$group` + `$first` y `$lookup` a `users`.

```js
db.descents.aggregate([
  { $match: { trailId: pequia._id, status: "completed", validated: true } },
  { $sort: { durationMs: 1 } },
  { $group: { _id: "$userId", durationMs: { $first: "$durationMs" }, avgSpeedKmh: { $first: "$avgSpeedKmh" },
              bikeType: { $first: "$bikeType" }, startedAt: { $first: "$startedAt" }, isDemo: { $first: "$isDemo" } } },
  { $sort: { durationMs: 1 } },
  { $limit: 10 },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $project: { _id: 0, rider: "$user.displayName", durationMs: 1, avgSpeedKmh: 1, bikeType: 1, startedAt: 1, isDemo: 1 } }
])
```

> Para dejar afuera las corridas demo, agregá `isDemo: { $ne: true }` al `$match`.

### C4 — Mejor tiempo personal (`$group` + `$min`)

**Concepto:** acumuladores.

```js
db.descents.aggregate([
  { $match: { trailId: pequia._id, userId: lucas._id, status: "completed", validated: true } },
  { $group: { _id: "$userId", bestMs: { $min: "$durationMs" }, validDescents: { $sum: 1 } } },
  { $project: { _id: 0, bestMs: 1, validDescents: 1 } }
])
// Esperado con el seed: bestMs 49800, validDescents 3
```

### C5 — Promedio de calificación por sendero (`$avg` + `$lookup`)

```js
db.reviews.aggregate([
  { $group: { _id: "$trailId", avgRating: { $avg: "$rating" }, reviews: { $sum: 1 } } },
  { $lookup: { from: "trails", localField: "_id", foreignField: "_id", as: "trail" } },
  { $unwind: "$trail" },
  { $project: { _id: 0, trail: "$trail.name", slug: "$trail.slug", avgRating: { $round: ["$avgRating", 1] }, reviews: 1 } },
  { $sort: { avgRating: -1, trail: 1 } }
])
```

### C6 — Cantidad de descensos por sendero (conteo cruzado)

**Concepto:** `$cond` funciona como un if/else dentro de un acumulador.

```js
db.descents.aggregate([
  { $group: { _id: "$trailId", totalDescents: { $sum: 1 }, validDescents: { $sum: { $cond: ["$validated", 1, 0] } } } },
  { $lookup: { from: "trails", localField: "_id", foreignField: "_id", as: "trail" } },
  { $unwind: "$trail" },
  { $project: { _id: 0, trail: "$trail.name", totalDescents: 1, validDescents: 1 } },
  { $sort: { totalDescents: -1, trail: 1 } }
])
```

### C7 — Lista de senderos

```js
db.trails.find({}, { segments: 0, path: 0 }).sort({ name: 1 })
```

### C8 — Sendero por slug (usa el índice único)

```js
db.trails.findOne({ slug: "circuito-dh-pequia" })
```

### C9 — Opiniones de un sendero, la más nueva primero

**Concepto:** `$match` + `$sort` sobre el índice `{trailId, createdAt: -1}` y `$lookup`.

```js
db.reviews.aggregate([
  { $match: { trailId: pequia._id } },
  { $sort: { createdAt: -1 } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $project: { _id: 0, author: "$user.displayName", comment: 1, rating: 1, createdAt: 1 } }
])
```

### C10 / C11 — Pendientes, los escribe el equipo

- **C10 `hasValidDescent`:** ¿el usuario tiene al menos un descenso `completed` y `validated: true` en ese sendero? Pista: `find` o `countDocuments` con `trailId`, `userId`, `status` y `validated`, y después `limit(1)`.
- **C11 `insertReview`:** `insertOne` en `reviews` con `trailId`, `userId`, `rating`, `comment`, `createdAt: new Date()` y `source: "app"`.

---

## 8. Índices y explain

### 8.1 Qué índices hay y por qué

| Índice | Lo usa | Por qué |
|---|---|---|
| `trails { start: "2dsphere" }` | C1, C2, `$near` | Sin él, las consultas de proximidad no funcionan |
| `trails { slug: 1 }` único | C8 y todas las pantallas | Acceso directo por URL; la base rechaza slugs repetidos |
| `users { displayName: 1 }` único | seed, guardado | Nombres de rider sin duplicados |
| `descents { trailId, status, validated, durationMs }` | C3 | Primero los campos de igualdad y al final el de orden: Mongo lee los mejores tiempos **ya ordenados** |
| `descents { runId: 1 }` único **parcial** | POST /api/descents | Cada corrida se guarda una sola vez; solo indexa los documentos que tienen `runId` |
| `reviews { trailId: 1, createdAt: -1 }` | C9 | Opiniones de un sendero, ya ordenadas por fecha |

### 8.2 `explain("executionStats")`: con índice vs. sin índice

Para ver el "antes" **no hace falta borrar el índice**. Con `hint({ $natural: 1 })` forzás a Mongo a recorrer toda la colección.

**Con índice:**

```js
db.descents.find({ trailId: pequia._id, status: "completed", validated: true })
  .sort({ durationMs: 1 })
  .explain("executionStats")
```

**Sin índice (forzado):**

```js
db.descents.find({ trailId: pequia._id, status: "completed", validated: true })
  .sort({ durationMs: 1 })
  .hint({ $natural: 1 })
  .explain("executionStats")
```

**Qué mirar en la salida:**

| Campo | Qué significa | Con índice | Sin índice |
|---|---|---|---|
| `winningPlan.stage` (o `inputStage.stage`) | Cómo leyó | `IXSCAN` | `COLLSCAN` + `SORT` |
| `executionStats.nReturned` | Documentos devueltos | N | N |
| `executionStats.totalKeysExamined` | Entradas de índice leídas | ≈ N | 0 |
| `executionStats.totalDocsExamined` | Documentos leídos | ≈ N | **todos** |
| `executionStats.executionTimeMillis` | Tiempo | menor | mayor (se nota con volumen) |

> Un buen índice hace que `totalDocsExamined ≈ nReturned`. Con los 18 descensos del seed la diferencia de tiempo es mínima. Con decenas de miles (el seed de volumen pendiente) se vuelve evidente, y por eso se pide medir antes y después.

**Explain de una aggregation:**

```js
db.descents.explain("executionStats").aggregate([
  { $match: { trailId: pequia._id, status: "completed", validated: true } },
  { $sort: { durationMs: 1 } },
  { $limit: 10 }
])
```

**Geo:** si intentás `$geoNear` o `$near` con `hint({ $natural: 1 })`, Mongo devuelve un error. Esas consultas **necesitan** el índice 2dsphere.

**C9 con y sin índice:**

```js
db.reviews.find({ trailId: pequia._id }).sort({ createdAt: -1 }).explain("executionStats")
db.reviews.find({ trailId: pequia._id }).sort({ createdAt: -1 }).hint({ $natural: 1 }).explain("executionStats")
```

### 8.3 ¿Se usan los índices?

**Responde:** cuántas veces se usó cada índice desde que arrancó el servidor.
**Concepto:** monitoreo de índices (solo lectura).

```js
db.descents.aggregate([ { $indexStats: {} } ])
```

---

## 9. Validación con `$jsonSchema`

### 9.1 Primero, chequear sin modificar nada

Antes de aplicar un validador, revisá qué documentos **no** lo cumplirían. Este paso es solo lectura.

```js
const esquemaDescents = {
  bsonType: "object",
  required: ["trailId", "userId", "startedAt", "durationMs", "status", "validated"],
  properties: {
    trailId:       { bsonType: "objectId" },
    userId:        { bsonType: "objectId" },
    startedAt:     { bsonType: "date" },
    durationMs:    { bsonType: "number", minimum: 1 },
    avgSpeedKmh:   { bsonType: "number", minimum: 0 },
    status:        { enum: ["completed", "interrupted"] },
    validated:     { bsonType: "bool" },
    bikeType:      { enum: ["DH", "Enduro", "Trail", null] },   // las de la app guardan null
    invalidReason: { bsonType: ["string", "null"] },
    isDemo:        { bsonType: "bool" },
    source:        { enum: ["seed", "app"] }
  }
}

// Documentos que NO cumplen el esquema (debería dar 0)
db.descents.find({ $nor: [ { $jsonSchema: esquemaDescents } ] }).count()
```

### 9.2 Aplicarlo (escribe la configuración de la colección)

Esto **no** borra datos, pero cambia la colección. Hacelo cuando el equipo lo decida y anotalo en el informe.

```js
db.runCommand({
  collMod: "descents",
  validator: { $jsonSchema: esquemaDescents },
  validationLevel: "moderate",   // no revalida documentos viejos que ya no cumplen
  validationAction: "warn"       // primero "warn" (solo registra); cuando esté probado, "error"
})

// Ver el validador aplicado
db.getCollectionInfos({ name: "descents" })[0].options
```

Hacé lo mismo para `trails`. Como mínimo: `slug` y `name` string, `difficulty` en `["facil","intermedia","dificil"]`, `start` objeto con `type: "Point"`, y `minValidTimeS` number.

---

## 10. Escrituras (con cuidado, en `dh_practica`)

> **Nunca practiques escrituras en `dh`.** Copiá las colecciones a una base aparte con `$out`. Eso solo **lee** de `dh` y escribe en `dh_practica`.

```js
use dh
db.trails.aggregate([   { $out: { db: "dh_practica", coll: "trails" } } ])
db.users.aggregate([    { $out: { db: "dh_practica", coll: "users" } } ])
db.descents.aggregate([ { $out: { db: "dh_practica", coll: "descents" } } ])
db.reviews.aggregate([  { $out: { db: "dh_practica", coll: "reviews" } } ])

use dh_practica
```

> `$out` copia los datos pero **no los índices**. Tenés que recrearlos con `createIndex` en `dh_practica`, y eso de paso sirve de práctica (sección 10.4).

### 10.1 `insertOne`: guardar una opinión (lo que hará C11)

```js
const p = db.trails.findOne({ slug: "circuito-dh-pequia" })
const u = db.users.findOne({ displayName: "Lucas R." })
db.reviews.insertOne({
  trailId: p._id, userId: u._id, rating: 5,
  comment: "Prueba de inserción", createdAt: new Date(), source: "practica"
})
```

### 10.2 `updateOne` con `$set` e `$inc`

```js
db.reviews.updateOne({ source: "practica" }, { $set: { comment: "Comentario editado" } })
db.trails.updateOne({ slug: "circuito-dh-pequia" }, { $inc: { "stats.avgTimeS": 1 } })
```

### 10.3 Upsert idempotente (como `POST /api/descents`)

Si corrés esto dos veces, el segundo intento **no** duplica, porque `$setOnInsert` solo escribe cuando el documento es nuevo.

```js
db.descents.updateOne(
  { runId: "practica-1" },
  { $setOnInsert: { trailId: p._id, userId: u._id, startedAt: new Date(), durationMs: 50000,
                    status: "completed", validated: true, source: "practica" } },
  { upsert: true }
)
```

### 10.4 Recrear un índice (en `dh_practica`)

```js
db.descents.createIndex({ trailId: 1, status: 1, validated: 1, durationMs: 1 })
db.trails.createIndex({ start: "2dsphere" })
```

---

## 11. Ejercicios

Intentá resolverlos antes de abrir la respuesta. Corrélos en `dh` (son solo lectura).

**1.** ¿Cuántos descensos tiene "Demo rider" y cuántos son válidos?

<details><summary>Respuesta</summary>

```js
db.descents.aggregate([
  { $match: { userId: demo._id } },
  { $group: { _id: null, total: { $sum: 1 }, validos: { $sum: { $cond: ["$validated", 1, 0] } } } }
])
```
</details>

**2.** ¿Cuál es el sendero con la **pendiente promedio** más alta?

<details><summary>Respuesta</summary>

```js
db.trails.find({}, { _id: 0, name: 1, "stats.avgGradePct": 1 }).sort({ "stats.avgGradePct": -1 }).limit(1)
```
</details>

**3.** Velocidad promedio por tipo de bici, solo con descensos válidos, redondeada a 1 decimal.

<details><summary>Respuesta</summary>

```js
db.descents.aggregate([
  { $match: { validated: true, bikeType: { $ne: null } } },
  { $group: { _id: "$bikeType", vel: { $avg: "$avgSpeedKmh" } } },
  { $project: { vel: { $round: ["$vel", 1] } } },
  { $sort: { vel: -1 } }
])
```
</details>

**4.** El rider más rápido de **cada** sendero (nombre del sendero y del rider).

<details><summary>Respuesta</summary>

```js
db.descents.aggregate([
  { $match: { status: "completed", validated: true } },
  { $sort: { durationMs: 1 } },
  { $group: { _id: "$trailId", userId: { $first: "$userId" }, mejorMs: { $first: "$durationMs" } } },
  { $lookup: { from: "trails", localField: "_id", foreignField: "_id", as: "t" } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u" } },
  { $unwind: "$t" }, { $unwind: "$u" },
  { $project: { _id: 0, sendero: "$t.name", rider: "$u.displayName", mejorMs: 1 } }
])
```
</details>

**5.** ¿Qué senderos están a menos de 20 km de la salida de Pequia, **sin contar Pequia**?

<details><summary>Respuesta</summary>

```js
db.trails.aggregate([
  { $geoNear: { near: { type: "Point", coordinates: salidaPequia }, key: "start",
                distanceField: "d", maxDistance: 20000, spherical: true,
                query: { slug: { $ne: "circuito-dh-pequia" } } } },
  { $project: { _id: 0, name: 1, km: { $round: [{ $divide: ["$d", 1000] }, 1] } } }
])
```
</details>

**6.** Los riders que tienen descensos en **más de un sendero**.

<details><summary>Respuesta</summary>

```js
db.descents.aggregate([
  { $group: { _id: "$userId", senderos: { $addToSet: "$trailId" } } },
  { $match: { $expr: { $gt: [{ $size: "$senderos" }, 1] } } },
  { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, rider: "$u.displayName", cantidadSenderos: { $size: "$senderos" } } }
])
```
</details>

**7.** Para C4 (mejor tiempo de un rider en un sendero), ¿qué índice propondrías? Comparalo con `explain` usando `hint`.

<details><summary>Respuesta</summary>

`{ trailId: 1, userId: 1, validated: 1, durationMs: 1 }`: igualdad en los tres primeros campos y `durationMs` al final para el `$min`. Probalo en `dh_practica` creando el índice y comparando `totalDocsExamined` con y sin `hint({ $natural: 1 })`. Ojo con el **trade-off**: cada índice extra hace más lenta cada escritura y ocupa espacio.
</details>

**8.** ¿Qué porcentaje de los descensos de cada sendero es válido?

<details><summary>Respuesta</summary>

```js
db.descents.aggregate([
  { $group: { _id: "$trailId", total: { $sum: 1 }, validos: { $sum: { $cond: ["$validated", 1, 0] } } } },
  { $lookup: { from: "trails", localField: "_id", foreignField: "_id", as: "t" } },
  { $unwind: "$t" },
  { $project: { _id: 0, sendero: "$t.name",
                porcentajeValido: { $round: [{ $multiply: [{ $divide: ["$validos", "$total"] }, 100] }, 0] } } }
])
```
</details>
