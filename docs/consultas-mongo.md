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
const pequia = db.senderos.findOne({ codigo: "circuito-dh-pequia" })
const lucas  = db.usuarios.findOne({ nombre: "Lucas R." })
const demo   = db.usuarios.findOne({ nombre: "Demo rider" })
// Salida de Pequia en formato GeoJSON: [longitud, latitud]
const salidaPequia = [-68.89533, -32.8959]
```

> **GeoJSON va al revés de como lo decimos:** primero la **longitud** y después la **latitud**. Es el error más común con datos geográficos.

En la pestaña **Aggregations** de Compass se pega solo el array `[ ... ]` del pipeline. En la shell se usa `db.coleccion.aggregate([ ... ])`.

---

## 2. El modelo de datos en 1 minuto

| Colección | Qué guarda | Campos clave |
|---|---|---|
| `usuarios` | Riders (incluye "Demo rider") | `nombre` (único), `email` (solo las cuentas reales; los riders del seed no tienen), `nivel`, `ciudad`, `fechaCreacion` |
| `senderos` | Senderos | `codigo` (único), `nombre`, `dificultad` (`facil`/`intermedia`/`dificil`), `terreno`, `inicio`/`fin` (GeoJSON Point), `tramos[]` (embebidos: `dificultad`, `puntos[]` con `ubicacion` y `elevacionM`), `estadisticas` (`largoM`, `desnivelM`, `pendientePromedioPct`, `tiempoPromedioS`), `tiempoMinimoS` |
| `bajadas` | Cada bajada | `senderoId` → senderos, `usuarioId` → usuarios, `biciId` → bicis, `fechaInicio`, `duracion` (en milisegundos), `velocidadPromedioKmh`, `desnivelM`, `tipoBici` (`DH`/`Enduro`/`Trail`; no está si la bajada no tiene bici), `estado` (`completada`/`interrumpida`), `valida`, `motivoInvalida` (solo en las inválidas), `esDemo`, `idCorrida` |
| `resenas` | Opiniones | `senderoId` → senderos, `usuarioId` → usuarios, `bajadaId` → bajadas, `calificacion` (1–5), `comentario`, `fecha` |

**Decisión de diseño:**

- **Embebemos lo que se lee junto.** Los tramos (`tramos`) viven dentro del sendero.
- **Referenciamos lo que crece sin límite.** `bajadas` y `resenas` guardan `senderoId` y `usuarioId`, y se unen con `$lookup`.

---

## 3. Inspección

**Responde:** qué hay en la base.
**Concepto:** exploración del esquema flexible de MongoDB.

```js
show collections

db.usuarios.countDocuments()
db.senderos.countDocuments()
db.bajadas.countDocuments()
db.resenas.countDocuments()

// Un documento de ejemplo de cada colección
db.senderos.findOne({}, { tramos: 0 })   // sin el campo pesado
db.bajadas.findOne()

// Valores distintos de un campo
db.bajadas.distinct("tipoBici")
db.bajadas.distinct("motivoInvalida")

// Qué índices tiene cada colección
db.senderos.getIndexes()
db.bajadas.getIndexes()
db.resenas.getIndexes()
db.usuarios.getIndexes()
```

> `distinct("motivoInvalida")` muestra `"SOS"` (seed) y `"sos"` (app) escritos distinto. Es un buen ejemplo de por qué conviene validar el esquema (sección 9).

---

## 4. find: filtros, proyección, orden

### 4.1 Igualdad y proyección

**Responde:** el sendero Pequia, mostrando solo algunos campos.
**Concepto:** filtro por igualdad + proyección (`1` incluye, `0` excluye).

```js
db.senderos.find(
  { codigo: "circuito-dh-pequia" },
  { _id: 0, nombre: 1, dificultad: 1, terreno: 1, estadisticas: 1 }
)
```

### 4.2 Comparación: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`

**Responde:** los descensos de más de 60 segundos.
**Concepto:** operadores de comparación. `duracion` está en **milisegundos** (60 s = 60000).

```js
db.bajadas.find(
  { duracion: { $gt: 60000 } },
  { _id: 0, duracion: 1, tipoBici: 1, estado: 1 }
)
```

**Responde:** los descensos entre 50 y 55 segundos.

```js
db.bajadas.find({ duracion: { $gte: 50000, $lte: 55000 } })
```

### 4.3 `$in` y `$nin`

