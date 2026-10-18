# DH Leaderboard

Leaderboard de descensos de mountain bike (DH) medidos con GPS. Elegís un sendero en el
mapa, apretás play, la app mide tu bajada y actualiza el ranking del sendero. Proyecto
académico de Diseño de Bases de Datos: usa MongoDB con información geoespacial (GIS).

## Tecnologías

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Leaflet](https://leafletjs.com) con mosaicos de OpenStreetMap / OpenTopoMap
- [MongoDB](https://www.mongodb.com/try/download/community) local (Community Server + Compass) con índices geoespaciales (`2dsphere`)

## Cómo levantar la base

1. Instalá [MongoDB Community Server](https://www.mongodb.com/try/download/community) y [MongoDB Compass](https://www.mongodb.com/try/download/compass).
2. Abrí Compass y conectate a `mongodb://127.0.0.1:27017`.
3. Cargá los datos de ejemplo con `npm run seed` (se puede correr varias veces sin duplicar).

## Cómo correrla

```bash
npm install
cp .env.example .env.local   # ya apunta a la base local, no hace falta cambiarlo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Practicar consultas: base local y base online (leé esto antes de empezar)

### La idea en una línea

**Practicamos en nuestra compu (base local). La base online (Atlas) es solo para la app publicada y la presentación.**

### Las dos bases

| | Base **local** | Base **online** (MongoDB Atlas) |
| --- | --- | --- |
| Dónde está | En tu compu | En un servidor de Atlas, en internet |
| Para qué la usamos | Practicar consultas, probar, romper cosas | La app publicada en Vercel y la presentación |
| Quién la usa | Cada uno tiene la suya | Una sola, compartida por todos |
| Dirección en Compass | `mongodb://127.0.0.1:27017` | La dirección `mongodb+srv://…` (te la pasa Augustus, **no se sube a git**) |
| ¿Puedo borrar o romper datos? | Sí, sin miedo | **No.** Ahí están las cuentas y los descensos reales |
| Cuesta algo | No | Plan gratis (M0), con límites |

### Cómo practicar en tu compu (paso a paso)

1. Instalá **MongoDB Community Server** y **MongoDB Compass** (los links están en "Cómo levantar la base").
2. Cloná el repo y corré `npm install`.
3. Copiá `.env.example` a `.env.local`. Tiene que decir `MONGODB_URI=mongodb://127.0.0.1:27017/dh` (la base local).
4. Corré `npm run seed`. Carga en tu compu: 70 riders, 105 bicis, 20.017 descensos y 306 reseñas.
5. Abrí Compass, conectate a `mongodb://127.0.0.1:27017` y entrá a la base `dh`.
6. Practicá en la pestaña **Aggregations** de cada colección. Las consultas del proyecto (C1 a C13) están en `src/lib/queries/`, cada una con un comentario listo para copiar y pegar en Compass.
7. ¿Rompiste algo? Corré `npm run seed` de nuevo y vuelve todo a como estaba.

### Preguntas que nos hicimos (y sus respuestas)

**¿Hacer consultas en Atlas gasta los 512 MB gratis?**
No. Los 512 MB son **espacio para guardar datos**, como el disco de una compu. Una consulta (`find`, `aggregate`) **lee** los datos y no guarda nada, así que no ocupa espacio. Lo único que ocupa espacio es **guardar** datos nuevos (o usar `$out` / `$merge` en una agregación, que guardan el resultado en una colección).

**¿Cuánto ocupa nuestra base?**
Unos **5 MB** con todos los datos de práctica e índices: alrededor del 1 % de los 512 MB.

**Entonces, ¿por qué practicamos en local y no en Atlas?**
Porque el plan gratis de Atlas sí tiene límites, pero de **velocidad de uso**, no de espacio: cuántas operaciones por segundo y cuántos datos se transfieren por semana. Cuatro personas practicando a la vez contra la misma base pueden toparse con esos límites. Además, en Atlas un error nuestro (borrar una colección, por ejemplo) rompe la app publicada para todos. En local no le pasa nada a nadie.

**¿Compass usa mi compu para ejecutar las consultas?**
No. **Compass es solo una ventana**: manda la consulta al servidor y te muestra lo que contesta. La consulta se ejecuta **donde está la base**:

- Si en Compass estás conectado a `127.0.0.1` → se ejecuta en **tu compu**.
- Si estás conectado a la dirección de Atlas → se ejecuta en **los servidores de Atlas**.

Por eso, para usar nuestro hardware, cada uno tiene que tener la base **en su compu** (los pasos de arriba).

**¿Mis datos de práctica van a ser iguales a los de mis compañeros?**
Sí. El seed genera **siempre exactamente los mismos datos** (`scripts/seed-volume.ts` usa números "al azar" pero fijos). Si a vos C10 te da que el mejor avanzado en Pequia hizo 37,5 s, a tus compañeros también. Lo único que cambia son los `_id` (los inventa Mongo en cada compu) y las fechas de creación.

**¿Atlas tiene los mismos datos que mi base local?**
Sí, los datos de práctica son los mismos (se cargaron con el mismo seed). Además, Atlas tiene lo que guardó la app publicada: cuentas creadas y descensos reales, con `source: "app"`.

**¿Puedo correr el seed contra Atlas?**
Solo Augustus, y solo si hace falta. El seed borra y vuelve a cargar los datos de práctica (`source: "seed"`), pero **nunca toca lo que guardó la app** (`source: "app"`).

**Me registré en la app local y no puedo entrar en la publicada (o al revés). ¿Está roto?**
No. Son dos bases distintas: una cuenta creada en local existe solo en tu compu, y una creada en la app publicada existe solo en Atlas.

## Base local o MongoDB Atlas

El código es el mismo para las dos bases: lo único que cambia es `MONGODB_URI`.

| Dónde | Archivo / lugar | Valor de `MONGODB_URI` |
| --- | --- | --- |
| Desarrollo y plan B de la presentación | `.env.local` | `mongodb://127.0.0.1:27017/dh` |
| Producción (Vercel) | variable de entorno en Vercel | dirección `mongodb+srv://…` de Atlas |
| Cargar el seed en Atlas | `.env.production` | la misma dirección de Atlas |

- La dirección de Atlas **tiene que terminar en `/dh`** (antes del `?`). Sin eso, el driver usa la base `test`.
- `npm run seed` carga la base local; `npm run seed:prod` carga Atlas. Es el mismo script con los mismos datos de partida (`src/lib/mock-data.ts`). Solo borra y vuelve a insertar los descensos y reseñas con `source: "seed"`; lo que guarda la app (`source: "app"`) no se toca.
- Además de los datos de ejemplo, el seed genera volumen para practicar consultas (`scripts/seed-volume.ts`): 60 riders con nivel y ciudad, de 1 a 3 bicis cada uno, 20.000 descensos de los últimos 18 meses (alrededor del 5 % inválidos, cada uno con su motivo) y 300 reseñas. Siempre genera exactamente lo mismo, así la base local y Atlas quedan iguales.
- `/api/health` muestra a qué base está conectada la app.
- El seed también aplica la validación `$jsonSchema` de `users`, `bikes` y `sessions` (comando `collMod`). En Atlas, un usuario de base con permiso "Read and write" no puede correr `collMod`: el seed avisa y sigue sin validación. Para aplicarla, dale temporalmente el rol "Atlas admin" en Database Access y corré `npm run seed:prod` otra vez.

## Cuentas y bicis

- Registro con nombre visible, email, contraseña, nivel, ciudad, año en que empezó a andar y una primera bici (`/registro`). En "Mi perfil" (`/perfil`) se agregan más bicis y se elige la principal.
- La contraseña se guarda como hash scrypt con sal propia; la sesión es una cookie httpOnly y en `sessions` queda solo el hash del token. Un índice TTL borra solas las sesiones vencidas.
- Sin cuenta se puede ver el mapa, el ranking y usar el modo demo. Para guardar un descenso con GPS real hace falta una cuenta.
- Consultas nuevas para Compass: C10 (mejor tiempo por nivel), C11 (descensos por ciudad), C12 (descensos por tipo de bici) y C13 (perfil con sus bicis). `npm run queries` imprime C10 a C12.
- Los archivos `.env*` no se suben a git (salvo `.env.example`).

## Equipo

Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli.

## Créditos

- Datos del sendero Circuito DH Pequia: [Trailforks](https://www.trailforks.com/trails/circuito-dh-pequia/).
- Mapas: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors y © [OpenTopoMap](https://opentopomap.org) ([CC-BY-SA](https://creativecommons.org/licenses/by-sa/3.0/)).
