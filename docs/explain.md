# Índices: explain("executionStats") sin y con índice

Generado con `npm run explain` sobre la base local (2026-10-21).
"Sin índice" obliga a leer toda la colección con `hint({ $natural: 1 })`; "con índice" deja que MongoDB elija.

| Consulta | Modo | Plan | Docs leídos | Claves leídas | Devueltos | Tiempo (ms) |
|---|---|---|---|---|---|---|
| C3 leaderboard | sin índice | `SORT > COLLSCAN` | 20017 | 0 | 10 | 17 |
| C4 personal best | sin índice | `COLLSCAN` | 20017 | 0 | 3 | 12 |
| C9 reviews | sin índice | `SORT > COLLSCAN` | 306 | 0 | 107 | 2 |
| C3 leaderboard | con índice | `LIMIT > FETCH > IXSCAN` | 10 | 10 | 10 | 0 |
| C4 personal best | con índice | `FETCH > IXSCAN` | 8598 | 8598 | 3 | 13 |
| C9 reviews | con índice | `FETCH > IXSCAN` | 107 | 107 | 107 | 0 |

## Cómo leerlo

- **COLLSCAN**: MongoDB leyó todos los documentos de la colección para encontrar los que sirven.
- **IXSCAN**: MongoDB recorrió el índice y leyó solo los documentos que necesitaba.
- Cuanto más se parecen "docs leídos" y "devueltos", mejor le queda el índice a la consulta.
- El tiempo cambia de una corrida a otra (caché, otros programas). Lo que hay que comparar es "docs leídos", que no cambia.
- C4 usa el índice del ranking solo para `senderoId, estado, valida`: igual lee todas las bajadas válidas del sendero
  y después se queda con las de ese rider. Un índice `{ usuarioId: 1, senderoId: 1 }` le quedaría mejor.

## C1 (geoespacial)

C1 ($geoNear) con hint({ $natural: 1 }) es rechazada por MongoDB: "geoNear expression not allowed with $natural hint"

`$geoNear` necesita el índice 2dsphere de `senderos.inicio`: no existe una versión "sin índice" para comparar.