**Responde:** los descensos hechos en bici de DH o Enduro.
**Concepto:** pertenencia a un conjunto.

```js
db.bajadas.find({ tipoBici: { $in: ["DH", "Enduro"] } }).count()
```

### 4.4 `$and`, `$or`, `$not`

**Responde:** los descensos no válidos o interrumpidos.
**Concepto:** operadores lógicos.

```js
db.bajadas.find({
  $or: [ { valida: false }, { estado: "interrumpida" } ]
}, { _id: 0, duracion: 1, estado: 1, valida: 1, motivoInvalida: 1 })
```

> Dos condiciones sobre campos distintos en el mismo objeto ya son un AND implícito: `{ estado: "completada", valida: true }`.

### 4.5 `$exists` y `$type`

**Responde:** los descensos guardados desde la app (los únicos que tienen `idCorrida`).
**Concepto:** esquema flexible, porque no todos los documentos tienen los mismos campos.

```js
db.bajadas.find({ idCorrida: { $exists: true } })
db.bajadas.find({ tipoBici: { $exists: false } })   // las bajadas sin bici no tienen tipoBici
```

### 4.6 `$regex`

**Responde:** los senderos cuyo nombre empieza con "Bajada" (sin importar mayúsculas).
**Concepto:** búsqueda por patrón.

```js
db.senderos.find({ nombre: { $regex: "^bajada", $options: "i" } }, { _id: 0, nombre: 1 })
```

### 4.7 Campos embebidos (notación punto)

**Responde:** los senderos de más de 1000 m de largo.
**Concepto:** consultar dentro de subdocumentos.

```js
db.senderos.find({ "estadisticas.largoM": { $gt: 1000 } }, { _id: 0, nombre: 1, "estadisticas.largoM": 1 })
```

### 4.8 Arrays de subdocumentos: `$elemMatch` y `$size`

**Responde:** los senderos que tienen al menos un tramo difícil.
**Concepto:** consultar dentro de arrays embebidos.

```js
db.senderos.find({ "tramos.dificultad": "dificil" }, { _id: 0, nombre: 1 })

// $elemMatch: un MISMO elemento del array cumple todas las condiciones
db.senderos.find(
  { tramos: { $elemMatch: { dificultad: "dificil" } } },
  { _id: 0, nombre: 1 }
)

// Senderos con exactamente 3 tramos
db.senderos.find({ tramos: { $size: 3 } }, { _id: 0, nombre: 1 })
```

### 4.9 Fechas

**Responde:** los descensos de septiembre de 2026.
**Concepto:** rangos de fechas con `ISODate`.

```js
db.bajadas.find({
  fechaInicio: { $gte: ISODate("2026-09-01T00:00:00-03:00"), $lt: ISODate("2026-10-01T00:00:00-03:00") }
}).count()
```

### 4.10 `sort`, `limit` y `skip` (paginación)

**Responde:** los 5 descensos más rápidos, y después la "página 2".
**Concepto:** orden y paginación.

```js
db.bajadas.find({ valida: true }, { _id: 0, duracion: 1 }).sort({ duracion: 1 }).limit(5)
db.bajadas.find({ valida: true }, { _id: 0, duracion: 1 }).sort({ duracion: 1 }).skip(5).limit(5)
```

### 4.11 Usando una referencia

**Responde:** todos los descensos de Lucas R.
**Concepto:** las referencias son ObjectIds. Primero buscás el `_id` y después filtrás.

```js
db.bajadas.find({ usuarioId: lucas._id }, { _id: 0, duracion: 1, fechaInicio: 1, valida: 1 })
```

---

## 5. Geoespaciales (GIS)

El proyecto tiene un índice **2dsphere** en `senderos.inicio`. Sin ese índice, `$near`, `$nearSphere` y `$geoNear` **fallan**. En cambio, `$geoWithin` y `$geoIntersects` funcionan sin índice, aunque más lento.

### 5.1 `$near`: senderos más cercanos a un punto

**Responde:** qué senderos tienen la salida a menos de 5 km de mi posición, del más cercano al más lejano.
**Concepto:** consulta de proximidad sobre índice 2dsphere. Las distancias van en **metros**.

```js
db.senderos.find(
  {
    inicio: {
      $near: {
        $geometry: { type: "Point", coordinates: salidaPequia },
        $maxDistance: 5000
      }
    }
  },
  { _id: 0, nombre: 1 }
)
```

### 5.2 `$nearSphere`

