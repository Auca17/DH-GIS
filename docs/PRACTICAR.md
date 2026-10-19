# Cómo dejar todo listo para practicar (paso a paso)

Para el equipo. Seguilo **en orden** y no te saltees el "¿Salió bien?" de cada paso: si un paso falla, el
siguiente también. Tarda unos 30 minutos, casi todo en descargas. Está escrito para **Windows**; en Mac es igual
salvo los instaladores.

Antes de preguntar en el grupo, mirá la sección **"Si algo falla"** al final. Ahí están los problemas más comunes.

---

## Paso 1. Instalar los programas

Instalá estos cuatro programas, en este orden. En todos los instaladores podés aceptar las opciones por defecto,
salvo donde dice **ojo**.

| Programa | Para qué | Dónde |
|---|---|---|
| **Git** | Bajar el proyecto | https://git-scm.com/download/win |
| **Node.js 22 (LTS)** | Correr el proyecto y los scripts | https://nodejs.org (botón "LTS") |
| **MongoDB Community Server** | La base de datos en tu compu | https://www.mongodb.com/try/download/community |
| **MongoDB Compass** | Ver la base y escribir consultas | Viene con el instalador de MongoDB (ver abajo) |

**Ojo con el instalador de MongoDB Community Server:**
- Elegí **"Complete"**.
- Dejá tildado **"Install MongoD as a Service"**. Así la base arranca sola cada vez que prendés la compu.
- Dejá tildado **"Install MongoDB Compass"**. Si no aparece o lo destildaste, bajalo aparte de
  https://www.mongodb.com/try/download/compass.

### ¿Salió bien?

Abrí una terminal nueva (tecla Windows → escribí **PowerShell** → Enter) y escribí:

```powershell
git --version
node --version
```

Tiene que responder algo como `git version 2.x` y `v22.x`. Si dice "no se reconoce como comando", cerrá la
terminal, abrí una nueva y probá de nuevo (la terminal vieja no se entera de lo que instalaste).

---

## Paso 2. Comprobar que la base está andando

1. Abrí **MongoDB Compass**.
2. Donde dice la dirección de conexión, dejá `mongodb://127.0.0.1:27017` (o `mongodb://localhost:27017`).
3. Tocá **Connect**.

### ¿Salió bien?

A la izquierda vas a ver las bases `admin`, `config` y `local`. Todavía no está `dh`: es normal, la cargamos en el
paso 5. Si Compass dice **"connect ECONNREFUSED"**, mirá "Si algo falla".

---

## Paso 3. Bajar el proyecto

En PowerShell, andá a la carpeta donde quieras guardarlo (por ejemplo, el Escritorio) y clonalo:

```powershell
cd $HOME\Desktop
git clone https://github.com/Auca17/DH-GIS.git
cd DH-GIS
```

### ¿Salió bien?

Escribí `ls` y vas a ver carpetas como `src`, `scripts`, `docs` y archivos como `package.json` y `README.md`.

> De acá en adelante, **todos los comandos se escriben parado en la carpeta `DH-GIS`**. Si cerrás la terminal,
> cuando la abras de nuevo hacé `cd $HOME\Desktop\DH-GIS` primero.

---

## Paso 4. Instalar las dependencias y configurar la conexión

```powershell
npm install
cp .env.example .env.local
```

- `npm install` baja las librerías del proyecto (tarda un par de minutos y aparece una carpeta `node_modules`).
- `cp` crea tu archivo `.env.local`, que le dice al proyecto a qué base conectarse. **Ya apunta a tu base local**
  (`mongodb://127.0.0.1:27017/dh`): no hace falta cambiar nada.

### ¿Salió bien?

`npm install` termina sin la palabra `ERR!` (los `WARN` no importan). Si escribís `ls -Force` aparece `.env.local`.

> **Nunca** pongas en `.env.local` la dirección de Atlas (la que empieza con `mongodb+srv://`). Si un día alguien te
> la pasa, se usa solo en Compass, nunca en el proyecto. Así es imposible que un comando tuyo toque la base de la
> app publicada.

---

## Paso 5. Cargar los datos

```powershell
npm run seed
```

### ¿Salió bien?

Termina imprimiendo esto:

```text
Database: dh
users:    70
trails:   3
bikes:    105 (seed)
descents: 20017 (seed)
reviews:  306 (seed)
```

Volvé a Compass y tocá el botón de recargar (↻) al lado de la lista de bases: apareció **`dh`** con las colecciones
`bikes`, `descents`, `reviews`, `sessions`, `trails` y `users`.

---

## Paso 6. Probar que todo anda

```powershell
npm run queries
```

