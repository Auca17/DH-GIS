# Cómo funciona DH: la base de datos, el código y MongoDB

Para Augustus, Nicolas, Ariel y Josefina. Es **el** documento del proyecto: cómo pensamos la base, cómo se
relacionan los documentos de verdad, cómo funcionan los índices por dentro, cómo viaja una bajada desde el
celular hasta MongoDB, quién puede hacer qué (en la app y en Atlas), y al final todas las consultas para
practicar en la shell de Compass.

La instalación paso a paso está aparte, en [PRACTICAR.md](PRACTICAR.md).

**Cómo leerlo:** la **Parte I** (secciones 1 a 9) se lee de corrido y es lo que hay que saber explicar. La
**Parte II** (secciones 10 a 19) es para practicar con la shell abierta. La **Parte III** (sección 20) es la
política de resguardo.

> **Cambios del 27/10/2026** (rama `feat/embebidos`). Si ya leíste una versión anterior, esto es lo nuevo:
>
> - **Freeride, afuera.** Se sacó la página `/freeride` (guardaba en el navegador, no en Mongo).
> - **Las bicis ahora van embebidas en `usuarios`** (array `bicis`, máximo 5). Es una relación uno a pocos,
>   con tope, y siempre se lee junto con el rider (perfil, selector de bici): una sola lectura, sin `$lookup`.
>   Cada bici conserva su `_id`, y `bajadas.biciId` apunta a `usuarios.bicis._id`. La colección `bicis` ya no se usa.
> - **Tope de 5 bicis, controlado dos veces:** el `$push` filtra `"bicis.4": { $exists: false }` (atómico: no hay
>   lugar para una sexta) y el validador tiene `maxItems: 5`. Antes eran 10 con `countDocuments` (no atómico).
> - **Una sola bici principal:** un índice único ya no sirve (compara documentos distintos, no elementos de un
>   mismo array). Ahora cambiar la principal es **un solo `updateOne` con `arrayFilters`**, y el validador de
>   `usuarios` tiene una regla `$expr` que rechaza dos principales (error 121).
> - **El registro es una sola escritura:** `insertOne` del usuario con `bicis: [primeraBici]`. Ya no hace falta
>   "borrar el usuario a mano si falla la bici".
> - **La reseña ahora va embebida en su bajada** (subdocumento `resena`). Es uno a uno (0 o 1) y se escribe
>   junto con la bajada, que ya tiene `senderoId` y `usuarioId`. La colección `resenas` ya no se usa. **No** la
>   embebimos en `senderos`: ese array crecería sin límite con cada rider (anti-patrón, tope de 16 MB).
> - **Regla de negocio nueva: una reseña por rider y por sendero** (antes era una por bajada). Lo controla la
>   base con el índice único parcial `una_resena_por_usuario_y_sendero`; el segundo intento da 409 *"Ya dejaste
>   una reseña para este sendero."*
> - **Índices:** nuevos `usuarios { "bicis._id": 1 }` (multikey, para C12), `resenas_por_sendero` y
>   `una_resena_por_usuario_y_sendero` en `bajadas`. Se fueron los de `bicis` y `resenas`.
> - **Consultas:** C5 y C9 ahora leen `bajadas` filtrando `resena: { $exists: true }`; C12 hace `$lookup` a
>   `usuarios` por `bicis._id` + `$filter`; C13 ya no usa `$lookup` (`$sortArray`).
> - **explain de C9:** sin índice `SORT > COLLSCAN` con 20.017 docs leídos; con índice `FETCH > IXSCAN` con
>   52 claves / 52 docs / 52 resultados.
> - **Seed:** 70 usuarios, 105 bicis (embebidas), 3 senderos, 20.017 bajadas, **153 reseñas** (antes 306: ahora
>   va una por rider y sendero). Las cuentas reales se migran solas desde las colecciones viejas `bicis` y
>   `resenas`, que después se pueden borrar a mano en Compass (`db.bicis.drop()`, `db.resenas.drop()`). Eso lo
>   decide el usuario.

---

## Índice

**Parte I — Entender**