**Responde:** lo mismo que 5.1, calculado siempre sobre la esfera.
**Concepto:** diferencia entre geometría plana y esférica. Con GeoJSON y 2dsphere, los dos dan lo mismo.

```js
db.senderos.find(
  { inicio: { $nearSphere: { $geometry: { type: "Point", coordinates: salidaPequia }, $maxDistance: 5000 } } },
  { _id: 0, nombre: 1 }
)
```

### 5.3 `$geoWithin` + `$centerSphere`: ¿estoy dentro del radio?

**Responde:** si la salida de Pequia está dentro de un círculo de 30 m alrededor de mi posición. Es la regla para habilitar "Empezar".
**Concepto:** pertenencia a un área. `$centerSphere` usa el radio en **radianes**: `metros / 6378100`.

```js
db.senderos.find({
  codigo: "circuito-dh-pequia",
  inicio: { $geoWithin: { $centerSphere: [ salidaPequia, 30 / 6378100 ] } }
}, { _id: 0, nombre: 1 })
// Un resultado = adentro. Cero resultados = afuera.
```

Para ver el caso "afuera", probá con un punto a unos 100 m de distancia:

```js
db.senderos.find({
  codigo: "circuito-dh-pequia",
  inicio: { $geoWithin: { $centerSphere: [ [-68.8943, -32.8959], 30 / 6378100 ] } }
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
db.senderos.find({ inicio: { $geoWithin: { $geometry: zonaMendoza } } }, { _id: 0, nombre: 1 })
```

### 5.5 `$geoIntersects`: ¿la salida cae en una zona?

**Responde:** qué senderos tienen la salida (`inicio`, un Point) tocando la zona.
**Concepto:** intersección entre geometrías, punto contra polígono. Con un punto da lo mismo que `$geoWithin`; la diferencia aparece con líneas o polígonos que cruzan el borde.

```js
db.senderos.find({ inicio: { $geoIntersects: { $geometry: zonaMendoza } } }, { _id: 0, nombre: 1 })
```

### 5.6 `$geoNear` en una aggregation, con distancia calculada

**Responde:** los senderos cercanos con su distancia en km, solo los de dificultad `dificil`.
**Concepto:** `$geoNear` tiene que ser la **primera etapa** del pipeline. Agrega el campo con la distancia y ya ordena.

```js
db.senderos.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.85, -32.89] },
      key: "inicio",
      distanceField: "distanciaKm",
      distanceMultiplier: 0.001,          // metros → km
      query: { dificultad: "dificil" },    // filtro extra
      spherical: true
    }
  },
  { $project: { _id: 0, nombre: 1, distanciaKm: { $round: ["$distanciaKm", 2] } } }
])
```

---

## 6. Aggregations

Un pipeline es una cadena de etapas, y cada etapa recibe lo que devolvió la anterior.

### 6.1 `$group` + `$sum`: conteo por categoría

**Responde:** cuántos descensos hay por tipo de bici.
**Concepto:** agrupar y contar.

```js
db.bajadas.aggregate([
  { $group: { _id: "$tipoBici", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])
```

### 6.2 `$avg`, `$min`, `$max`

**Responde:** el tiempo promedio, el mejor y el peor de los descensos válidos de cada sendero.
**Concepto:** acumuladores estadísticos.

```js
db.bajadas.aggregate([
  { $match: { valida: true } },
  {
    $group: {
      _id: "$senderoId",
      promedioMs: { $avg: "$duracion" },
      mejorMs:    { $min: "$duracion" },
      peorMs:     { $max: "$duracion" },
      cantidad:   { $sum: 1 }
    }
  }
])
```

### 6.3 `$lookup` simple: traer el nombre en vez del ObjectId

**Responde:** lo mismo que 6.2, con el nombre del sendero.
**Concepto:** relación entre colecciones, el equivalente a un JOIN.

```js
db.bajadas.aggregate([
  { $match: { valida: true } },
  { $group: { _id: "$senderoId", promedioMs: { $avg: "$duracion" }, cantidad: { $sum: 1 } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "trail" } },
  { $unwind: "$trail" },
  { $project: { _id: 0, sendero: "$trail.nombre", promedioS: { $round: [{ $divide: ["$promedioMs", 1000] }, 1] }, cantidad: 1 } },
  { $sort: { promedioS: 1 } }
])
```

### 6.4 `$lookup` con pipeline: incluir los que tienen cero

