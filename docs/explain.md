# Índices: explain("executionStats") sin y con índice

Generado con `npm run explain` sobre la base local (2026-10-27).
"Sin índice" obliga a leer toda la colección con `hint({ $natural: 1 })`; "con índice" deja que MongoDB elija.

| Consulta | Modo | Plan | Docs leídos | Claves leídas | Devueltos | Tiempo (ms) |
|---|---|---|---|---|---|---|
| C3 leaderboard | sin índice | `SORT > COLLSCAN` | 20017 | 0 | 10 | 19 |
| C4 personal best | sin índice | `COLLSCAN` | 20017 | 0 | 3 | 38 |
| C9 reviews | sin índice | `SORT > COLLSCAN` | 20017 | 0 | 52 | 36 |
| C3 leaderboard | con índice | `LIMIT > FETCH > IXSCAN` | 10 | 10 | 10 | 0 |
| C4 personal best | con índice | `FETCH > IXSCAN` | 8598 | 8598 | 3 | 47 |
| C9 reviews | con índice | `FETCH > IXSCAN` | 52 | 52 | 52 | 1 |

## Cómo leerlo

- **COLLSCAN**: MongoDB leyó todos los documentos de la colección para encontrar los que sirven.
- **IXSCAN**: MongoDB recorrió el índice y leyó solo los documentos que necesitaba.
- **FETCH**: después del IXSCAN, fue a buscar el documento completo. **SORT**: tuvo que ordenar en memoria.
- El tiempo cambia de una corrida a otra (caché, otros programas). Lo que hay que comparar es "docs leídos", que no cambia.

## Las tres columnas

| Columna | En el explain | Qué cuenta |
|---|---|---|
| **Claves leídas** | `totalKeysExamined` | Entradas del **índice** que recorrió |
| **Docs leídos** | `totalDocsExamined` | Documentos **completos** que fue a buscar a la colección (eso es el `FETCH`) |
| **Devueltos** | `nReturned` | Documentos que **cumplen todo el filtro** y salen como resultado |

"Devolver" es lo que te entrega la consulta al final: si corrés el `find` de C4 en Compass, aparecen 3
documentos, y esos son los "devueltos".

El índice está ordenado, así que un `IXSCAN` no lee "de a partes": **salta directo** al primer valor que le
sirve y desde ahí lee entradas seguidas hasta que dejan de servir.

## El camino de C3 (10 / 10 / 10)

C3 filtra por `senderoId`, `estado` y `valida`, y ordena por `duracion`. Son **exactamente** los campos del
índice `{ senderoId, estado, valida, duracion }`, en el mismo orden:

1. **`IXSCAN`**: salta a "Pequia, completada, true". Ahí las entradas ya están ordenadas por `duracion`, de la
   más rápida a la más lenta.
2. **`FETCH`**: por cada entrada va a buscar el documento completo.
3. **`LIMIT`**: a las 10 entradas frena. No necesita leer más, porque las siguientes son más lentas.

Lee 10 claves, busca 10 documentos y devuelve 10: no lee nada de más.

## El camino de C4 (8.598 / 8.598 / 3)

C4 filtra por **cuatro** campos:

```js
{ senderoId: Pequia, usuarioId: Lucas, estado: "completada", valida: true }
```

Pero el índice que usa (el del ranking) es `{ senderoId, estado, valida, duracion }`: **`usuarioId` no está**.

1. **`IXSCAN`**: con el índice resuelve lo que puede, `senderoId + estado + valida`. Salta a "Pequia,
   completada, true" y lee todas esas entradas: son **todas las bajadas válidas de Pequia, 8.598**. Por eso
   claves leídas = 8.598.
2. **`FETCH`**: el índice no sabe de quién es cada bajada, porque no guarda `usuarioId`. Para cada una de las
   8.598 entradas va a buscar el documento completo y mira si `usuarioId` es Lucas. Por eso docs leídos = 8.598:
   un documento por cada clave.
3. De esas 8.598 bajadas, solo **3** son de Lucas: devueltos = 3. Las otras 8.595 las leyó para nada.

Es como buscar en una guía telefónica ordenada por **ciudad** a "Lucas, de Mendoza": la guía te deja saltar
directo a Mendoza, pero después tenés que leer a todos los de Mendoza, uno por uno, para encontrar a los Lucas.

**Cómo se arreglaría:** con un índice que tenga los campos que filtra C4, por ejemplo
`db.bajadas.createIndex({ usuarioId: 1, senderoId: 1, valida: 1 })`. Daría 3 / 3 / 3: saltaría directo a
"Lucas, Pequia, válida" y leería solo esas tres. No lo creamos porque ninguna pantalla usa C4, y cada índice
extra hace más lenta cada escritura y ocupa espacio.

**La regla para recordar:** un buen índice hace que **docs leídos ≈ devueltos**. Cuanto más grande es la
diferencia, más trabajo de más está haciendo MongoDB.

## C1 (geoespacial)

C1 ($geoNear) con hint({ $natural: 1 }) es rechazada por MongoDB: "geoNear expression not allowed with $natural hint"

`$geoNear` necesita el índice 2dsphere de `senderos.inicio`: no existe una versión "sin índice" para comparar.