1. [La app en un párrafo](#1-la-app-en-un-párrafo)
2. [Las dos bases: local y Atlas](#2-las-dos-bases-local-y-atlas)
3. [Cómo pensamos el modelo de datos](#3-cómo-pensamos-el-modelo-de-datos)
4. [Cómo se referencian los documentos (de verdad)](#4-cómo-se-referencian-los-documentos-de-verdad)
5. [Índices: cómo funcionan por dentro](#5-índices-cómo-funcionan-por-dentro)
6. [Validación con `$jsonSchema`](#6-validación-con-jsonschema)
7. [El código: el viaje de una bajada](#7-el-código-el-viaje-de-una-bajada)
8. [Cuentas, sesiones y permisos](#8-cuentas-sesiones-y-permisos)
9. [Las consultas C1 a C13](#9-las-consultas-c1-a-c13)

**Parte II — Practicar en la shell**

10. [Cómo abrir la shell](#10-cómo-abrir-la-shell)
11. [Inspección](#11-inspección)
12. [find: filtros, proyección, orden](#12-find-filtros-proyección-orden)
13. [Geoespaciales (GIS)](#13-geoespaciales-gis)
14. [Aggregations](#14-aggregations)
15. [Las consultas de la app (C1–C13)](#15-las-consultas-de-la-app-c1c13)
16. [Índices y explain](#16-índices-y-explain)
17. [Validación con `$jsonSchema`](#17-validación-con-jsonschema)
18. [Escrituras (en `dh_practica`)](#18-escrituras-con-cuidado-en-dh_practica)
19. [Ejercicios](#19-ejercicios)

**Parte III — Resguardo**

20. [Política de resguardo (backups)](#20-política-de-resguardo-backups)

[Glosario](#glosario)

---

# Parte I — Entender

## 1. La app en un párrafo

**DH** es un ranking de descensos de mountain bike. Elegís un sendero (Pequia, El Llorón o el Escarpado del
Cerro de la Gloria), bajás con el GPS del celular midiendo el tiempo, y si la corrida es válida entra al
ranking. Se puede usar sin cuenta en **modo demo** (simula la bajada) y con cuenta usando **GPS real**. Está
publicada en **https://dh-gis.vercel.app**.

Lo que se evalúa en la materia **no es la app, es la base**: consultas, aggregations, relaciones entre
colecciones, `$lookup`, índices (incluidos los geoespaciales) y validación. La app demuestra que todo eso se
usa de verdad y no es un ejercicio suelto.

### 1.1 Qué tiene que resolver (requisitos)

**El problema:** los riders de DH quieren comparar sus tiempos en un mismo sendero, pero hoy lo miden cada uno con
su reloj y no hay forma de saber si un tiempo es real. Necesitamos medir la bajada con GPS, validarla y guardar
un ranking confiable.

Cada requisito tiene algo en la base que lo resuelve:

| Requisito | Cómo lo resuelve la base |
|---|---|
| Ver los senderos cercanos y saber si estoy en la salida | Índice 2dsphere en `senderos.inicio`, C1 y C2 |
| Ranking de cada sendero | C3, con el índice `{senderoId, estado, valida, duracion}` |
| Mi mejor tiempo | C4 (`$group` + `$min`) |
| Opinar y calificar un sendero | Subdocumento `resena` dentro de `bajadas`, C5 y C9; una sola reseña por rider y sendero (índice único parcial `una_resena_por_usuario_y_sendero`) |
| Cuentas con sus bicis | `usuarios` (nombre y email únicos) con el array `bicis` adentro (hasta 5, una sola principal por la regla `$expr` del validador) |
| Estadísticas cruzadas (por ciudad, nivel, tipo de bici) | `$lookup` entre colecciones: C6, C10, C11 y C12 |
| **No funcional:** que no se pueda hacer trampa | El servidor valida cada bajada y guarda `valida` y `motivoInvalida` (sección 7) |
| **No funcional:** no duplicar una bajada si se reenvía | Índice único parcial en `idCorrida` |
| **No funcional:** datos consistentes | `$jsonSchema` en todas las colecciones (sección 6) |
| **No funcional:** sesiones que vencen solas | Índice TTL en `sesiones.venceEn` |
| **No funcional:** no perder datos | Política de resguardo (sección 20) |
| **No funcional:** poder mostrarla sin cuenta ni GPS | Modo demo |

## 2. Las dos bases: local y Atlas

| Base | Dónde está | Para qué | Cómo te conectás en Compass |
|---|---|---|---|
| **Local** | En tu compu (MongoDB Community Server 8.0) | Practicar y romper sin miedo. Es lo que pide el profe. | `mongodb://127.0.0.1:27017` |
| **Atlas** | En la nube (cluster `dh.35crots.mongodb.net`) | La app publicada en Vercel y la presentación | La cadena `mongodb+srv://...` del `.env.local` (tiene la contraseña: no se comparte) |

Las dos tienen **los mismos datos**, porque los carga el mismo script (`scripts/seed.ts`). El código de la app
es idéntico para las dos: lo único que cambia es la variable `MONGODB_URI`. El nombre de la base (`dh`) sale
del final de esa cadena (`.../dh`).

### 2.1 Las otras bases que aparecen en Compass

Además de `dh`, Compass muestra bases que **crea MongoDB solo** y que nosotros no usamos:

- **`admin`**: guarda cosas internas, como los usuarios y roles de la base de datos (`system.users`,
  `system.roles`). Compass esconde las colecciones `system.*`, así que se ve vacía. En Atlas, los usuarios de
  base se manejan desde el panel (Database Access).
- **`local`**: el nombre confunde, **no es tu compu**. En Atlas tiene `oplog.rs` (*operations log*), el registro
  de cada escritura. Un cluster de Atlas son **3 servidores** (un *replica set*): uno principal que recibe las
  escrituras y dos copias que leen el `oplog` y repiten las mismas operaciones. Si se cae el principal, una copia
  toma su lugar. Tu MongoDB local es un solo servidor (*standalone*), sin copias, así que no tiene `oplog`.
- **`config`**: configuración interna del servidor.

**Consecuencia en el código:** MongoDB solo permite **transacciones** (varias escrituras que se guardan todas o
ninguna) en un replica set. La base local no lo es, así que no usamos transacciones. No hacen falta: **una
escritura sobre un solo documento siempre es atómica**. Como las bicis van dentro del usuario, el registro guarda
el usuario **con** su primera bici en un solo `insertOne` (`src/app/api/auth/register/route.ts`): o se guarda
todo, o nada.

## 3. Cómo pensamos el modelo de datos

### 3.1 Primero, las entidades y cómo se relacionan

Antes de escribir una línea, nos preguntamos **qué cosas existen** y **cuántas de una hay por cada una de la
otra** (la cardinalidad):

- Un **usuario** tiene **pocas bicis** (hasta 5). Una bici es de **un solo** usuario. → **1 a pocos**, parte del usuario
- Un **usuario** hace **muchas bajadas**. Cada bajada la hizo **un** usuario. → **1 a N**
- Un **sendero** tiene **muchas bajadas**. Cada bajada es de **un** sendero. → **1 a N**
- Una **bici** se usa en **muchas bajadas**. Cada bajada se hizo con **una** bici (o ninguna, en modo demo). → **1 a N**
- Una **bajada** tiene **como máximo una** reseña. → **1 a 0..1**, parte de la bajada
- Un **rider** deja **como máximo una** reseña **por sendero** (regla de negocio).
- Un **sendero** tiene **pocos tramos** (entre 12 y 26), que no existen fuera de él. → **1 a pocos**, parte del sendero
- Un **usuario** puede tener **varias sesiones** abiertas (celular y compu). → **1 a N**

```
  ┌──────────────────────┐
  │ usuarios             │
  │  (bicis[] adentro,   │<─────────────┐
  │   hasta 5)           │              │ usuarioId
  └──────────────────────┘         ┌────┴─────┐
     ▲            ▲                │ sesiones │
     │ usuarioId  │ biciId         └──────────┘
     │            │ (→ usuarios.bicis._id)
  ┌──┴────────────┴──────┐
  │ bajadas              │
  │  (resena{} adentro,  │
  │   0 o 1)             │
  └──────────┬───────────┘
             │ senderoId
             ▼
  ┌──────────────────────┐
  │ senderos             │
  │  (tramos[] adentro)  │
  └──────────────────────┘

  Lectura: "bajadas tiene un senderoId que apunta a senderos", etc.
  La flecha sale del lado N (el que guarda la referencia).
  Lo que está "adentro" (bicis, resena, tramos) está embebido: no es otra colección.
```

Son **4 colecciones** (`usuarios`, `senderos`, `bajadas`, `sesiones`), **3 relaciones embebidas** (tramos en
senderos, bicis en usuarios, reseña en bajadas) y el resto con referencias.

### 3.2 La gran pregunta de MongoDB: ¿embebo o referencio?

En SQL no hay opción: cada entidad es una tabla y se une con `JOIN`. En MongoDB un documento puede llevar
**adentro** otros documentos (embebidos) o **apuntar** a otros por su `_id` (referencias). Decidimos con dos
preguntas:

1. **¿Se lee siempre junto?** Si nunca muestro A sin B, conviene que B viva dentro de A: una sola lectura.
2. **¿Crece sin límite?** Si B puede ser miles, NO puede ir adentro: un documento tiene un **tope de 16 MB**, y
   además cada vez que leo A me traería todo B aunque no lo necesite.

| Relación | ¿Se lee junto? | ¿Crece sin límite? | Decisión |
|---|---|---|---|
| sendero → tramos | Sí, siempre (el mapa dibuja la pista entera) | No (12 a 26 tramos, fijos) | **Embebido**: `senderos.tramos[]` |
| sendero → bajadas | No (la página del sendero muestra solo el top 10) | **Sí** (Pequia ya tiene 9.000) | **Referencia**: `bajadas.senderoId` |
| usuario → bajadas | No | Sí | **Referencia**: `bajadas.usuarioId` |
| usuario → bicis | Sí (perfil, elegir bici antes de bajar) | No (máximo 5) | **Embebido**: `usuarios.bicis[]`, cada una con su `_id` |
| bajada → bici | Solo para mostrar el tipo | — | **Referencia** `bajadas.biciId` (→ `usuarios.bicis._id`) **+ copia** de `tipoBici` |
| bajada → reseña | Sí (la reseña es de esa bajada y se escribe con ella) | No (0 o 1) | **Embebido**: `bajadas.resena` |
| sendero → reseñas | Sí (página del sendero) | **Sí** (crece con cada rider nuevo) | **No embebido**: se buscan en `bajadas` con `resena: { $exists: true }` |

**¿Por qué las reseñas no van dentro del sendero?** Se leen con el sendero, pero ese array crecería sin límite:
cada rider nuevo agrega una. Es el anti-patrón del **array sin tope**: el documento del sendero se haría cada vez
más pesado (y podría llegar a los 16 MB). En cambio, dentro de la bajada hay **como máximo una**, y la bajada ya
sabe de qué sendero y de qué rider es, así que la reseña no repite `senderoId` ni `usuarioId`.

**¿Y por qué las bicis sí van dentro del usuario, si se usan en bajadas?** Porque son pocas, con tope (5), y se
leen siempre con el rider. Para que una bajada pueda apuntar a una bici embebida, cada bici guarda su propio
`_id`: `bajadas.biciId` es ese `_id`.

**¿Por qué la referencia va en el lado N?** Porque el lado N es el que crece. La bajada sabe de qué sendero
es (`senderoId`, un solo valor que no cambia). Si fuera al revés, el sendero tendría un array con 9.000 ids
que crece con cada bajada. Es la misma regla que en SQL: la clave foránea va en la tabla "muchos".

**La copia de `tipoBici` (desnormalización a propósito):** cada bajada guarda `biciId` (la referencia) y
también `tipoBici` ("DH", "Enduro"...). Es un dato repetido, pero el ranking (C3) muestra el tipo de bici de
cada fila y así no necesita un segundo `$lookup` a `usuarios`. Como el tipo de una bici no cambia, la copia nunca
queda desactualizada. Cuando sí necesitamos más datos de la bici (C12, el recorrido de suspensión), hacemos el
`$lookup` a `usuarios` por `bicis._id`.

### 3.3 Cómo se ve cada documento

Estos son documentos reales de la base (los arrays largos están recortados).

**`usuarios`**: una cuenta real (las del seed no tienen `email` ni contraseña), con sus bicis adentro.

```js
{
  _id: ObjectId("6ad8d5047c060e2bdf964736"),   // clave primaria: la crea MongoDB
  nombre: "Lucas R.",
  email: "lucas@mail.com",
  hashContrasena: "9f2c…",                       // nunca la contraseña: ver sección 8
  salContrasena: "41ab…",
  nivel: "avanzado",                             // principiante | intermedio | avanzado
  ciudad: "Mendoza",
  anioInicio: 2012,
  fechaCreacion: ISODate("2026-10-21T15:06:44Z"),
  bicis: [                                       // embebidas: máximo 5
    { _id: ObjectId("6ad8d5047c060e2bdf964739"), // la bici: bajadas.biciId apunta acá
      tipo: "Enduro", marca: "Santa Cruz", modelo: "Megatower", anio: 2023,
      rodado: "mullet", recorridoDelanteroMm: 170, recorridoTraseroMm: 165,
      principal: true },                         // la bici que se usa si no elegís otra (una sola)
    { _id: ObjectId("6ad8d5047c060e2bdf96473b"), // segunda bici (ejemplo ilustrativo)
      tipo: "DH", marca: "Specialized", modelo: "Demo", anio: 2021,
      rodado: "29", recorridoDelanteroMm: 200, recorridoTraseroMm: 200,
      principal: false }
  ]
}
```

**`senderos`**: los tramos van adentro; `inicio` y `fin` son puntos GeoJSON.

```js
{
  _id: ObjectId("6ad8d4c1b50902bfe11e3f91"),
  codigo: "circuito-dh-pequia",                  // el nombre que va en la URL
  nombre: "Circuito DH Pequia",
  descripcion: "…", dificultad: "intermedia", terreno: "tierra seca",
  inicio: { type: "Point", coordinates: [-68.89533, -32.8959] },  // [longitud, latitud]
  fin:    { type: "Point", coordinates: [-68.89357, -32.89347] },
  tramos: [
    { dificultad: "facil",
      puntos: [ { ubicacion: { type: "Point", coordinates: [-68.89533, -32.8959] }, elevacionM: 948 }, … ] },
    …                                          // 13 tramos en Pequia
  ],
  tiempoMinimoS: 30,                             // anti-trampa: más rápido que esto no vale
  estadisticas: { largoM: 363, desnivelM: 31, pendientePromedioPct: 8.5, tiempoPromedioS: 52 }
}
```

**`bajadas`**: tres referencias, los datos de la corrida y, si el rider opinó, la reseña adentro.

```js
{
  _id: ObjectId("6ad8d506b50902bfe11e3f94"),
  senderoId: ObjectId("6ad8d4c1b50902bfe11e3f91"),  // → senderos._id
  usuarioId: ObjectId("6ad8d5047c060e2bdf964736"),  // → usuarios._id
  biciId:    ObjectId("6ad8d5047c060e2bdf964739"),  // → usuarios.bicis._id (no está si no hubo bici)
  tipoBici: "Enduro",                               // copia del tipo de la bici
  fechaInicio: ISODate("2026-10-21T15:05:51Z"),
  duracion: 52272,                                  // milisegundos (52,27 s)
  velocidadPromedioKmh: 25, desnivelM: 31,
  estado: "completada",                             // completada | interrumpida (SOS)
  valida: true,                                     // la decide el servidor, no el celular
  esDemo: false,
  recorrido: [ [-68.89533, -32.8959, 0], …, [-68.89357, -32.89347, 52272] ],  // [lng, lat, ms]
  idCorrida: "circuito-dh-pequia-1792595203488",    // evita guardar la misma corrida dos veces
  fechaCreacion: ISODate("2026-10-21T15:06:46Z"),
  resena: {                                         // embebida: solo si el rider opinó (0 o 1)
    calificacion: 5,                                // entero de 1 a 5
    comentario: "Mucha piedra suelta",              // hasta 500 caracteres
    fecha: ISODate("2026-10-21T15:07:10Z")
  }
}
```

Una bajada inválida además tiene `motivoInvalida` (por ejemplo `"SOS"`). Los campos que no aplican **no
existen** en el documento (no se guardan como `null`): una bajada demo no tiene `biciId` ni `tipoBici`, y una
bajada sin opinión no tiene `resena`. La reseña no repite `senderoId` ni `usuarioId`: los saca de su bajada.

**`sesiones`**: una por login abierto.

```js
{
  _id: ObjectId("…"),
  hashToken: "e3b0c442…",                        // SHA-256 del token de la cookie (64 caracteres)
  usuarioId: ObjectId("6ad8d5047c060e2bdf964736"),
  fechaCreacion: ISODate("…"),
  venceEn: ISODate("…")                          // a los 30 días: el índice TTL la borra sola
}
```

**Cantidades del seed:** 70 usuarios, 105 bicis (embebidas en los usuarios), 3 senderos, 20.017 bajadas, 153
reseñas (embebidas en las bajadas).

## 4. Cómo se referencian los documentos (de verdad)

### 4.1 `_id` y `ObjectId`

Todo documento de MongoDB tiene un campo `_id`, y es su **clave primaria**: único dentro de la colección y
con un índice que MongoDB crea solo. Si no le damos un valor al insertar, el driver genera un **`ObjectId`**:
un número de 12 bytes que se muestra como 24 caracteres hexadecimales (`6ad8d5047c060e2bdf964736`).

```
 6ad8d504   7c060e2bdf   964736
 └──┬───┘   └───┬────┘   └─┬──┘
 segundos    al azar     contador
 (fecha de   (por        (sube en 1
 creación)   proceso)    por documento)
```

Como empieza con la fecha, **ordenar por `_id` es ordenar por fecha de creación**. C13 lo usa para listar
las bicis de la más vieja a la más nueva sin necesitar un campo de fecha. En la shell:
`ObjectId("6ad8d5047c060e2bdf964736").getTimestamp()` devuelve la fecha.

### 4.2 Una referencia es solo un `ObjectId` copiado

En MongoDB **no hay "claves foráneas" como en SQL**. Una referencia es, literalmente, guardar en un documento
el `_id` de otro:

```js
// la bajada guarda el _id de su rider
bajadas:  { _id: ObjectId("…f94"), usuarioId: ObjectId("…736"), … }
usuarios: { _id: ObjectId("…736"), nombre: "Lucas R.", … }
```

`usuarioId` es la **clave foránea** del modelo (FK) y `_id` es la **clave primaria** (PK). Es lo mismo que una
tabla `bajadas` con `id` y `usuario_id` en SQL. La diferencia: **MongoDB no controla que la referencia exista**.
Si borrás un usuario, sus bajadas quedan apuntando a un `_id` que ya no está (no hay `ON DELETE CASCADE`). Por
eso tampoco se pueden borrar bicis: hay bajadas que apuntan a su `_id`.

**Entonces, ¿quién garantiza que las referencias sean correctas?**

1. **El validador** (`$jsonSchema`, sección 6) exige que `usuarioId` sea de tipo `objectId`. No deja guardar un
   texto o un número, pero no sabe si ese `_id` existe.
2. **El código**, que nunca inventa un `_id`: siempre lo saca de un documento que acaba de leer. Por ejemplo,
   `POST /api/descents` busca el sendero por su `codigo` y usa el `_id` que devuelve:

   ```js
   const trail = await db.collection("senderos").findOne({ codigo: input.trailSlug });
   if (!trail) return 404;                       // si no existe, no se guarda nada
   const descent = { senderoId: trail._id, usuarioId: userId, … };
   ```

   El `usuarioId` sale de la sesión (sección 8) y el `biciId` de una bici buscada **dentro del documento del
   que está logueado**: `findOne({ _id: usuarioDeLaSesion, "bicis._id": biciId }, { projection: { "bicis.$": 1 } })`.
   La proyección posicional `"bicis.$"` devuelve solo la bici que coincidió. La bici de otro rider no está en
   ese documento, así que no se puede apuntar a ella (403).

### 4.3 Cómo el seed arma las referencias

El seed no puede escribir los `_id` a mano porque los genera MongoDB. Hace esto, en orden:

1. **Usuarios primero.** Por cada rider hace un *upsert* por `nombre` (si existe lo actualiza, si no lo crea)
   y guarda en un `Map` de JavaScript `nombre → _id`.
2. **Senderos.** Lo mismo por `codigo`, y guarda `id del mock → _id`.
3. **Bicis.** Le genera un `_id` nuevo a cada bici (`new ObjectId()`), arma `"Lucas R.|DH" → _id de la bici`
   y las guarda con `$set: { bicis: [...] }` **dentro** de cada rider (un solo `bulkWrite` para todos).
4. **Bajadas.** Cada documento se arma con los tres mapas: `senderoId: trailIds.get(…)`,
   `usuarioId: userIds.get(…)`, `biciId: bikeIds.get(…)`.
5. **Reseñas.** Cada reseña del seed se embebe en la **primera bajada válida** de ese rider en ese sendero. Si
   el rider ya tiene una reseña en ese sendero, o no tiene ninguna bajada válida ahí, se saltea (por eso quedan
   153 y no 306).

El orden importa: no se puede crear una bajada antes de tener el `_id` de su sendero, su usuario y su bici.

**Las colecciones viejas:** si existen `bicis` o `resenas` (del modelo anterior), el seed copia las bicis y
reseñas de las **cuentas reales** a su nuevo lugar, conservando el `_id` de cada bici, y no borra nada. Después
se pueden borrar a mano en Compass con `db.bicis.drop()` y `db.resenas.drop()`.

**¿Por qué upsert y no insertar siempre?** Para que el seed se pueda correr muchas veces sin duplicar nada y
sin cambiar los `_id` de usuarios y senderos (si cambiaran, las bajadas reales que apuntan a ellos quedarían
huérfanas). Lo que sí se reemplaza son las bicis y las bajadas (con sus reseñas) **de los riders del seed**,
que son los usuarios **sin email**: `{ email: { $exists: false } }`. Las cuentas reales tienen email y no se tocan.

### 4.4 Cómo se vuelven a unir: `$lookup`

Guardar referencias tiene un costo: para mostrar "nombre del rider + su tiempo" hay que **unir** `bajadas` con
`usuarios`. Eso es `$lookup`, el `JOIN` de MongoDB:

```js
{ $lookup: {
    from: "usuarios",          // la otra colección
    localField: "usuarioId",   // el campo de ESTE documento (la FK)
    foreignField: "_id",       // el campo del OTRO documento (la PK)
    as: "usuario"              // dónde poner el resultado
} }
```

Por cada bajada, MongoDB busca en `usuarios` los documentos cuyo `_id` sea igual a `usuarioId` y los pone en un
**array** llamado `usuario`. Siempre es un array (aunque sea uno solo), por eso casi siempre le sigue
`{ $unwind: "$usuario" }`, que lo convierte en un objeto y permite escribir `"$usuario.nombre"`.

- **Es rápido** porque `foreignField: "_id"` tiene índice: cada búsqueda es directa.
- **Conviene achicar antes de unir.** C3 hace `$match`, `$sort`, `$group` y `$limit: 10` **antes** del
  `$lookup`: une 10 documentos en vez de 9.000.
- **`$lookup` con `let` + `pipeline`** (sección 14.4): permite poner condiciones propias dentro de la unión.
- **`$lookup` contra un array embebido** (C12): si `foreignField` es un campo dentro de un array
  (`"bicis._id"`), coincide con **cualquier** elemento del array. Así C12 encuentra al dueño de cada bici.
- **Lo embebido no necesita `$lookup`:** C13 (perfil con sus bicis) lee un solo documento de `usuarios`, porque
  las bicis ya están adentro.

**Relación 1 a N en las dos direcciones:**

- Desde el lado N (bajada → su usuario): `$lookup` en `bajadas` con `localField: "usuarioId"`,
  `foreignField: "_id"` (C3, C9, C10, C11). Devuelve 1.
- Desde el lado 1 (usuario → sus bajadas): `$lookup` en `usuarios` con `localField: "_id"`,
  `foreignField: "usuarioId"` (sección 14.12, "riders sin ningún descenso"). Devuelve N.

## 5. Índices: cómo funcionan por dentro

### 5.1 Qué es un índice

Sin índice, para encontrar las bajadas de Pequia MongoDB tiene que leer **los 20.017 documentos** uno por uno
(un *collection scan*, `COLLSCAN`). Un índice es una estructura aparte, un **árbol B** (*B-tree*), que guarda
los valores de uno o más campos **ordenados**, y al lado de cada valor un puntero al documento:

```
Índice { senderoId: 1, estado: 1, valida: 1, duracion: 1 }  (ordenado, como una guía telefónica;
                                                             tiempos de ejemplo)

  (Gloria,  completada, true,  41200) → doc
  (Llorón,  completada, true,  44100) → doc
  …
  (Pequia,  completada, false, 31000) → doc
  (Pequia,  completada, true,  37542) → doc   ← el más rápido de Pequia
  (Pequia,  completada, true,  37872) → doc
  (Pequia,  completada, true,  37972) → doc
  …
  (Pequia,  interrumpida, false, 21000) → doc
```

Como está ordenado, MongoDB baja por el árbol directo a donde empieza `(Pequia, completada, true, …)` (como
buscar una palabra en el diccionario, sin leer todas las páginas). Ahí los tiempos **ya están ordenados de
menor a mayor**, así que para el top 10 lee 10 entradas y frena. Eso es un *index scan*, `IXSCAN`.

### 5.2 La prueba: `explain("executionStats")`

`npm run explain` corre cada consulta dos veces sobre la base local: forzando a no usar índices
(`hint({ $natural: 1 })`) y dejando que MongoDB elija. Resultado con los 20.017 descensos:

| Consulta | Modo | Plan | Docs leídos | Claves leídas | Devueltos |
|---|---|---|---|---|---|
| C3 ranking | sin índice | `SORT > COLLSCAN` | 20.017 | 0 | 10 |
| C3 ranking | con índice | `LIMIT > FETCH > IXSCAN` | **10** | 10 | 10 |
| C4 mejor tiempo | sin índice | `COLLSCAN` | 20.017 | 0 | 3 |
| C4 mejor tiempo | con índice | `FETCH > IXSCAN` | 8.598 | 8.598 | 3 |
| C9 reseñas | sin índice | `SORT > COLLSCAN` | 20.017 | 0 | 52 |
| C9 reseñas | con índice | `FETCH > IXSCAN` | **52** | 52 | 52 |

**Cómo leerlo:**

- `COLLSCAN` = leyó toda la colección. `IXSCAN` = recorrió el índice. `FETCH` = después fue a buscar el
  documento completo. `SORT` = tuvo que ordenar en memoria (con índice no hace falta: ya viene ordenado).
- Lo que hay que mirar es **docs leídos contra devueltos**: cuanto más se parecen, mejor le queda el índice. C3
  pasa de leer 20.017 a leer 10. El tiempo en ms cambia entre corridas (caché, otros programas); los docs
  leídos no.
- **C4 mejora menos, y está bien explicarlo:** usa el mismo índice, pero `usuarioId` no es parte de él. Lee
  todas las bajadas válidas de Pequia (8.598) y después descarta las que no son de Lucas. Un índice
  `{ usuarioId: 1, senderoId: 1 }` le quedaría justo. No lo creamos porque ninguna pantalla usa C4: cada
  índice tiene un costo (siguiente punto).
- **C9 lee de `bajadas`:** como las reseñas viven dentro de las bajadas, sin índice recorre las 20.017 para
  encontrar las 52 reseñas de Pequia. Con el índice parcial `resenas_por_sendero` lee solo esas 52, ya
  ordenadas por fecha.
- **C1 no tiene versión "sin índice":** `$geoNear` sin el índice 2dsphere da error
  ("geoNear expression not allowed with $natural hint"). Necesita el índice para funcionar.
- El informe completo se regenera con `npm run explain` (escribe `docs/explain.md`, siempre en la base local).

### 5.3 El orden de los campos importa (índices compuestos)

Un índice compuesto `{ senderoId, estado, valida, duracion }` está ordenado **primero** por `senderoId`,
dentro de cada sendero por `estado`, y así. Por eso:

- **Sirve** para filtrar por `senderoId`, por `senderoId + estado`, por los tres, y ordenar por `duracion`.
- **No sirve** para filtrar solo por `estado` o solo por `duracion`: es como buscar en una guía telefónica
  ordenada por apellido cuando solo sabés el nombre. A esto se le llama la **regla del prefijo**.
- La receta para armarlo es **ESR**: primero los campos de **E**quality (igualdad: `senderoId`, `estado`,
  `valida`), después el de **S**ort (orden: `duracion`), al final los de **R**ange (rangos como `$gt`).

### 5.4 Tipos de índice que usamos

- **Único** (`unique: true`): la base rechaza un segundo documento con el mismo valor (error **11000**,
  *duplicate key*). Ejemplo: `senderos.codigo`, `usuarios.nombre`. Es la última palabra: aunque dos pedidos
  lleguen al mismo milisegundo, uno de los dos falla.
- **Parcial** (`partialFilterExpression`): el índice solo incluye los documentos que cumplen una condición.
  Así usamos un índice único para una **regla de negocio**:
  - `bajadas { usuarioId: 1, senderoId: 1 }` único, pero **solo** entre las bajadas que tienen `resena`
    (`una_resena_por_usuario_y_sendero`) → un rider puede tener muchas bajadas en Pequia, pero **una sola
    con reseña**. El segundo intento da error 11000. Las bajadas sin reseña quedan afuera del índice.
  - `bajadas { idCorrida: 1 }` único parcial → si el celular manda la misma corrida dos veces (doble clic,
    reintento por mala señal), se guarda una vez.
  - `usuarios { email: 1 }` único parcial → los riders del seed no tienen email; sin el parcial, todos "sin
    email" chocarían entre sí.
  - **Ojo: un índice parcial solo se usa si la consulta incluye su condición.** `resenas_por_sendero`
    (`{ senderoId: 1, "resena.fecha": -1 }`, parcial con `resena: { $exists: true }`) no tiene las bajadas
    sin reseña. Si C9 filtrara solo por `senderoId`, MongoDB no podría usarlo (le faltarían documentos). Por
    eso C9 filtra `resena: { $exists: true }`.
- **Multikey** (sobre un campo dentro de un array): `usuarios { "bicis._id": 1 }` guarda **una entrada por
  cada bici** de cada usuario. Lo usa el `$lookup` de C12 para encontrar al dueño de una bici. **No** es único.
- **¿Por qué "una sola bici principal" ya no es un índice?** Un índice único compara **documentos distintos**,
  no los elementos de un mismo array. Con las bicis adentro del usuario, dos bicis principales estarían en el
  **mismo** documento y el índice no lo vería. Ahora lo cuidan dos cosas: cambiar la principal es un solo
  `updateOne` con `arrayFilters` (sección 8.3) y el validador tiene una regla `$expr` (sección 6).
- **TTL** (`expireAfterSeconds`): en `sesiones { venceEn: 1 }` con `expireAfterSeconds: 0`. Un proceso de
  MongoDB revisa cada ~60 segundos y **borra solo** los documentos cuya fecha ya pasó. Las sesiones vencidas
  se limpian sin código nuestro.
- **2dsphere** (geoespacial): en `senderos { inicio: "2dsphere" }`. MongoDB divide la esfera terrestre en
  celdas cada vez más chicas (geometría **S2**) y guarda en el árbol B en qué celda cae cada punto. Para "lo
  que está a menos de 10 km", busca las celdas que tocan ese círculo y después mide la distancia real sobre la
  esfera. Hace funcionar `$geoNear` (C1), `$near` y `$geoWithin` (C2). Los puntos tienen que estar en
  **GeoJSON**: `{ type: "Point", coordinates: [longitud, latitud] }` (primero la longitud).

### 5.5 Todos los índices y por qué

| Colección | Índice | Tipo | Para qué |
|---|---|---|---|
| `senderos` | `{ inicio: "2dsphere" }` | geo | C1 senderos cercanos, C2 "¿estoy en la salida?" |
| `senderos` | `{ codigo: 1 }` | único | C8: abrir un sendero desde la URL; no hay dos iguales |
| `bajadas` | `{ senderoId, estado, valida, duracion }` | compuesto | C3 ranking, C4, C10: filtra y lee los tiempos ya ordenados |
| `bajadas` | `{ idCorrida: 1 }` | único parcial | Que una corrida no se guarde dos veces |
| `bajadas` | `resenas_por_sendero` `{ senderoId: 1, "resena.fecha": -1 }` | compuesto parcial | C9: reseñas de un sendero, la más nueva primero |
| `bajadas` | `una_resena_por_usuario_y_sendero` `{ usuarioId: 1, senderoId: 1 }` | único parcial | Una reseña por rider y por sendero |
| `usuarios` | `{ nombre: 1 }` | único | El seed busca por nombre; no se repite |
| `usuarios` | `{ email: 1 }` | único parcial | Login por email; dos cuentas no comparten email |
| `usuarios` | `{ "bicis._id": 1 }` | multikey | C12: encontrar al dueño de una bici en el `$lookup` |
| `sesiones` | `{ hashToken: 1 }` | único | Encontrar la sesión en cada pedido |
| `sesiones` | `{ venceEn: 1 }` | TTL | Borrar solas las sesiones vencidas |

Además, cada colección tiene el de `_id` (automático). Por eso en Compass `senderos` y `sesiones` muestran **3
índices**, `usuarios` **4** y `bajadas` **5**.

**El costo de un índice:** cada `insert` o `update` tiene que actualizar también cada índice de la colección, y
ocupan espacio (en Atlas, los índices de `bajadas` pesan 1,7 MB contra 4,4 MB de datos). Por eso no se indexa
todo: solo lo que una consulta real necesita.

## 6. Validación con `$jsonSchema`

MongoDB acepta documentos de cualquier forma (es *schemaless*). Eso es cómodo, pero un bug o un error en
Compass podrían guardar `calificacion: "cinco"`. Por eso cada colección tiene un **validador**: reglas que
MongoDB revisa en cada `insert` y `update`, y si no se cumplen rechaza la escritura (error **121**,
*Document failed validation*).

```js
// parte del validador de bajadas
bajadas: {
  bsonType: "object",
  required: ["senderoId", "usuarioId", "fechaInicio", "duracion", "estado", "valida"],
  properties: {
    senderoId: { bsonType: "objectId" },               // tiene que ser un ObjectId
    resena: {                                          // opcional, pero si está tiene que ser así:
      bsonType: "object",
      required: ["calificacion", "comentario", "fecha"],
      properties: {
        calificacion: { bsonType: "int", minimum: 1, maximum: 5 },
        comentario: { bsonType: "string", maxLength: 500 },
        fecha: { bsonType: "date" }
      }
    }
  }
}
```

Qué controla: campos **obligatorios** (`required`), **tipos** (`bsonType`), **rangos** (`minimum`, `maximum`,
`minLength`), **valores permitidos** (`enum: ["DH", "Enduro", "Trail"]`), **formatos** (`pattern`, por
ejemplo el email) y **tamaño de arrays** (`maxItems`: `usuarios.bicis` acepta hasta 5). Todos los validadores
están en `scripts/seed.ts` (`VALIDATORS`).

**Reglas que `$jsonSchema` no puede expresar:** "una sola bici con `principal: true`" compara elementos entre
sí, y eso `$jsonSchema` no lo sabe hacer. Por eso el validador de `usuarios` tiene, al lado del `$jsonSchema`,
una regla `$expr` (un operador de consulta normal):

```js
{ $expr: { $lte: [ { $size: { $filter: { input: { $ifNull: ["$bicis", []] }, cond: "$$this.principal" } } }, 1 ] } }
// $filter deja solo las bicis principales, $size las cuenta, y tienen que ser 1 o menos.
// $ifNull: un usuario sin bicis cuenta como array vacío.
```

Si alguien intenta guardar un usuario con dos bicis principales, la base lo rechaza con error 121 (probado).

- **Se aplican de dos formas:** si la colección no existe, `createCollection(nombre, { validator })`; si ya
  existe y tiene datos, el comando `collMod`, que cambia sus reglas.
- **Dos capas:** la API también valida (con mensajes en español para la pantalla), y el validador es la
  última línea de defensa por si algo se escapa.
- **Lo que no hace:** no verifica que una referencia exista (sección 4.2). Solo que sea un `ObjectId`.

Ver las reglas de una colección: `db.getCollectionInfos({ name: "usuarios" })[0].options.validator`.

## 7. El código: el viaje de una bajada

### 7.1 Cómo está ordenado el proyecto

Es una app **Next.js** (React en el navegador y código de servidor en el mismo proyecto) escrita en
TypeScript. Lo que importa para la materia:

| Carpeta / archivo | Qué hay |
|---|---|
| `src/lib/mongodb.ts` | **La única conexión** a MongoDB (driver oficial `mongodb`, sin Mongoose) |
| `src/lib/queries/` | **Las 13 consultas**, una por archivo (`c3-leaderboard.ts`…), con el pipeline para Compass arriba |
| `src/app/api/` | La API: lo que corre en el servidor cuando el navegador guarda o pide algo |
| `src/lib/data/trail-data.ts` | Pasa los documentos de Mongo al formato de las pantallas, y decide qué mostrar si Mongo no anda |
| `src/lib/descents/` | Las reglas que deciden si una bajada vale (`descent-rules.ts`) y la validación del pedido |
| `src/lib/auth/` | Contraseñas (`password.ts`) y sesiones (`session.ts`) |
| `scripts/seed.ts` | Crea validadores e índices y carga los datos |
| `scripts/queries.ts`, `scripts/explain.ts` | `npm run queries` (imprime C1–C12) y `npm run explain` (mide los índices) |
| `src/app/cerro/`, `mapa/`, `perfil/`… | Las pantallas |

**Por qué el driver oficial y no Mongoose:** con el driver, la consulta del código es la misma que se escribe en
Compass (`db.collection("bajadas").aggregate([...])`). Mongoose agrega una capa de "modelos" que esconde las
consultas, y lo que queremos mostrar son justamente las consultas.

**Una sola conexión (singleton):** `mongodb.ts` crea un `MongoClient` y lo reutiliza en toda la app. Abrir una
conexión es caro, y el cliente ya maneja un *pool* de conexiones por dentro. Si Mongo no responde en 3 segundos
(`serverSelectionTimeoutMS: 3000`), `isDbAvailable()` devuelve `false` y la pantalla muestra un mensaje claro
en lugar de romperse. Si la base no anda, el mapa y el ranking muestran los datos de ejemplo de
`src/lib/mock-data.ts`, para que el modo demo funcione igual.

### 7.2 De la pantalla a MongoDB y de vuelta

```
 Celular (navegador)                 Servidor (Vercel o npm run dev)              MongoDB
 ───────────────────                 ───────────────────────────────              ───────
 1. El GPS junta puntos
    [lng, lat, ms] mientras bajás
 2. Al llegar: POST /api/descents ─▶ 3. validateDescentBody: ¿los datos tienen
    { trailSlug, durationMs,            la forma correcta? (si no → 400)
      track, isDemo, runId… }        4. findOne en senderos por codigo ───────▶ IXSCAN codigo
                                     5. ¿Quién es? cookie → sesiones ─────────▶ IXSCAN hashToken
                                        ¿Con qué bici? usuarios {_id, "bicis._id"} ▶ IXSCAN _id
                                     6. ¿Arrancó en la salida? C2 $geoWithin ──▶ 2dsphere inicio
                                        evaluarDescenso: SOS, muy rápido,
                                        no llegó al final, velocidad imposible…
                                     7. updateOne({ idCorrida }, $setOnInsert,
                                        upsert) en bajadas ───────────────────▶ único idCorrida
 8. Muestra "válida" o el motivo ◀── { validated, status, invalidReason }
 9. Abre el ranking: GET /api/trails/circuito-dh-pequia/leaderboard
                                ───▶ C3 aggregate en bajadas ─────────────────▶ índice compuesto
                                                                                + $lookup usuarios
                                ◀─── las 10 filas
```

Detalles que vale la pena saber explicar:

- **El servidor no le cree al celular** (paso 6): el navegador podría mandar un tiempo inventado. La validez la
  decide el servidor con el rastro GPS, y para la salida le pregunta a MongoDB con una consulta geoespacial.
  Las bajadas inválidas se guardan igual (con `valida: false` y `motivoInvalida`) pero nunca entran al ranking,
  porque C3 filtra `valida: true`.
- **Idempotencia** (paso 7): `$setOnInsert` + `upsert` sobre `idCorrida` significa "si no existe una bajada con
  este `idCorrida`, creala; si ya existe, no toques nada". Con el índice único, ni dos pedidos simultáneos
  pueden duplicarla. El celular reintenta solo a los 30 s si no hubo señal.
- **El código está en inglés y la base en español:** variables y funciones en inglés (convención de
  programación), y documentos y resultados de las consultas en español. La traducción pasa en un solo lugar
  por colección: al armar el documento antes de guardarlo (`estado: status === "completed" ? "completada" : …`)
  y en `trail-data.ts` al leerlo.

## 8. Cuentas, sesiones y permisos

Hay **dos niveles de permisos** distintos, y conviene no mezclarlos:

1. **En la app:** qué puede hacer cada persona que usa DH (un rider logueado, alguien sin cuenta).
2. **En la base:** qué puede hacer el **usuario de base de datos** con el que la app (o vos desde Compass) se
   conecta a MongoDB.

### 8.1 Contraseñas: nunca se guardan

Al registrarte, la contraseña pasa por **scrypt** (viene con Node.js, `node:crypto`) junto con una **sal**
(16 bytes al azar, distinta por usuario), y se guarda solo el resultado: `hashContrasena` y `salContrasena`.

- **Un hash no se puede revertir:** con `hashContrasena` no se obtiene la contraseña. Al hacer login se vuelve
  a calcular scrypt con la contraseña que escribiste y la sal guardada, y se comparan los resultados.
- **scrypt es lento a propósito:** probar millones de contraseñas contra un hash robado tarda demasiado.
- **La sal** hace que dos personas con la misma contraseña tengan hashes distintos.
- **La comparación** usa `timingSafeEqual`, que tarda lo mismo sin importar en qué byte difieren, para que nadie
  adivine el hash midiendo tiempos de respuesta.
- **Mismo mensaje** para "no existe ese email" y "contraseña incorrecta", así nadie puede averiguar qué emails
  tienen cuenta.
- C13 hace `$project: { hashContrasena: 0, salContrasena: 0 }`: el hash nunca sale de la base.

### 8.2 Sesiones: cómo sabe el servidor quién sos

1. Al registrarte o loguearte, el servidor genera un **token al azar** (32 bytes) y lo manda en una **cookie
   `httpOnly`** (el JavaScript de la página no la puede leer, así un script malicioso no la roba).
2. En `sesiones` guarda el **SHA-256 del token** (`hashToken`), no el token. Si la base se filtrara, esos hashes
   no sirven como cookie.
3. En cada pedido, el servidor toma la cookie, calcula su SHA-256 y busca en `sesiones` (índice único en
   `hashToken`) una que no esté vencida. De ahí saca el `usuarioId`.
4. La sesión dura **30 días**. Al vencer, el índice **TTL** la borra sola. Cerrar sesión la borra en el momento.

**¿Por qué en MongoDB y no en la memoria del servidor?** En Vercel el servidor no vive todo el tiempo: cada pedido
lo puede atender una instancia nueva que arranca de cero. Si la sesión estuviera en memoria, se perdería entre un
clic y el siguiente. Guardada en `sesiones`, cualquier instancia la encuentra con el `hashToken` de la cookie.
Por eso la colección existe aunque esté vacía: el seed la crea con su validador y sus índices, y se llena cuando
alguien se loguea (en Atlas si es la app publicada, en la local si es `npm run dev` contra la local).

`sesiones` tiene **3 índices**: el de `_id` (automático, en toda colección) más los dos nuestros (`hashToken` y
el TTL). La tabla completa está en la sección 5.5.

### 8.3 Qué puede hacer cada uno en la app

MongoDB **no tiene permisos por fila** para los usuarios de una app (no existe "este rider solo ve sus bicis").
Lo resolvemos en el código con una regla: **cada consulta que toca datos de un rider filtra por el `usuarioId`
de la sesión, nunca por un id que mande el navegador**.

```js
// PATCH /api/bikes/:id/primary — cambia la principal en UN solo update (src/lib/bikes/set-primary-bike.ts)
db.usuarios.updateOne(
  { _id: ObjectId("MY_USER_ID"), "bicis._id": ObjectId("BIKE_ID") },   // MY_USER_ID sale de la cookie
  { $set: { "bicis.$[otra].principal": false, "bicis.$[elegida].principal": true } },
  { arrayFilters: [{ "otra._id": { $ne: ObjectId("BIKE_ID") } }, { "elegida._id": ObjectId("BIKE_ID") }] }
)
// con la bici de otro, no está en tu documento: matchedCount 0 → 404
```

`arrayFilters` le pone nombre a grupos de elementos del array: `otra` son todas las bicis menos la elegida, y
`elegida` es la elegida. Los dos cambios pasan en la **misma** escritura, así que nunca quedan dos principales
(ni ninguna).

| Acción | Sin cuenta | Con cuenta | Cómo se controla |
|---|---|---|---|
| Ver senderos, mapa, ranking y reseñas | ✅ | ✅ | Lectura pública |
| Bajada en **modo demo** | ✅ (se guarda como "Demo rider", `esDemo: true`) | ✅ | — |
| Bajada con **GPS real** | ❌ (401) | ✅ con su bici | `usuarioId` de la sesión; la bici se busca con `{ _id: usuarioId, "bicis._id": biciId }` (si no es suya, 403) |
| Agregar bicis | ❌ | ✅ hasta 5 | `$push` con filtro `{ _id: usuarioId, "bicis.4": { $exists: false } }` (atómico: no hay lugar para una sexta) + `maxItems: 5` en el validador |
| Elegir la bici principal | ❌ | ✅ solo las suyas | `updateOne` con `arrayFilters` sobre su propio documento + regla `$expr` del validador |
| Borrar una bici | ❌ | ❌ | No hay ruta: hay bajadas que apuntan a su `_id` |
| Reseñar | ❌ | ✅ solo su propia bajada, válida, con GPS real; una vez por bajada y una vez por sendero | `updateOne({ _id, resena: { $exists: false } }, { $set: { resena } })` (si no coincide, 409) + índice `una_resena_por_usuario_y_sendero` (error 11000 → 409) |
| Ver su perfil | ❌ | ✅ el propio | C13 con el `_id` de la sesión |
| Tocar datos de otro rider | ❌ | ❌ | Todas las consultas filtran por el `usuarioId` de la sesión |

### 8.4 Permisos en la base (Atlas y local)

**Atlas** protege la base con tres capas:

1. **Network Access (lista de IPs):** desde qué direcciones se puede conectar. Hoy está `0.0.0.0/0` (cualquiera)
   para que Vercel, que cambia de IP, pueda entrar. **Después de la presentación hay que sacarlo.**
2. **Usuario y contraseña de base de datos** (*Database Access*): va dentro de la cadena `mongodb+srv://…`. No
   tiene nada que ver con las cuentas de la app: la app entera usa **un solo** usuario de base para todo.
3. **Rol** de ese usuario: qué comandos puede ejecutar.

| Rol en Atlas | Qué permite | Qué NO permite |
|---|---|---|
| **Read and write to any database** (`readWriteAnyDatabase`), el que tenemos | Leer, insertar, actualizar y borrar documentos; crear colecciones e índices; borrar colecciones (`drop`) | Comandos de administración como `collMod`: **no puede cambiar el validador de una colección que ya existe** |
| **Atlas admin** (`atlasAdmin`) | Todo lo anterior + administración (`collMod`, ver usuarios, etc.) | — |
| **Only read any database** (`readAnyDatabase`) | Solo leer | Cualquier escritura |

Por eso el seed avisa *"No permission to add the validator…"* cuando la colección ya existía en Atlas: para
cambiar reglas de una colección existente hace falta `collMod`. Cuando la colección es nueva, el validador se
crea junto con ella (`createCollection`), y eso sí está permitido con "read and write". Así se cargaron los
validadores cuando pasamos la base al español. La app solo necesita leer y escribir documentos, así que el rol
mínimo correcto para ella es "read and write": es el **principio de mínimo privilegio** (cada usuario tiene
solo los permisos que necesita).

**La base local** no tiene usuario ni contraseña, y no hace falta: MongoDB escucha solo en `127.0.0.1`
(*localhost*), así que solo se puede conectar alguien desde tu propia compu.

## 9. Las consultas C1 a C13

"C1", "C3"... es una numeración nuestra: "Consulta 1", "Consulta 3". Cada una vive en
`src/lib/queries/` con un comentario arriba que tiene el pipeline listo para pegar en Compass (pestaña
**Aggregations**), y en la sección 15 están todas para la shell.

| | Qué pregunta responde | Concepto de la materia | Dónde se ve |
|---|---|---|---|
| **C1** | ¿Qué senderos hay cerca de donde estoy? | `$geoNear` (índice 2dsphere) | API `/api/trails/nearby` |
| **C2** | ¿El rider arrancó dentro del círculo de salida? | `$geoWithin` + `$centerSphere` | Servidor, al guardar una bajada (anti-trampa) |
| **C3** | ¿Quiénes son los 10 más rápidos de un sendero? | `$match` + `$sort` + `$group` + `$limit` + `$lookup` a `usuarios` | Ranking |
| **C4** | ¿Cuál es el mejor tiempo de un rider en un sendero? | `$group` con `$min` y `$sum` | Compass / `npm run queries` |
| **C5** | ¿Cuántas estrellas tiene en promedio cada sendero? | `$match` de las bajadas con `resena` + `$group` con `$avg` sobre un campo embebido + `$lookup` a `senderos` | Página del sendero |
| **C6** | ¿Cuántas bajadas tiene cada sendero (totales y válidas)? | `$group` + `$cond` + `$lookup` (conteo cruzado) | Compass |
| **C7** | Lista de senderos | `find` con `sort` | Mapa |
| **C8** | Un sendero por su nombre de URL | `findOne` por índice único (`codigo`) | Página del sendero |
| **C9** | Reseñas de un sendero, las más nuevas primero | `$match` + `$sort` sobre un índice parcial + `$lookup` a `usuarios` | Página del sendero |
| **C10** | Mejor tiempo por nivel (principiante, intermedio, avanzado) | `$lookup` a `usuarios` + `$group` por un campo unido | Compass |
| **C11** | ¿Cuántas bajadas hay por ciudad y cuántos riders distintos? | `$lookup` + `$group` + `$addToSet` / `$size` | Compass |
| **C12** | Bajadas válidas, velocidad y suspensión promedio por tipo de bici | `$lookup` a un array embebido (`usuarios.bicis._id`) + `$filter` + `$avg` | Compass |
| **C13** | Perfil de un rider con todas sus bicis | Embebido: un solo documento, sin `$lookup`; `$sortArray` ordena dentro del documento | Mi perfil |

**Cómo se lee un pipeline (C3 como ejemplo):** cada etapa recibe lo que sale de la anterior, como una cadena
de montaje.

```
bajadas (20.017)
  │ $match  { senderoId: Pequia, estado: "completada", valida: true }   → 8.598   (usa el índice)
  │ $sort   { duracion: 1 }                                             → ordenadas (ya vienen del índice)
  │ $group  { _id: "$usuarioId", duracion: { $first: "$duracion" } … } → 1 fila por rider (su mejor tiempo)
  │ $sort   { duracion: 1 }                                             → $group no mantiene el orden
  │ $limit  10                                                          → 10
  │ $lookup usuarios (usuarioId → _id) + $unwind                        → cada fila con su usuario
  │ $project { ciclista: "$usuario.nombre", duracion, tipoBici … }      → la fila que ve la pantalla
  ▼
10 filas
```

`$first` toma el valor del **primer** documento de cada grupo. Como la entrada ya está ordenada por
`duracion`, el primero de cada rider es su bajada más rápida.

**Comandos útiles** (en la carpeta del proyecto):

| Comando | Qué hace |
|---|---|
| `npm run seed` | Carga los datos en la base que diga tu `.env.local` |
| `npm run queries` | Imprime en la terminal los resultados de C1 a C6 y C10 a C12 |
| `npm run explain` | Mide los índices (siempre en la base local) y actualiza `docs/explain.md` |
| `npm run dev` | Levanta la app en http://localhost:3000 |

**Para la presentación:** repártanse las consultas (3 o 4 cada uno) y sepan explicar cada etapa sin mirar. Si
el profe pregunta "¿qué hace este `$unwind`?", siempre hay alguien que la tiene clara.

---

# Parte II — Practicar en la shell

Todo está pensado para pegarse en la **shell mongosh integrada en MongoDB Compass**. Cada consulta explica
qué pregunta **responde**, el **código** listo para pegar y qué **concepto** de la materia muestra.

> **Pegá una instrucción por vez.** Si pegás varias líneas sueltas juntas (por ejemplo una consulta y
> `show collections`), la shell las toma como una sola y da `SyntaxError: Missing semicolon`.

> Las secciones 10 a 16 solo leen. Las escrituras (secciones 17.2 y 18) se practican en una base aparte,
> `dh_practica`, para no romper los datos del proyecto.

## 10. Cómo abrir la shell

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

## 11. Inspección

**Responde:** qué hay en la base.
**Concepto:** exploración del esquema flexible de MongoDB.

```js
show collections

db.usuarios.countDocuments()
db.senderos.countDocuments()
db.bajadas.countDocuments()

// Las reseñas y las bicis están embebidas: se cuentan dentro de su colección
db.bajadas.countDocuments({ resena: { $exists: true } })                      // 153 con el seed
db.usuarios.aggregate([ { $group: { _id: null, bicis: { $sum: { $size: { $ifNull: ["$bicis", []] } } } } } ])  // 105

// Un documento de ejemplo de cada colección
db.senderos.findOne({}, { tramos: 0 })   // sin el campo pesado
db.bajadas.findOne()
db.bajadas.findOne({ resena: { $exists: true } }, { recorrido: 0 })   // una bajada con su reseña
db.usuarios.findOne({ nombre: "Lucas R." }, { hashContrasena: 0, salContrasena: 0 })   // con sus bicis

// Valores distintos de un campo
db.bajadas.distinct("tipoBici")
db.bajadas.distinct("motivoInvalida")
db.usuarios.distinct("bicis.marca")      // notación punto: entra a cada bici del array

// Qué índices tiene cada colección
db.senderos.getIndexes()
db.bajadas.getIndexes()
db.usuarios.getIndexes()
```

> `distinct("motivoInvalida")` muestra `"SOS"` (seed) y `"sos"` (app) escritos distinto. Es un buen ejemplo de por qué conviene validar el esquema (sección 17).

---

## 12. find: filtros, proyección, orden

### 12.1 Igualdad y proyección

**Responde:** el sendero Pequia, mostrando solo algunos campos.
**Concepto:** filtro por igualdad + proyección (`1` incluye, `0` excluye).

```js
db.senderos.find(
  { codigo: "circuito-dh-pequia" },
  { _id: 0, nombre: 1, dificultad: 1, terreno: 1, estadisticas: 1 }
)
```

### 12.2 Comparación: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`

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

### 12.3 `$in` y `$nin`

**Responde:** los descensos hechos en bici de DH o Enduro.
**Concepto:** pertenencia a un conjunto.

```js
db.bajadas.find({ tipoBici: { $in: ["DH", "Enduro"] } }).count()
```

### 12.4 `$and`, `$or`, `$not`

**Responde:** los descensos no válidos o interrumpidos.
**Concepto:** operadores lógicos.

```js
db.bajadas.find({
  $or: [ { valida: false }, { estado: "interrumpida" } ]
}, { _id: 0, duracion: 1, estado: 1, valida: 1, motivoInvalida: 1 })
```

> Dos condiciones sobre campos distintos en el mismo objeto ya son un AND implícito: `{ estado: "completada", valida: true }`.

### 12.5 `$exists` y `$type`

**Responde:** los descensos guardados desde la app (los únicos que tienen `idCorrida`).
**Concepto:** esquema flexible, porque no todos los documentos tienen los mismos campos.

```js
db.bajadas.find({ idCorrida: { $exists: true } })
db.bajadas.find({ tipoBici: { $exists: false } })   // las bajadas sin bici no tienen tipoBici
```

### 12.6 `$regex`

**Responde:** los senderos cuyo nombre empieza con "Bajada" (sin importar mayúsculas).
**Concepto:** búsqueda por patrón.

```js
db.senderos.find({ nombre: { $regex: "^bajada", $options: "i" } }, { _id: 0, nombre: 1 })
```

### 12.7 Campos embebidos (notación punto)

**Responde:** los senderos de más de 1000 m de largo.
**Concepto:** consultar dentro de subdocumentos.

```js
db.senderos.find({ "estadisticas.largoM": { $gt: 1000 } }, { _id: 0, nombre: 1, "estadisticas.largoM": 1 })
```

### 12.8 Arrays de subdocumentos: `$elemMatch` y `$size`

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

// Lo mismo con las bicis embebidas: riders con una bici DH de rodado 29 (la MISMA bici)
db.usuarios.find(
  { bicis: { $elemMatch: { tipo: "DH", rodado: "29" } } },
  { _id: 0, nombre: 1 }
)

// Riders que ya llegaron al tope de 5 bicis
db.usuarios.find({ bicis: { $size: 5 } }, { _id: 0, nombre: 1 })
```

### 12.9 Fechas

**Responde:** los descensos de septiembre de 2026.
**Concepto:** rangos de fechas con `ISODate`.

```js
db.bajadas.find({
  fechaInicio: { $gte: ISODate("2026-09-01T00:00:00-03:00"), $lt: ISODate("2026-10-01T00:00:00-03:00") }
}).count()
```

### 12.10 `sort`, `limit` y `skip` (paginación)

**Responde:** los 5 descensos más rápidos, y después la "página 2".
**Concepto:** orden y paginación.

```js
db.bajadas.find({ valida: true }, { _id: 0, duracion: 1 }).sort({ duracion: 1 }).limit(5)
db.bajadas.find({ valida: true }, { _id: 0, duracion: 1 }).sort({ duracion: 1 }).skip(5).limit(5)
```

### 12.11 Usando una referencia

**Responde:** todos los descensos de Lucas R.
**Concepto:** las referencias son ObjectIds. Primero buscás el `_id` y después filtrás.

```js
db.bajadas.find({ usuarioId: lucas._id }, { _id: 0, duracion: 1, fechaInicio: 1, valida: 1 })
```

---

## 13. Geoespaciales (GIS)

El proyecto tiene un índice **2dsphere** en `senderos.inicio`. Sin ese índice, `$near`, `$nearSphere` y `$geoNear` **fallan**. En cambio, `$geoWithin` y `$geoIntersects` funcionan sin índice, aunque más lento.

### 13.1 `$near`: senderos más cercanos a un punto

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

### 13.2 `$nearSphere`

**Responde:** lo mismo que 5.1, calculado siempre sobre la esfera.
**Concepto:** diferencia entre geometría plana y esférica. Con GeoJSON y 2dsphere, los dos dan lo mismo.

```js
db.senderos.find(
  { inicio: { $nearSphere: { $geometry: { type: "Point", coordinates: salidaPequia }, $maxDistance: 5000 } } },
  { _id: 0, nombre: 1 }
)
```

### 13.3 `$geoWithin` + `$centerSphere`: ¿estoy dentro del radio?

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

### 13.4 `$geoWithin` + polígono

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

### 13.5 `$geoIntersects`: ¿la salida cae en una zona?

**Responde:** qué senderos tienen la salida (`inicio`, un Point) tocando la zona.
**Concepto:** intersección entre geometrías, punto contra polígono. Con un punto da lo mismo que `$geoWithin`; la diferencia aparece con líneas o polígonos que cruzan el borde.

```js
db.senderos.find({ inicio: { $geoIntersects: { $geometry: zonaMendoza } } }, { _id: 0, nombre: 1 })
```

### 13.6 `$geoNear` en una aggregation, con distancia calculada

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

## 14. Aggregations

Un pipeline es una cadena de etapas, y cada etapa recibe lo que devolvió la anterior.

### 14.1 `$group` + `$sum`: conteo por categoría

**Responde:** cuántos descensos hay por tipo de bici.
**Concepto:** agrupar y contar.

```js
db.bajadas.aggregate([
  { $group: { _id: "$tipoBici", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])
```

### 14.2 `$avg`, `$min`, `$max`

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

### 14.3 `$lookup` simple: traer el nombre en vez del ObjectId

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

### 14.4 `$lookup` con pipeline: incluir los que tienen cero

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

### 14.5 `$unwind` sobre arrays embebidos

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

**Responde:** cuántas bicis hay de cada tipo, contando las de todos los riders.
**Concepto:** el mismo `$unwind`, ahora sobre las bicis embebidas en `usuarios`.

```js
db.usuarios.aggregate([
  { $unwind: "$bicis" },
  { $group: { _id: "$bicis.tipo", bicis: { $sum: 1 }, principales: { $sum: { $cond: ["$bicis.principal", 1, 0] } } } },
  { $sort: { bicis: -1 } }
])
```

### 14.6 `$project` / `$addFields` con cálculos

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

### 14.7 Motivos de invalidez

**Responde:** por qué se invalidaron los descensos y cuántos hay de cada motivo.
**Concepto:** `$match` + `$group` + normalización con `$toLower`.

```js
db.bajadas.aggregate([
  { $match: { valida: false } },
  { $group: { _id: { $toLower: "$motivoInvalida" }, cantidad: { $sum: 1 } } }
])
```

### 14.8 `$dateToString`: descensos por mes

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

### 14.9 `$bucket`: histograma de tiempos

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

### 14.10 `$facet`: varios reportes en una sola consulta

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

### 14.11 `$count`

**Responde:** cuántos descensos válidos hay en Pequia.
**Concepto:** contar al final de un pipeline.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, valida: true } },
  { $count: "descensosValidos" }
])
```

### 14.12 Conteos cruzados entre colecciones

**Responde:** riders sin ningún descenso.
**Concepto:** `$lookup` + filtrar por array vacío, el equivalente a un LEFT JOIN … WHERE NULL.

```js
db.usuarios.aggregate([
  { $lookup: { from: "bajadas", localField: "_id", foreignField: "usuarioId", as: "d" } },
  { $match: { d: { $size: 0 } } },
  { $project: { _id: 0, nombre: 1 } }
])
```

**Responde:** cuántos descensos, cuántas opiniones y cuántas bicis tiene cada rider.
**Concepto:** `$lookup` con `let` + `pipeline` para traer de `bajadas` solo las que tienen `resena`, al lado de un
array embebido (`bicis`) que no necesita ningún `$lookup`.

```js
db.usuarios.aggregate([
  { $lookup: { from: "bajadas", localField: "_id", foreignField: "usuarioId", as: "d" } },
  { $lookup: {
      from: "bajadas",
      let: { u: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$usuarioId", "$$u"] }, resena: { $exists: true } } },
        { $count: "n" }
      ],
      as: "r"
  } },
  { $project: { _id: 0, rider: "$nombre", descensos: { $size: "$d" },
                opiniones: { $ifNull: [ { $arrayElemAt: ["$r.n", 0] }, 0 ] },
                bicis: { $size: { $ifNull: ["$bicis", []] } } } },
  { $sort: { descensos: -1 } }
])
```

**Responde:** cuántos riders opinaron sobre cada sendero, y si alguno opinó dos veces (tiene que dar que no).
**Concepto:** `$group` por dos campos (`usuarioId` + `senderoId`): es la regla "una reseña por rider y por
sendero" que cuida el índice `una_resena_por_usuario_y_sendero`.

```js
db.bajadas.aggregate([
  { $match: { resena: { $exists: true } } },
  { $group: { _id: { usuario: "$usuarioId", sendero: "$senderoId" }, opiniones: { $sum: 1 } } },
  { $group: { _id: "$_id.sendero", riders: { $sum: 1 }, maximoPorRider: { $max: "$opiniones" } } },
  { $lookup: { from: "senderos", localField: "_id", foreignField: "_id", as: "t" } },
  { $unwind: "$t" },
  { $project: { _id: 0, sendero: "$t.nombre", riders: 1, maximoPorRider: 1 } }   // maximoPorRider: siempre 1
])
```

### 14.13 Bonus: `$setWindowFields` (posición en el ranking)

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

## 15. Las consultas de la app (C1–C13)

Son las mismas que usa la app (`src/lib/queries/`), escritas para la shell. Antes de correrlas, ejecutá las variables de la sección 10.

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

**Concepto:** las reseñas viven dentro de `bajadas`: primero se quedan solo las que tienen `resena`, y `$avg`
promedia un campo embebido (`"$resena.calificacion"`).

```js
db.bajadas.aggregate([
  { $match: { resena: { $exists: true } } },
  { $group: { _id: "$senderoId", promedio: { $avg: "$resena.calificacion" }, cantidad: { $sum: 1 } } },
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

**Concepto:** `$match` + `$sort` sobre el índice parcial `resenas_por_sendero` (`{ senderoId: 1, "resena.fecha": -1 }`)
y `$lookup` a `usuarios`. El filtro `resena: { $exists: true }` es obligatorio: un índice parcial solo se usa si
la consulta incluye su condición.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, resena: { $exists: true } } },
  { $sort: { "resena.fecha": -1 } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
  { $unwind: "$usuario" },
  { $project: { _id: 0, autor: "$usuario.nombre", comentario: "$resena.comentario", calificacion: "$resena.calificacion", fecha: "$resena.fecha" } }
])
```

### C10 — Mejor tiempo por nivel

**Concepto:** `$lookup` para traer un campo de otra colección (el nivel vive en `usuarios`) y `$group` por ese campo.

```js
db.bajadas.aggregate([
  { $match: { senderoId: pequia._id, estado: "completada", valida: true } },
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
  { $unwind: "$usuario" },
  { $match: { "usuario.nivel": { $exists: true } } },
  { $sort: { duracion: 1 } },
  { $group: { _id: "$usuario.nivel", mejorTiempo: { $first: "$duracion" }, ciclista: { $first: "$usuario.nombre" }, bajadasValidas: { $sum: 1 } } },
  { $project: { _id: 0, nivel: "$_id", mejorTiempo: 1, ciclista: 1, bajadasValidas: 1 } },
  { $sort: { mejorTiempo: 1 } }
])
```

### C11 — Bajadas por ciudad

**Concepto:** `$addToSet` guarda cada `usuarioId` una sola vez; `$size` cuenta cuántos riders **distintos** hay.

```js
db.bajadas.aggregate([
  { $lookup: { from: "usuarios", localField: "usuarioId", foreignField: "_id", as: "usuario" } },
  { $unwind: "$usuario" },
  { $match: { "usuario.ciudad": { $exists: true } } },
  { $group: { _id: "$usuario.ciudad", totalBajadas: { $sum: 1 }, bajadasValidas: { $sum: { $cond: ["$valida", 1, 0] } }, ciclistas: { $addToSet: "$usuarioId" } } },
  { $project: { _id: 0, ciudad: "$_id", totalBajadas: 1, bajadasValidas: 1, ciclistas: { $size: "$ciclistas" } } },
  { $sort: { totalBajadas: -1, ciudad: 1 } }
])
```

### C12 — Bajadas válidas por tipo de bici

**Concepto:** `$lookup` contra un **array embebido**: `foreignField: "bicis._id"` coincide con **cualquier**
bici del array, así que trae al dueño completo (usa el índice multikey `{ "bicis._id": 1 }`). Después `$filter` +
`$first` sacan de su array solo la bici de esta bajada, y `$avg` mezcla un campo de la bajada (velocidad) con uno
de la bici (suspensión).

```js
db.bajadas.aggregate([
  { $match: { valida: true, biciId: { $type: "objectId" } } },
  { $lookup: { from: "usuarios", localField: "biciId", foreignField: "bicis._id", as: "duenio" } },
  { $unwind: "$duenio" },
  { $set: { bici: { $first: { $filter: { input: "$duenio.bicis", cond: { $eq: ["$$this._id", "$biciId"] } } } } } },
  { $group: { _id: "$bici.tipo", bajadasValidas: { $sum: 1 }, velocidadPromedioKmh: { $avg: "$velocidadPromedioKmh" }, recorridoDelanteroPromedioMm: { $avg: "$bici.recorridoDelanteroMm" } } },
  { $project: { _id: 0, tipoBici: "$_id", bajadasValidas: 1, velocidadPromedioKmh: { $round: ["$velocidadPromedioKmh", 1] }, recorridoDelanteroPromedioMm: { $round: ["$recorridoDelanteroPromedioMm", 0] } } },
  { $sort: { velocidadPromedioKmh: -1 } }
])
```

### C13 — Perfil de un rider con sus bicis

**Concepto:** embebido. Las bicis ya están dentro del usuario: un solo documento, **sin `$lookup`**. `$sortArray`
ordena el array **dentro** del documento (la principal primero, después la más vieja: el `_id` empieza con la
fecha de creación).

```js
db.usuarios.aggregate([
  { $match: { _id: lucas._id } },
  { $set: { bicis: { $sortArray: { input: "$bicis", sortBy: { principal: -1, _id: 1 } } } } },
  { $project: { hashContrasena: 0, salContrasena: 0 } }
])
```

---

## 16. Índices y explain

### 16.1 Qué índices hay y por qué

La tabla completa, con el porqué de cada uno, está en la [sección 5.5](#55-todos-los-índices-y-por-qué).

### 16.2 `explain("executionStats")`: con índice vs. sin índice

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

> Un buen índice hace que `totalDocsExamined ≈ nReturned`. Con las 20.017 bajadas del seed la diferencia ya es clara: mirá la tabla de la sección 5.2.

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
db.bajadas.find({ senderoId: pequia._id, resena: { $exists: true } }).sort({ "resena.fecha": -1 }).explain("executionStats")
db.bajadas.find({ senderoId: pequia._id, resena: { $exists: true } }).sort({ "resena.fecha": -1 }).hint({ $natural: 1 }).explain("executionStats")
```

Con el seed: con índice `FETCH > IXSCAN` (52 claves, 52 docs, 52 resultados); sin índice `SORT > COLLSCAN` (lee
las 20.017 bajadas). Probá sacar `resena: { $exists: true }` del filtro: en el `winningPlan` vas a ver que MongoDB
ya no usa `resenas_por_sendero` (le faltarían las bajadas sin reseña): usa el índice del ranking
(`senderoId_1_estado_1_valida_1_duracion_1`) y aparece un `SORT` en memoria (`SORT > FETCH > IXSCAN`).

### 16.3 ¿Se usan los índices?

**Responde:** cuántas veces se usó cada índice desde que arrancó el servidor.
**Concepto:** monitoreo de índices (solo lectura).

```js
db.bajadas.aggregate([ { $indexStats: {} } ])
```

---

## 17. Validación con `$jsonSchema`

### 17.1 Primero, chequear sin modificar nada

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
    esDemo:        { bsonType: "bool" },
    resena: {                                              // solo en las bajadas con opinión
      bsonType: "object",
      required: ["calificacion", "comentario", "fecha"],
      properties: {
        calificacion: { bsonType: "int", minimum: 1, maximum: 5 },
        comentario:   { bsonType: "string", maxLength: 500 },
        fecha:        { bsonType: "date" }
      }
    }
  }
}

// Documentos que NO cumplen el esquema (debería dar 0)
db.bajadas.find({ $nor: [ { $jsonSchema: esquemaDescents } ] }).count()
```

La regla `$expr` de `usuarios` (sección 6) también se puede probar así, solo leyendo:

```js
// Usuarios con más de una bici principal (debería dar 0)
db.usuarios.find({ $expr: { $gt: [ { $size: { $filter: { input: { $ifNull: ["$bicis", []] }, cond: "$$this.principal" } } }, 1 ] } }).count()
```

### 17.2 Aplicarlo (escribe la configuración de la colección)

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

## 18. Escrituras (con cuidado, en `dh_practica`)

> **Nunca practiques escrituras en `dh`.** Copiá las colecciones a una base aparte con `$out`. Eso solo **lee** de `dh` y escribe en `dh_practica`.

```js
use dh
db.senderos.aggregate([   { $out: { db: "dh_practica", coll: "senderos" } } ])
db.usuarios.aggregate([    { $out: { db: "dh_practica", coll: "usuarios" } } ])
db.bajadas.aggregate([ { $out: { db: "dh_practica", coll: "bajadas" } } ])

use dh_practica
```

Con eso alcanza: las bicis viajan dentro de `usuarios` y las reseñas dentro de `bajadas`.

> `$out` copia los datos pero **no los índices**. Tenés que recrearlos con `createIndex` en `dh_practica`, y eso de paso sirve de práctica (sección 18.4).

### 18.1 `updateOne`: guardar una opinión (lo que hace `POST /api/reviews`)

La reseña no es un documento nuevo: se agrega **dentro** de una bajada. El filtro `resena: { $exists: false }`
hace que solo se guarde si esa bajada todavía no tiene una.

```js
const p = db.senderos.findOne({ codigo: "circuito-dh-pequia" })
const u = db.usuarios.findOne({ nombre: "Lucas R." })
// una bajada válida de Lucas en Pequia que todavía no tenga reseña
const b = db.bajadas.findOne({ senderoId: p._id, usuarioId: u._id, valida: true, resena: { $exists: false } })
db.bajadas.updateOne(
  { _id: b._id, resena: { $exists: false } },
  { $set: { resena: { calificacion: 5, comentario: "Prueba de inserción", fecha: new Date() } } }
)
// Corrélo dos veces: la segunda da matchedCount: 0 (la app responde 409 "Ya dejaste una reseña para este descenso.")
```

> Si Lucas ya tenía una reseña en Pequia (en otra bajada) y recreaste el índice `una_resena_por_usuario_y_sendero`
> (sección 18.4), este `updateOne` da **error 11000**: es la regla "una reseña por rider y por sendero" (la app
> responde 409 *"Ya dejaste una reseña para este sendero."*). Para ver el caso que funciona, probá con un sendero
> donde no haya opinado.

### 18.2 `updateOne` con `$set` e `$inc`

```js
db.bajadas.updateOne({ "resena.comentario": "Prueba de inserción" }, { $set: { "resena.comentario": "Comentario editado" } })
db.senderos.updateOne({ codigo: "circuito-dh-pequia" }, { $inc: { "estadisticas.tiempoPromedioS": 1 } })
```

### 18.3 Upsert idempotente (como `POST /api/descents`)

Si corrés esto dos veces, el segundo intento **no** duplica, porque `$setOnInsert` solo escribe cuando el documento es nuevo.

```js
db.bajadas.updateOne(
  { idCorrida: "practica-1" },
  { $setOnInsert: { senderoId: p._id, usuarioId: u._id, fechaInicio: new Date(), duracion: 50000,
                    estado: "completada", valida: true } },
  { upsert: true }
)
```

### 18.4 Recrear un índice (en `dh_practica`)

```js
db.bajadas.createIndex({ senderoId: 1, estado: 1, valida: 1, duracion: 1 })
db.senderos.createIndex({ inicio: "2dsphere" })
// único parcial: una reseña por rider y por sendero
db.bajadas.createIndex(
  { usuarioId: 1, senderoId: 1 },
  { unique: true, partialFilterExpression: { resena: { $exists: true } }, name: "una_resena_por_usuario_y_sendero" }
)
```

---

## 19. Ejercicios

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

---

# Parte III — Resguardo

## 20. Política de resguardo (backups)

Una copia de seguridad sirve para una sola cosa: **volver a tener los datos** después de un error (un
`deleteMany` sin filtro, un seed corrido contra la base equivocada), una falla del disco o una cuenta comprometida.
Esta política dice qué copiamos, cómo, cada cuánto, cuánto tiempo lo guardamos y cómo lo recuperamos.

Usamos las **MongoDB Database Tools** (`mongodump` y `mongorestore`), que se instalan aparte del servidor. Las
dos funcionan igual contra la base local y contra Atlas: solo cambia la `--uri`.

### 20.1 Ámbito de aplicación

**Qué se respalda:**

| Elemento | ¿Se respalda? | Por qué |
|---|---|---|
| Base `dh` en **Atlas** (las 4 colecciones) | Sí, es lo más importante | Ahí escriben los usuarios reales de la app publicada. Esos datos **no se pueden regenerar**. |
| Base `dh` **local** (las 4 colecciones) | Sí | Es la base que se evalúa. Se puede volver a cargar con `npm run seed`, pero se pierde lo que hayamos probado a mano. |
| Índices y validadores `$jsonSchema` | Sí, van solos | `mongodump` guarda en cada colección un archivo de metadatos con sus índices y sus opciones (incluido el validador). `mongorestore` los vuelve a crear. |
| Bases `admin`, `local`, `config` | No | Son internas de MongoDB (sección 2.1). En Atlas las maneja el servicio. |
| Código y scripts | No (ya están) | Viven en GitHub, con todo su historial. |
| `.env.local` (contraseña de Atlas) | No | Es un secreto: nunca se copia junto a los datos. Si se pierde, se genera una contraseña nueva en Atlas. |

**Quiénes:** los cuatro integrantes del equipo. Cada semana hay **un responsable** (rota en el orden Augustus,
Nicolas, Ariel, Josefina) que corre las copias y anota el resultado. Los archivos de respaldo contienen emails y
hashes de contraseñas, así que **solo los ve el equipo**: no se suben al repositorio ni se comparten por fuera.

### 20.2 Mecanismos de copia según infraestructura

Seguimos la **regla 3-2-1**: 3 copias de los datos, en 2 medios distintos, 1 fuera del lugar.

| Copia | Medio | Cómo |
|---|---|---|
| 1 | La base misma (Atlas o local) | Los datos originales. |
| 2 | **Disco** de la compu del responsable, fuera del repo: `C:\respaldos\dh\` | `mongodump` comprimido en un solo archivo. |
| 3 | **Nube**: carpeta compartida del equipo en Google Drive | Se sube el mismo archivo. Si se rompe o se roba la compu, la copia sigue existiendo. |

Lo que **no** usamos, y por qué:

- **Cintas:** son para volúmenes de terabytes y guardado por años. Nuestra base comprimida pesa unos pocos MB.
- **Servidor dedicado de backups:** no tenemos uno, y para este volumen un disco más la nube cubren lo mismo.
- **El replica set de Atlas como "backup":** los 3 servidores de Atlas (sección 2.1) protegen contra que se caiga
  una máquina, **no contra un error nuestro**. Si alguien corre `db.bajadas.deleteMany({})`, el borrado se copia
  a los 3 servidores en un segundo. Replicar no es respaldar.
- **Las copias automáticas de Atlas:** el plan gratuito (M0) no las incluye. Por eso hacemos el `mongodump` nosotros.

Los comandos (en PowerShell; `--gzip --archive` deja todo en un único archivo comprimido):

```powershell
# Base local
$fecha = Get-Date -Format yyyy-MM-dd
mongodump --uri="mongodb://127.0.0.1:27017/dh" --gzip --archive="C:\respaldos\dh\local-$fecha.gz"

# Atlas (la cadena es la del .env.local, termina en /dh)
mongodump --uri="mongodb+srv://USUARIO:CONTRASEÑA@dh.35crots.mongodb.net/dh" --gzip --archive="C:\respaldos\dh\atlas-$fecha.gz"
```

En la práctica no se escriben a mano: los corre el script `scripts/backup.ps1` (sección 20.6), que además
verifica la copia, la anota y borra las viejas.

### 20.3 Periodicidad de ejecución

La frecuencia depende de **cuánto cambia la base y cuánto nos duele perder un día**:

| Base | Cuándo | Por qué |
|---|---|---|
| Atlas | **Todos los días**, a la noche | Recibe datos reales que no se pueden recrear. Perder como mucho un día es aceptable para el proyecto. |
| Local | **Una vez por semana** (domingo) | Cambia poco y casi todo sale del seed. |
| Las dos | **Antes de cualquier operación riesgosa** | Correr el seed, cambiar un validador, renombrar o borrar colecciones (por ejemplo, borrar las colecciones viejas en inglés). Es el momento en que más fácil se pierde algo. |

Todas las copias son **completas** (toda la base), no incrementales: con este tamaño tardan segundos, y para
recuperar alcanza con un solo archivo, sin tener que encadenar varios.

### 20.4 Período de retención

| Tipo de copia | Cuántas se guardan | Qué pasa con las viejas |
|---|---|---|
| Diaria (Atlas) | Las últimas **7** | La de hace 8 días se borra. |
| Semanal (local y la del domingo de Atlas) | Las últimas **4** | La de hace 5 semanas se borra. |
| Antes de una operación riesgosa | Hasta la siguiente copia semanal verificada | Se borra cuando hay una semanal más nueva que restauró bien. |
| Final del ciclo lectivo | **1**, hasta que la materia esté aprobada por los cuatro | Después se destruye. |

Se guardan 7 diarias porque un error puede tardar días en notarse (por ejemplo, un ranking que "se ve raro").
Destruir significa borrar el archivo del disco, vaciar la papelera y borrarlo también de Google Drive (incluida
su papelera).

**Marco legal:** la base tiene datos personales (nombre de usuario, email, ciudad). La Ley 25.326 de Protección
de Datos Personales pide guardarlos con seguridad y **no conservarlos más tiempo del necesario** para lo que
fueron recolectados. Por eso la retención es corta y tiene fecha de fin: terminado el proyecto, las copias se
destruyen. Como no somos una empresa, no hay una norma de auditoría que nos obligue a guardar años.

### 20.5 Disponibilidad y recuperación

Una copia que nunca se probó **no es una copia**: puede estar vacía, cortada o ser de la base equivocada. Por eso:

- **Prueba mensual:** el responsable restaura la última copia en una base aparte, `dh_restore`, sin tocar `dh`, y
  comprueba que esté completa.
- **Objetivos:** perder como mucho **1 día** de datos en Atlas y **1 semana** en local (RPO), y volver a tener la
  base andando en **menos de 30 minutos** (RTO). Con unos pocos MB, la restauración real tarda segundos; el resto
  es encontrar el archivo y verificar.

**Probar una copia** (restaura en `dh_restore`, la base `dh` no se toca):

```powershell
mongorestore --uri="mongodb://127.0.0.1:27017" --gzip --archive="C:\respaldos\dh\local-2026-10-26.gz" `
  --nsFrom="dh.*" --nsTo="dh_restore.*"
```

Y en la shell de Compass, comparar contra la original:

```js
// Cantidad de documentos por colección: tiene que dar igual en dh y en dh_restore
const r = db.getSiblingDB("dh_restore")
r.getCollectionNames().forEach(c =>
  print(c, r[c].countDocuments(), db.getSiblingDB("dh")[c].countDocuments()))

// Los índices y el validador también volvieron
r.senderos.getIndexes()
r.getCollectionInfos({ name: "bajadas" })[0].options.validator

// Al terminar, borrar la base de prueba
r.dropDatabase()
```

**Recuperar de verdad** (ante un desastre en `dh`): `--drop` borra cada colección antes de cargarla, así queda
igual a la copia y no se mezclan documentos viejos y nuevos.

```powershell
mongorestore --uri="mongodb://127.0.0.1:27017" --gzip --archive="C:\respaldos\dh\local-2026-10-26.gz" --drop
```

Para Atlas es el mismo comando con su `--uri`. Después de restaurar, se abre la app y se revisa que el ranking de
un sendero muestre datos.

Si no hay ninguna copia que sirva, el último recurso es `npm run seed`: recupera la estructura (colecciones,
índices, validadores) y los datos de prueba, pero **no** las cuentas ni las bajadas reales.

### 20.6 El script de backup (`scripts/backup.ps1`)

El script hace en un solo paso todo lo de las secciones 20.2 a 20.4: la copia, la verificación, el registro y
la retención. Es PowerShell porque las cuatro compus del equipo son Windows.

**Cómo se usa:**

```powershell
# Base local (o: npm run backup)
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1

# Atlas: la cadena va en una variable de entorno, nunca escrita en el script
$env:ATLAS_URI = "mongodb+srv://USUARIO:CONTRASEÑA@dh.35crots.mongodb.net/dh"
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1 -Base atlas
```

Deja `C:\respaldos\dh\local-2026-10-26.gz` (o `atlas-…`) y una línea en `C:\respaldos\dh\backup.log`. Ese
archivo es la anotación del responsable de la semana (sección 20.1).

**Qué hace, parte por parte:**

| Parte | Código | Qué hace |
|---|---|---|
| Parámetros | `param([ValidateSet("local","atlas")] $Base = "local", $Destino = "C:\respaldos\dh")` | Qué base copiar y dónde dejar la copia. `ValidateSet` rechaza cualquier otro valor. |
| 1. Conexión | `$uri = "mongodb://127.0.0.1:27017/dh"` o `$env:ATLAS_URI` | La de Atlas tiene la contraseña: sale de una variable de entorno. Si falta, el script avisa y termina. |
| Chequeo previo | `Get-Command mongodump` | Si las Database Tools no están instaladas, lo dice claro en vez de fallar con un error raro. |
| 2. Nombre | `"$Base-$fecha.gz"` en `$Destino` | Un archivo por base y por día, fuera del repo. `New-Item -Force` crea la carpeta si no existe. |
| 3. Copia | `mongodump --uri=... --gzip --archive=...` | Copia las 4 colecciones con sus índices y validadores, comprimidas en un solo archivo. |
| 4. Verificación | `$LASTEXITCODE -ne 0`, `Test-Path`, `Length -eq 0` | `mongodump` devuelve 0 si salió bien. Si no, o si el archivo no existe o está vacío, anota `ERROR` y **termina sin borrar nada**: una corrida fallida nunca puede eliminar las copias buenas. |
| Registro | `Add-Content $log "... OK ... KB"` | Fecha, base, archivo y tamaño en `backup.log`. |
| 5. Retención | `Get-ChildItem` + `Remove-Item` | Atlas: guarda las de los últimos 7 días y las de los domingos de las últimas 4 semanas. Local: las de las últimas 4 semanas. El resto se borra y queda anotado (`DELETED`). |

**Programarlo para que corra solo** (Programador de tareas de Windows, una vez por compu):

```powershell
# Atlas todas las noches (la variable ATLAS_URI tiene que estar guardada en el usuario de Windows)
schtasks /create /tn "Backup DH Atlas" /sc daily /st 23:00 /tr "powershell -ExecutionPolicy Bypass -File C:\ruta\al\proyecto\scripts\backup.ps1 -Base atlas"

# Local los domingos
schtasks /create /tn "Backup DH local" /sc weekly /d SUN /st 23:00 /tr "powershell -ExecutionPolicy Bypass -File C:\ruta\al\proyecto\scripts\backup.ps1"
```

Para guardar la variable en el usuario de Windows (así la ve la tarea programada):
`[Environment]::SetEnvironmentVariable("ATLAS_URI", "mongodb+srv://…/dh", "User")`.

**Lo que el script no hace** (queda a cargo del responsable): subir el archivo a la carpeta de Google Drive
(copia 3 de la regla 3-2-1) y la prueba mensual de restauración en `dh_restore` (sección 20.5).

---

## Glosario

- **Documento**: un objeto JSON (en realidad BSON, JSON binario con más tipos: `ObjectId`, `Date`, `int`). Es la "fila".
- **Colección**: un grupo de documentos. Es la "tabla".
- **`_id` / `ObjectId`**: la clave primaria de cada documento y el tipo de 12 bytes que la genera (sección 4.1).
- **Referencia**: un campo que guarda el `_id` de otro documento (`usuarioId`). Es la clave foránea.
- **Embebido**: un documento guardado dentro de otro (`tramos` dentro de `senderos`, `bicis` dentro de
  `usuarios`, `resena` dentro de `bajadas`).
- **Pipeline**: la lista de etapas de una aggregation. Cada etapa recibe lo que sale de la anterior.
- **`$match`**: filtra (como el `WHERE` de SQL). Conviene ponerlo primero, así usa índices.
- **`$group`**: agrupa y calcula (`$sum`, `$avg`, `$min`, `$first`, `$addToSet`).
- **`$lookup`**: trae documentos de otra colección (como un `JOIN`). El resultado siempre es un array.
- **`$unwind`**: convierte un array en un documento por elemento.
- **`$project`**: elige qué campos mostrar y con qué nombre.
- **Upsert**: "actualizá si existe, insertá si no" (`{ upsert: true }`).
- **Idempotente**: hacer la misma operación dos veces deja todo igual que hacerla una vez (`idCorrida`).
- **Índice / B-tree**: estructura ordenada que permite ir directo a los documentos (sección 5.1).
- **COLLSCAN / IXSCAN**: en un `explain`, "leí toda la colección" contra "usé un índice".
- **Único / parcial / TTL / 2dsphere / multikey**: tipos de índice (sección 5.4).
- **Índice parcial (cuándo se usa)**: solo tiene los documentos que cumplen su `partialFilterExpression`, así
  que MongoDB lo usa solo si la consulta incluye esa condición (C9 filtra `resena: { $exists: true }`).
- **`arrayFilters`**: le pone nombre a grupos de elementos de un array para cambiarlos distinto en un mismo
  `update` (`bicis.$[otra]`, `bicis.$[elegida]`, sección 8.3).
- **`$sortArray`**: ordena un array dentro del documento, sin desarmarlo (C13).
- **`$expr` en un validador**: una regla con operadores de aggregation, para lo que `$jsonSchema` no puede
  expresar (una sola bici principal, sección 6).
- **GeoJSON**: el formato de los puntos: `{ type: "Point", coordinates: [longitud, latitud] }`.
- **`$jsonSchema`**: las reglas que valida la base en cada escritura (sección 6).
- **Hash / sal**: cómo se guarda una contraseña sin guardarla (sección 8.1).
- **Rol**: el conjunto de permisos de un usuario de base de datos (sección 8.4).