**Responde:** cada sendero con su cantidad de descensos válidos, **incluidos los que no tienen ninguno**.
**Concepto:** `$lookup` con `let` + `pipeline`. Arrancar desde `senderos` (y no desde `bajadas`, como C6) hace que aparezcan los senderos sin descensos.

```js
db.senderos.aggregate([
  {
    $lookup: {
      from: "bajadas",
      let: { idSendero: "$_id" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$senderoId", "$$idSendero"] },
          { $eq: ["$valida", true] }
        ] } } },
        { $count: "n" }
      ],
      as: "validos"
    }
  },
  { $project: {
      _id: 0,
      sendero: "$nombre",
      descensosValidos: { $ifNull: [ { $arrayElemAt: ["$validos.n", 0] }, 0 ] }
  } },
  { $sort: { descensosValidos: -1 } }
])
```

### 6.5 `$unwind` sobre arrays embebidos

**Responde:** cuántos tramos de cada dificultad hay en todos los senderos, y cuántos puntos GPS suman.
**Concepto:** desarmar un array embebido para agrupar sus elementos.

```js
db.senderos.aggregate([
  { $unwind: "$tramos" },
  { $group: {
      _id: "$tramos.dificultad",
      tramos: { $sum: 1 },
      puntos: { $sum: { $size: "$tramos.puntos" } }
  } },
  { $sort: { tramos: -1 } }
])
```

### 6.6 `$project` / `$addFields` con cálculos

**Responde:** los descensos con el tiempo en segundos y si superan el mínimo válido del sendero.
**Concepto:** campos calculados y comparación entre colecciones.

```js
db.bajadas.aggregate([
  { $lookup: { from: "senderos", localField: "senderoId", foreignField: "_id", as: "t" } },
  { $unwind: "$t" },
  { $addFields: {
      segundos: { $round: [{ $divide: ["$duracion", 1000] }, 1] },
      superaMinimo: { $gte: [{ $divide: ["$duracion", 1000] }, "$t.tiempoMinimoS"] }
  } },
  { $project: { _id: 0, sendero: "$t.nombre", segundos: 1, minimo: "$t.tiempoMinimoS", superaMinimo: 1, valida: 1 } }
])
```

### 6.7 Motivos de invalidez

**Responde:** por qué se invalidaron los descensos y cuántos hay de cada motivo.
**Concepto:** `$match` + `$group` + normalización con `$toLower`.

```js
db.bajadas.aggregate([
  { $match: { valida: false } },
  { $group: { _id: { $toLower: "$motivoInvalida" }, cantidad: { $sum: 1 } } }
])
```

### 6.8 `$dateToString`: descensos por mes

**Responde:** cuántos descensos hubo cada mes.
**Concepto:** agrupar por fecha formateada, con zona horaria.

```js
db.bajadas.aggregate([
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$fechaInicio", timezone: "America/Argentina/Mendoza" } },
      descensos: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
])
```

### 6.9 `$bucket`: histograma de tiempos

**Responde:** cuántos descensos caen en cada franja de tiempo.
**Concepto:** agrupar por rangos.

```js
db.bajadas.aggregate([
  { $bucket: {
      groupBy: "$duracion",
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
db.bajadas.aggregate([
  { $facet: {
      porEstado: [ { $group: { _id: "$estado", n: { $sum: 1 } } } ],
      porBici:   [ { $group: { _id: "$tipoBici", n: { $sum: 1 } } } ],
      top3:      [ { $match: { valida: true } }, { $sort: { duracion: 1 } }, { $limit: 3 },
                   { $project: { _id: 0, duracion: 1 } } ]
  } }
])
```

### 6.11 `$count`