Imprime varias tablas: senderos cercanos (C1), el ranking de Pequia (C3), promedios de estrellas (C5), descensos por
ciudad (C11), etc. Si ves tablas con datos, **ya tenés todo listo**.

Opcional:
- `npm run explain`: mide cuánto ayudan los índices y actualiza `docs/explain.md` (si lo corrés, ese archivo te
  queda modificado: no lo subas, o descartalo con `git checkout docs/explain.md`).
- `npm run dev`: levanta la app en http://localhost:3000, conectada a **tu** base local. Se corta con `Ctrl + C`.

---

## Paso 7. Practicar

Ya está todo. Ahora, a lo que importa:

1. **Leé [GUIA-EQUIPO.md](GUIA-EQUIPO.md)**: qué hay en cada colección, qué índices tenemos y qué es cada consulta
   (C1 a C13).
2. **Abrí la shell en Compass**: en la lista de la izquierda, al lado de tu conexión, tocá el botón **">_"**
   ("Open MongoDB shell"). En versiones viejas de Compass es la barra **">_ MONGOSH"** abajo de todo.
   Escribí `use dh` y Enter. Probá:
   ```js
   db.trails.find({}, { name: 1, difficulty: 1 })
   db.descents.countDocuments({ validated: true })
   ```
3. **Seguí [consultas-mongo.md](consultas-mongo.md)**: es la guía de ejercicios, de lo más simple a lo más complejo.
4. **Copiá las consultas del proyecto**: abrí un archivo de `src/lib/queries/` (por ejemplo `c3-leaderboard.ts`).
   Arriba tiene un comentario con el pipeline. En Compass, entrá a la colección que dice el comentario →
   pestaña **Aggregations** → ícono de **"</> TEXT"** → pegalo. Donde dice `PASTE_..._ID_HERE`, poné el `_id` real
   (lo copiás de la colección `trails` o `users`).
5. **Rompé cosas**: cambiá filtros, sacá etapas, creá y borrá índices, insertá documentos mal hechos para ver cómo los
   rechaza la validación. Es tu base, no le hace nada a nadie.

### Volver a dejar todo como estaba

```powershell
npm run seed
```

Vuelve a cargar los datos de ejemplo y a crear los índices y las validaciones. Si borraste toda la base `dh` desde
Compass, también la recrea.

### Traer los cambios nuevos del proyecto

Cuando avisemos que hay cambios:

```powershell
git pull
npm install
npm run seed
```

---

## Si algo falla

**"node" / "npm" / "git" no se reconoce como comando.**
Cerrá **todas** las terminales y abrí una nueva. Si sigue, reiniciá la compu (el instalador agrega los programas al
PATH y algunas terminales no se enteran hasta reiniciar).

**Compass dice "connect ECONNREFUSED 127.0.0.1:27017".**
El servicio de MongoDB no está andando. Tecla Windows → escribí **Servicios** → buscá **MongoDB Server** → click
derecho → **Iniciar**. Si no aparece en la lista, reinstalá MongoDB Community Server tildando "Install MongoD as a
Service".

**`npm run seed` dice "MongoDB is not responding".**
Es lo mismo que el anterior: la base no está andando. Arreglalo igual y corré `npm run seed` de nuevo.

**`npm run seed` dice ".env.local: not found".**
Te falta `.env.local`. Volvé al paso 4 y corré `cp .env.example .env.local` (parado en la carpeta `DH-GIS`).

**`cp` no funciona.**
Estás en la terminal vieja de Windows (`cmd`), no en PowerShell. Usá `copy .env.example .env.local` o abrí PowerShell.

**`npm install` tira errores en rojo (`ERR!`).**
Fijate que `node --version` diga `v22` (o `v20` o más). Si dice una versión más vieja, instalá Node 22 LTS de nuevo.
Después borrá la carpeta `node_modules` y corré `npm install` otra vez.

**`npm run dev` dice que el puerto 3000 está en uso.**
Ya tenés otra app corriendo. Cerrala, o usá otro puerto: `npm run dev -- -p 3001` y abrí http://localhost:3001.

**En Compass no aparece la base `dh`.**
Tocá el botón de recargar (↻) de la lista de bases. Si sigue sin aparecer, `npm run seed` no terminó bien: corrélo de
nuevo y mirá qué dice.

**Una consulta copiada de `src/lib/queries/` no devuelve nada.**
Seguro quedó un `ObjectId("PASTE_..._ID_HERE")` sin reemplazar, o pegaste un `_id` de otra colección. El `_id` de
un sendero sale de `trails` y el de un rider de `users`.

**Nada de esto.**
Mandá en el grupo: qué paso estabas haciendo, el comando exacto que escribiste y una captura del error completo.