**Responde:** cuántos descensos válidos hay en Pequia.
**Concepto:** contar al final de un pipeline.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, valida: true } },
  { $count: "descensosValidos" }
])
```

### 6.12 Conteos cruzados entre colecciones

**Responde:** riders sin ningún descenso.
**Concepto:** `$lookup` + filtrar por array vacío, el equivalente a un LEFT JOIN … WHERE NULL.

```js
db.usuarios.aggregate([
  { $lookup: { from: "bajadas", localField: "_id", foreignField: "usuarioId", as: "d" } },
  { $match: { d: { $size: 0 } } },
  { $project: { _id: 0, nombre: 1 } }
])
```

**Responde:** cuántos descensos y cuántas opiniones tiene cada rider.
**Concepto:** dos `$lookup` sobre colecciones distintas.

```js
db.usuarios.aggregate([
  { $lookup: { from: "bajadas", localField: "_id", foreignField: "usuarioId", as: "d" } },
  { $lookup: { from: "resenas",  localField: "_id", foreignField: "usuarioId", as: "r" } },
  { $project: { _id: 0, rider: "$nombre", descensos: { $size: "$d" }, opiniones: { $size: "$r" } } },
  { $sort: { descensos: -1 } }
])
```

**Responde:** las opiniones escritas por alguien que tiene un descenso válido en ese mismo sendero.
**Concepto:** `$lookup` con dos condiciones, sendero **y** usuario. Es la regla de negocio de las opiniones.

```js
db.resenas.aggregate([
  { $lookup: {
      from: "bajadas",
      let: { t: "$senderoId", u: "$usuarioId" },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ["$senderoId", "$$t"] },
          { $eq: ["$usuarioId", "$$u"] },
          { $eq: ["$valida", true] }
        ] } } },
        { $limit: 1 }
      ],
      as: "valido"
  } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, autor: "$u.nombre", calificacion: 1, tieneDescensoValido: { $gt: [{ $size: "$valido" }, 0] } } }
])
```

### 6.13 Bonus: `$setWindowFields` (posición en el ranking)

**Responde:** cada descenso válido de Pequia con su posición.
**Concepto:** funciones de ventana (MongoDB 5.0+).

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, valida: true } },
  { $setWindowFields: { sortBy: { duracion: 1 }, output: { puesto: { $rank: {} } } } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, puesto: 1, rider: "$u.nombre", duracion: 1 } }
])
```

---

## 7. Las consultas de la app (C1–C9)

Son las mismas que usa la app (`src/lib/queries/`), escritas para la shell. Antes de correrlas, ejecutá las variables de la sección 1.

### C1 — Senderos cercanos (`$geoNear`)

**Concepto:** proximidad sobre el índice 2dsphere.

```js
db.senderos.aggregate([
  { $geoNear: { near: { type: "Point", coordinates: [-68.8953, -32.8959] }, key: "inicio",
                distanceField: "distanciaM", maxDistance: 10000, spherical: true } },
  { $limit: 5 },
  { $project: { codigo: 1, nombre: 1, dificultad: 1, distanciaM: { $round: ["$distanciaM", 0] } } }
])
```

### C2 — ¿Estoy dentro del radio de salida? (`$geoWithin`)

**Concepto:** círculo esférico con el radio en radianes.

```js
db.senderos.aggregate([
  { $match: { codigo: "circuito-dh-pequia",
              inicio: { $geoWithin: { $centerSphere: [salidaPequia, 30 / 6378100] } } } },
  { $project: { _id: 0, codigo: 1, nombre: 1 } }
])
```

### C3 — Ranking top 10 de un sendero, una fila por rider

**Concepto:** `$match` + `$sort` sobre el índice compuesto, `$group` + `$first` y `$lookup` a `usuarios`.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, estado: "completada", valida: true } },
  { $sort: { duracion: 1 } },
  { $group: { _id: "$usuarioId", duracion: { $first: "$duracion" }, velocidadPromedioKmh: { $first: "$velocidadPromedioKmh" },
              tipoBici: { $first: "$tipoBici" }, fechaInicio: { $first: "$fechaInicio" }, esDemo: { $first: "$esDemo" } } },
  { $sort: { duracion: 1 } },
  { $limit: 10 },
  { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "usuario" } },
  { $unwind: "$usuario" },
  { $project: { _id: 0, ciclista: "$usuario.nombre", duracion: 1, velocidadPromedioKmh: 1, tipoBici: 1, fechaInicio: 1, esDemo: 1 } }
])
```

> Para dejar afuera las corridas demo, agregá `esDemo: { $ne: true }` al `$match`.

### C4 — Mejor tiempo personal (`$group` + `$min`)

**Concepto:** acumuladores.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, usuarioId: lucas._id, estado: "completada", valida: true } },
  { $group: { _id: "$usuarioId", mejorTiempo: { $min: "$duracion" }, bajadasValidas: { $sum: 1 } } },
  { $project: { _id: 0, mejorTiempo: 1, bajadasValidas: 1 } }
])
// Esperado con el seed: mejorTiempo 49800 (milisegundos), bajadasValidas 3
```

### C5 — Promedio de calificación por sendero (`$avg` + `$lookup`)

```js
db.resenas.aggregate([
  { $group: { _id: "$senderoId", promedio: { $avg: "$calificacion" }, cantidad: { $sum: 1 } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "sendero" } },
  { $unwind: "$sendero" },
  { $project: { _id: 0, sendero: "$sendero.nombre", codigo: "$sendero.codigo", promedio: { $round: ["$promedio", 1] }, cantidad: 1 } },
  { $sort: { promedio: -1, sendero: 1 } }
])
```

### C6 — Cantidad de descensos por sendero (conteo cruzado)

**Concepto:** `$cond` funciona como un if/else dentro de un acumulador.

```js
db.bajadas.aggregate([
  { $group: { _id: "$senderoId", totalBajadas: { $sum: 1 }, bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "sendero" } },
  { $unwind: "$sendero" },
  { $project: { _id: 0, sendero: "$sendero.nombre", totalBajadas: 1, bajadasValidas: 1 } },
  { $sort: { totalBajadas: -1, sendero: 1 } }
])
```

### C7 — Lista de senderos

```js
db.senderos.find({}, { tramos: 0 }).sort({ nombre: 1 })
```

### C8 — Sendero por codigo (usa el índice único)

```js
db.senderos.findOne({ codigo: "circuito-dh-pequia" })
```

### C9 — Opiniones de un sendero, la más nueva primero

**Concepto:** `$match` + `$sort` sobre el índice `{senderoId, fecha: -1}` y `$lookup`.

```js
db.resenas.aggregate([
  { $match: { senderoId: pequia._id } },
  { $sort: { fecha: -1 } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
  { $unwind: "$usuario" },
  { $project: { _id: 0, autor: "$usuario.nombre", comentario: 1, calificacion: 1, fecha: 1 } }
])
```

### C10 / C11 — Pendientes, los escribe el equipo

- **C10 `hasValidDescent`:** ¿el usuario tiene al menos un descenso `completada` y `valida: true` en ese sendero? Pista: `find` o `countDocuments` con `senderoId`, `usuarioId`, `estado` y `valida`, y después `limit(1)`.
- **C11 `insertReview`:** `insertOne` en `resenas` con `senderoId`, `usuarioId`, `calificacion`, `comentario` y `fecha: new Date()`.

---

## 8. Índices y explain

### 8.1 Qué índices hay y por qué

| Índice | Lo usa | Por qué |
|---|---|---|
| `senderos { inicio: "2dsphere" }` | C1, C2, `$near` | Sin él, las consultas de proximidad no funcionan |
| `senderos { codigo: 1 }` único | C8 y todas las pantallas | Acceso directo por URL; la base rechaza slugs repetidos |
| `usuarios { nombre: 1 }` único | seed, guardado | Nombres de rider sin duplicados |
| `bajadas { senderoId, estado, valida, duracion }` | C3 | Primero los campos de igualdad y al final el de orden: Mongo lee los mejores tiempos **ya ordenados** |
| `bajadas { idCorrida: 1 }` único **parcial** | POST /api/descents | Cada corrida se guarda una sola vez; solo indexa los documentos que tienen `idCorrida` |
| `resenas { senderoId: 1, fecha: -1 }` | C9 | Opiniones de un sendero, ya ordenadas por fecha |

### 8.2 `explain("executionStats")`: con índice vs. sin índice

Para ver el "antes" **no hace falta borrar el índice**. Con `hint({ $natural: 1 })` forzás a Mongo a recorrer toda la colección.

**Con índice:**

```js
db.bajadas.find({ senderoId: pequia._id, estado: "completada", valida: true })
  .sort({ duracion: 1 })
  .explain("executionStats")
```

**Sin índice (forzado):**

```js
db.bajadas.find({ senderoId: pequia._id, estado: "completada", valida: true })
  .sort({ duracion: 1 })
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
db.bajadas.explain("executionStats").aggregate([
  { $match: { senderoId: pequia._id, estado: "completada", valida: true } },
  { $sort: { duracion: 1 } },
  { $limit: 10 }
])
```

**Geo:** si intentás `$geoNear` o `$near` con `hint({ $natural: 1 })`, Mongo devuelve un error. Esas consultas **necesitan** el índice 2dsphere.

**C9 con y sin índice:**

```js
db.resenas.find({ senderoId: pequia._id }).sort({ fecha: -1 }).explain("executionStats")
db.resenas.find({ senderoId: pequia._id }).sort({ fecha: -1 }).hint({ $natural: 1 }).explain("executionStats")
```

### 8.3 ¿Se usan los índices?

**Responde:** cuántas veces se usó cada índice desde que arrancó el servidor.
**Concepto:** monitoreo de índices (solo lectura).

```js
db.bajadas.aggregate([ { $indexStats: {} } ])
```

---

## 9. Validación con `$jsonSchema`

### 9.1 Primero, chequear sin modificar nada

Antes de aplicar un validador, revisá qué documentos **no** lo cumplirían. Este paso es solo lectura.

```js
const esquemaDescents = {
  bsonType: "object",
  required: ["senderoId", "usuarioId", "fechaInicio", "duracion", "estado", "valida"],
  properties: {
    senderoId:       { bsonType: "objectId" },
    usuarioId:        { bsonType: "objectId" },
    fechaInicio:     { bsonType: "date" },
    duracion:    { bsonType: "number", minimum: 1 },
    velocidadPromedioKmh:   { bsonType: "number", minimum: 0 },
    estado:        { enum: ["completada", "interrumpida"] },
    valida:     { bsonType: "bool" },
    tipoBici:      { enum: ["DH", "Enduro", "Trail"] },   // no está si la bajada no tiene bici
    motivoInvalida: { bsonType: "string" },                // solo en las inválidas
    esDemo:        { bsonType: "bool" }
  }
}

// Documentos que NO cumplen el esquema (debería dar 0)
db.bajadas.find({ $nor: [ { $jsonSchema: esquemaDescents } ] }).count()
```

### 9.2 Aplicarlo (escribe la configuración de la colección)

Esto **no** borra datos, pero cambia la colección. Hacelo cuando el equipo lo decida y anotalo en el informe.

```js
db.runCommand({
  collMod: "bajadas",
  validator: { $jsonSchema: esquemaDescents },
  validationLevel: "moderate",   // no revalida documentos viejos que ya no cumplen
  validationAction: "warn"       // primero "warn" (solo registra); cuando esté probado, "error"
})

// Ver el validador aplicado
db.getCollectionInfos({ name: "bajadas" })[0].options
```

Hacé lo mismo para `senderos`. Como mínimo: `codigo` y `nombre` string, `dificultad` en `["facil","intermedia","dificil"]`, `inicio` objeto con `type: "Point"`, y `tiempoMinimoS` number.

---

## 10. Escrituras (con cuidado, en `dh_practica`)

> **Nunca practiques escrituras en `dh`.** Copiá las colecciones a una base aparte con `$out`. Eso solo **lee** de `dh` y escribe en `dh_practica`.

```js
use dh
db.senderos.aggregate([   { $out: { db: "dh_practica", coll: "senderos" } } ])
db.usuarios.aggregate([    { $out: { db: "dh_practica", coll: "usuarios" } } ])
db.bajadas.aggregate([ { $out: { db: "dh_practica", coll: "bajadas" } } ])
db.resenas.aggregate([  { $out: { db: "dh_practica", coll: "resenas" } } ])

use dh_practica
```

> `$out` copia los datos pero **no los índices**. Tenés que recrearlos con `createIndex` en `dh_practica`, y eso de paso sirve de práctica (sección 10.4).

### 10.1 `insertOne`: guardar una opinión (lo que hará C11)

```js
const p = db.senderos.findOne({ codigo: "circuito-dh-pequia" })
const u = db.usuarios.findOne({ nombre: "Lucas R." })
db.resenas.insertOne({
  senderoId: p._id, usuarioId: u._id, calificacion: 5,
  comentario: "Prueba de inserción", fecha: new Date()
})
```

### 10.2 `updateOne` con `$set` e `$inc`

```js
db.resenas.updateOne({ comentario: "Prueba de inserción" }, { $set: { comentario: "Comentario editado" } })
db.senderos.updateOne({ codigo: "circuito-dh-pequia" }, { $inc: { "estadisticas.tiempoPromedioS": 1 } })
```

### 10.3 Upsert idempotente (como `POST /api/descents`)

Si corrés esto dos veces, el segundo intento **no** duplica, porque `$setOnInsert` solo escribe cuando el documento es nuevo.

```js
db.bajadas.updateOne(
  { idCorrida: "practica-1" },
  { $setOnInsert: { senderoId: p._id, usuarioId: u._id, fechaInicio: new Date(), duracion: 50000,
                    estado: "completada", valida: true } },
  { upsert: true }
)
```

### 10.4 Recrear un índice (en `dh_practica`)

```js
db.bajadas.createIndex({ senderoId: 1, estado: 1, valida: 1, duracion: 1 })
db.senderos.createIndex({ inicio: "2dsphere" })
```

---

## 11. Ejercicios

Intentá resolverlos antes de abrir la respuesta. Corrélos en `dh` (son solo lectura).

**1.** ¿Cuántos descensos tiene "Demo rider" y cuántos son válidos?

<details><summary>Respuesta</summary>

```js
db.bajadas.aggregate([
  { $match: { usuarioId: demo._id } },
  { $group: { _id: null, total: { $sum: 1 }, validos: { $sum: { $cond: ["$valida", 1, 0] } } } }
])
```
</details>

**2.** ¿Cuál es el sendero con la **pendiente promedio** más alta?

<details><summary>Respuesta</summary>

```js
db.senderos.find({}, { _id: 0, nombre: 1, "estadisticas.pendientePromedioPct": 1 }).sort({ "estadisticas.pendientePromedioPct": -1 }).limit(1)
```
</details>

**3.** Velocidad promedio por tipo de bici, solo con descensos válidos, redondeada a 1 decimal.

<details><summary>Respuesta</summary>

```js
db.bajadas.aggregate([
  { $match: { valida: true, tipoBici: { $exists: true } } },
  { $group: { _id: "$tipoBici", vel: { $avg: "$velocidadPromedioKmh" } } },
  { $project: { vel: { $round: ["$vel", 1] } } },
  { $sort: { vel: -1 } }
])
```
</details>

**4.** El rider más rápido de **cada** sendero (nombre del sendero y del rider).

<details><summary>Respuesta</summary>

```js
db.bajadas.aggregate([
  { $match: { estado: "completada", valida: true } },
  { $sort: { duracion: 1 } },
  { $group: { _id: "$senderoId", usuarioId: { $first: "$usuarioId" }, mejorMs: { $first: "$duracion" } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "t" } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "u" } },
  { $unwind: "$t" }, { $unwind: "$u" },
  { $project: { _id: 0, sendero: "$t.nombre", rider: "$u.nombre", mejorMs: 1 } }
])
```
</details>

**5.** ¿Qué senderos están a menos de 20 km de la salida de Pequia, **sin contar Pequia**?

<details><summary>Respuesta</summary>

```js
db.senderos.aggregate([
  { $geoNear: { near: { type: "Point", coordinates: salidaPequia }, key: "inicio",
                distanceField: "d", maxDistance: 20000, spherical: true,
                query: { codigo: { $ne: "circuito-dh-pequia" } } } },
  { $project: { _id: 0, nombre: 1, km: { $round: [{ $divide: ["$d", 1000] }, 1] } } }
])
```
</details>

**6.** Los riders que tienen descensos en **más de un sendero**.

<details><summary>Respuesta</summary>

```js
db.bajadas.aggregate([
  { $group: { _id: "$usuarioId", senderos: { $addToSet: "$senderoId" } } },
  { $match: { $expr: { $gt: [{ $size: "$senderos" }, 1] } } },
  { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $project: { _id: 0, rider: "$u.nombre", cantidadSenderos: { $size: "$senderos" } } }
])
```
</details>

**7.** Para C4 (mejor tiempo de un rider en un sendero), ¿qué índice propondrías? Comparalo con `explain` usando `hint`.

<details><summary>Respuesta</summary>

`{ senderoId: 1, usuarioId: 1, valida: 1, duracion: 1 }`: igualdad en los tres primeros campos y `duracion` al final para el `$min`. Probalo en `dh_practica` creando el índice y comparando `totalDocsExamined` con y sin `hint({ $natural: 1 })`. Ojo con el **trade-off**: cada índice extra hace más lenta cada escritura y ocupa espacio.
</details>

**8.** ¿Qué porcentaje de los descensos de cada sendero es válido?

<details><summary>Respuesta</summary>

```js
db.bajadas.aggregate([
  { $group: { _id: "$senderoId", total: { $sum: 1 }, validos: { $sum: { $cond: ["$valida", 1, 0] } } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "t" } },
  { $unwind: "$t" },
  { $project: { _id: 0, sendero: "$t.nombre",
                porcentajeValido: { $round: [{ $multiply: [{ $divide: ["$validos", "$total"] }, 100] }, 0] } } }
])
```
</details>
