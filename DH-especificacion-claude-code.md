# Especificación para Claude Code: app de leaderboard de descensos

> Nombre de la app: provisorio ("DH"). Este documento reemplaza y amplía los mensajes anteriores. Leelo completo antes de tocar código.

---

## 0. Cómo trabajar con este documento

1. **Primero leé todo, después proponé un plan corto y esperá mi OK.** No arranques a escribir código sin que yo lo apruebe.
2. **Una etapa por vez.** Terminá una etapa, mostrame qué quedó funcionando y frená. No encadenes etapas.
3. **Respuestas cortas.** Al terminar cada etapa, resumen de pocas líneas: qué hiciste, qué probaste, qué falta.
4. **Nunca abras, leas ni imprimas `.env.local`.** Tiene la contraseña de MongoDB. Si necesitás saber el nombre de una variable, usá `MONGODB_URI` (definido abajo) y pedime que la cargue yo.
5. **No hagas `git push` ni commits por tu cuenta.** Commits solo cuando yo lo pida. Confirmá siempre que `.env*` esté en `.gitignore`.
6. **Evitá lanzar sub-agentes** para tareas simples. Tengo un cupo de uso limitado y quiero cuidarlo.
7. **Antes de instalar una dependencia nueva**, decime cuál y para qué.
8. **Idioma:** textos de la interfaz en español rioplatense; código y nombres de variables en inglés; comentarios en español.
9. **Verificá en un navegador real** antes de decir que algo funciona (ver sección 2). "Compila" no es lo mismo que "se ve".

---

## 1. Qué es la app y por qué existe

Es una app web para ciclistas de descenso (MTB DH). La persona abre la app, elige un sendero en un mapa, apreta play y la app mide su descenso con el GPS del teléfono. Al llegar al final se corta sola, muestra el resultado y actualiza el leaderboard del sendero.

**Contexto académico.** Es un proyecto de Diseño de Bases de Datos: la base **tiene que ser MongoDB** y el sistema **tiene que usar información geográfica (GIS)**. Por eso importa el modelo documental, los índices geoespaciales (`2dsphere`) y las consultas por cercanía.

**Diferencial.** Ya existen plataformas con mapas de senderos, y una de ellas (Trailforks) tiene un leaderboard, pero en los senderos de Mendoza está vacío, es tosco y no es verificable. Lo nuestro:

- Medición **automática con GPS real**: no se sube un archivo después, la app mide mientras bajás.
- Leaderboard **simple**: usuario, fecha, tiempo, velocidad y tipo de bici. Nada más.
- Información **mínima**: solo lo que sirve para decidir si bajar el sendero.
- Foco local: senderos de Mendoza.
- SOS integrado.

**Lo que NO queremos copiar:** el mapa interactivo con todas las pistas de la zona, ni la cantidad de información que tienen sus páginas. No copies contenido, textos, fotos ni trazados de ningún sitio externo.

---

## 2. PROBLEMA URGENTE: el mapa se ve en blanco

Hoy la pantalla del mapa muestra solo el encabezado ("Choose a trail / Tap a pin to see the details") y el resto negro. **No se ve ningún mapa ni pines.** Es lo primero que hay que arreglar. Revisá estas causas en orden, que son las más comunes con Leaflet en Next.js:

1. **Falta el CSS de Leaflet.** Importá `leaflet/dist/leaflet.css` dentro del componente cliente del mapa (o en el layout). Sin este CSS el mapa se renderiza roto o invisible.
2. **El contenedor no tiene altura.** Un mapa de Leaflet mide 0 px de alto si el contenedor no tiene una altura explícita. Dale al contenedor una altura real (por ejemplo `h-[calc(100dvh-<alto del header>)]`) y revisá que sus padres tengan `h-full` o similar.
3. **Carga en el servidor (SSR).** Leaflet usa `window`. El componente del mapa tiene que ser un **Client Component** (`"use client"`) y cargarse con `next/dynamic` y `ssr: false`, desde otro Client Component.
4. **No hay capa de mosaicos (tiles).** Sin `TileLayer`, el mapa queda vacío aunque se monte bien. Usá las capas de la sección 3 con su atribución.
5. **Íconos de pin rotos.** Con los empaquetadores modernos, el ícono por defecto de Leaflet no carga. Usá `L.divIcon` con HTML propio (círculo de color con SVG) o corregí las rutas de los íconos. Preferí `divIcon`: así el pin se ve bien en el tema oscuro y lo podemos colorear por dificultad.
6. **Doble montaje en desarrollo.** En modo estricto de React puede aparecer el error "Map container is already initialized". Evitalo con una `key` estable en el `MapContainer` o con un efecto de limpieza correcto.
7. **Bloqueos de red.** Abrí las herramientas del navegador, pestaña Red, y confirmá que los mosaicos devuelven 200. Revisá también la consola.

**Criterio de "arreglado":** abrir `/mapa`, ver mosaicos de fondo, ver al menos un pin, tocar el pin y entrar a la pantalla del sendero. Si podés, sacá una captura con un navegador automatizado (por ejemplo Playwright, si ya está disponible) y mostrámela. Si no podés, decime exactamente qué pasos tengo que hacer yo para comprobarlo.

---

## 3. Mapa: qué usar

**No uses Google Maps.** Pide tarjeta, facturación y clave de API. Usá **Leaflet con mosaicos libres**.

Implementá un selector de capas simple (un botoncito, no un panel grande) con estas opciones:

| Capa | Para qué | Notas |
|---|---|---|
| **OpenTopoMap** (por defecto) | Terreno de montaña: curvas de nivel, relieve, ríos y arroyos | Atribución obligatoria: "© OpenStreetMap contributors, SRTM | Estilo: © OpenTopoMap (CC-BY-SA)". Zoom máximo 17 |
| **OpenStreetMap estándar** | Calles y senderos de uso general | Atribución obligatoria: "© OpenStreetMap contributors" |

Condiciones de uso:

- Mantené siempre visible la atribución que Leaflet muestra abajo a la derecha.
- Estas capas son para desarrollo y demos. Si la app se usara en serio con mucho tráfico, habría que pasar a un proveedor con clave gratuita (MapTiler, Stadia Maps, Thunderforest u otro). **Verificá los planes gratuitos vigentes antes de elegir**; yo no los confirmé.
- Satélite: opcional. Solo agregalo si podés confirmar los términos de uso del proveedor; si tenés dudas, dejalo afuera.
- No agregues la capa de tráfico ni clústeres de pines por ahora.

Paquetes esperados: `leaflet` y `react-leaflet`. Usá la versión de `react-leaflet` compatible con la versión de React instalada (verificalo, no lo asumas).

---

## 4. Sendero de ejemplo: Circuito DH Pequia (Mendoza)

Usamos este sendero como caso de prueba porque es real y cercano. Datos de referencia tomados de una página pública de senderos, **que hay que verificar antes de presentarlos como oficiales**:

| Dato | Valor de referencia |
|---|---|
| Nombre | Circuito DH Pequia |
| Ubicación | Parque Deportivo de Montaña, Municipalidad de Mendoza |
| Dificultad | Azul (intermedia) |
| Largo | unos 363 m |
| Desnivel (bajada) | unos 29 m |
| Pendiente promedio | 8,2 % |
| Tiempo promedio | unos 52 s |
| Rango de altitud | unos 918 a 948 m |
| Descripción | Singletrack de descenso con saltos; mucho flow; pendiente moderada. Una reseña menciona la salida muy "molida" y barro en la parte baja |

**Importante sobre coordenadas.** Todavía **no tengo las coordenadas reales** del inicio, el final y el recorrido. No las inventes. Mientras tanto:

- Usá un **trazado de ejemplo claramente marcado como provisorio** (`isPlaceholder: true`), centrado aproximadamente en Mendoza capital (alrededor de -32.89, -68.85), con unos 15 a 25 puntos que formen una bajada.
- Dejá un comentario `TODO: reemplazar con coordenadas reales` en el seed.
- Cuando yo te pase las coordenadas o un archivo GPX, reemplazás el trazado sin tocar el resto.
- **Opciones para conseguir el trazado real (no copiar de otro sitio):** grabar el recorrido yo mismo con una app de GPS, o dibujarlo punto por punto sobre el mapa.

Para el resto de los senderos, cargá **solo 2 o 3 más**, con datos claramente ficticios (`isPlaceholder: true`) para que el mapa tenga varios pines. No hace falta un catálogo grande.

---

## 5. Pantallas

Todo mobile first, estilo outdoor / deportivo, tema oscuro que ya está bien encaminado. Priorizá **legibilidad al sol** (buen contraste, botones grandes) porque se usa al aire libre.

### 5.1 Login (cosmético por ahora)

Pantalla simple: nombre de la app, botón "Entrar con Google" y botón "Crear cuenta". En esta etapa **no guarda nada**: solo navega al mapa. Después va a verificar que sea una persona real. Al registrarse se pedirán: nombre, apellido, edad, nacionalidad y **teléfono de contacto de emergencia** (obligatorio, lo usa el SOS).

### 5.2 Mapa

- Mapa a pantalla completa con pines de los senderos precargados.
- **Tocar un pin entra directo a la pantalla del sendero.** Sin menú desplegable. (Opcional más adelante: buscador chico arriba.)
- Pin coloreado según dificultad (verde, azul, negro como en las pistas de esquí, o el esquema que mejor se lea).
- Botón para centrarme en mi ubicación (pide permiso de geolocalización).

### 5.3 Pantalla del sendero

**Esta pantalla tiene que ser simple.** Prohibido llenarla de información.

- **Arriba:** nombre, dificultad y calificación (ej. 4,5 estrellas).
- **Mini-mapa del sendero:** un mapa chico que **se centra solo en el sendero** (usá `fitBounds` con un poco de margen). No muestra las pistas de alrededor ni permite arrastrar o hacer zoom. Muestra el trazado con **tramos coloreados**: azul (suave), amarillo (medio), rojo (bajada fuerte), según la pendiente de cada tramo. Marcá claramente el punto de inicio y el de final.
- **Datos clave, en una sola fila de números:** distancia, desnivel, pendiente promedio, tiempo promedio, tipo de terreno (grava, tierra seca, tierra húmeda).
- **Botón grande de play.**
- **Abajo:** comentarios y opiniones con calificación de cada usuario.
- Si hay un mapa grande, que sea secundario. El foco es el sendero elegido.

### 5.4 Cronómetro

- Nombre del sendero y el **tiempo grande**.
- Botón **Parar** (por si falla la señal).
- Botón **SOS** que se activa **deslizando hacia la derecha** (swipe). Al activarse: corta el cronómetro, marca el descenso como "interrumpido", muestra el teléfono de contacto de emergencia con un botón de llamada (`tel:`) y no registra el tiempo en el leaderboard.
- Indicador discreto del estado del GPS (buscando señal, señal buena, señal débil).
- Lógica completa en la sección 6.

### 5.5 Resultado

Muestra sendero, tiempo, velocidad promedio y cambio de elevación. Botón **"Opinión"** que abre un modal chico (comentario y calificación en estrellas). Botón **"Continuar"**.

### 5.6 Leaderboard del sendero

Tabla simple y legible en celular. **Columnas:** puesto, usuario, fecha, tiempo, velocidad promedio y tipo de bici. Nada más (no agregues nacionalidad, nombre real ni apellido en la tabla pública: se guardan en el perfil, pero no se muestran aquí por privacidad). Se resalta la fila del usuario actual. Botón **"Finalizar"** que vuelve al mapa y reinicia el flujo.

---

## 6. Lógica de medición con GPS

**Requisitos del navegador:** la geolocalización solo funciona en **HTTPS** (o en `localhost`). En Vercel funciona. Hay que pedir permiso al usuario y manejar los tres casos: permitido, denegado y no disponible.

**Reglas de negocio:**

1. **Habilitar el inicio:** el botón de play solo se activa si la persona está **cerca del punto de inicio** del sendero (radio configurable, por defecto 30 m). Si no, mostrá cuánto le falta para llegar.
2. **Arranque del cronómetro:** el tiempo empieza **cuando la persona se mueve más de 3 metros** desde el punto donde presionó play. Limitación a tener en cuenta: la precisión típica del GPS de un teléfono ronda varios metros, así que **ignorá lecturas con precisión mala** (`coords.accuracy` alta, por ejemplo mayor a 20 m, configurable) para evitar arranques falsos por ruido.
3. **Fin automático:** el cronómetro se corta solo al llegar al punto final (radio configurable, por defecto 15 m).
4. **Fin manual:** botón Parar, por si la señal no alcanza.
5. **SOS:** corta, marca como interrumpido y no cuenta para el ranking.
6. **Datos que se calculan:** tiempo total, velocidad promedio (distancia recorrida real dividida por tiempo, calculada con la fórmula de Haversine entre puntos consecutivos) y cambio de elevación. **Ojo con la altitud:** `coords.altitude` suele venir nula o muy imprecisa en navegadores. Para la demo, tomá el desnivel del propio sendero (dato guardado en la base). Más adelante se puede calcular con un modelo de elevación.
7. **Rastro (breadcrumb):** guardá una muestra de la ruta recorrida (por ejemplo un punto cada 1 a 2 segundos) dentro del descenso. Sirve para dibujar el recorrido y para validar.

**Validación anti-trampa (etapa avanzada):** el problema de los leaderboards que no se pueden chequear es que cualquiera sube cualquier tiempo. Nosotros medimos en vivo, y además un descenso es **válido** solo si: pasó por el área de inicio y por el área de final, siguió razonablemente el trazado, y la velocidad máxima es plausible. Guardá un campo `validated` (true o false) y el motivo si es falso. En el leaderboard solo entran los válidos.

**Modo demo (obligatorio):** como la presentación probablemente sea en un salón, sin moverse, hace falta un **modo demo** que simule un recorrido por el trazado con ubicaciones falsas, a una velocidad realista, que dispare las mismas reglas (inicio, 3 m, fin automático). Se activa con un interruptor oculto o un parámetro (por ejemplo `?demo=1`). Mostrá una etiqueta visible "MODO DEMO" cuando esté activo para no confundir datos reales con simulados.

---

## 7. Base de datos: MongoDB Atlas

**Conexión.** Hay un cluster gratuito (M0) en Atlas, región São Paulo. La cadena de conexión está en `.env.local` con el nombre **`MONGODB_URI`**. No la leas ni la muestres.

**Reglas de código:**

- Un único archivo `lib/mongodb.ts` que mantenga una conexión reutilizable (con caché global en desarrollo, para no abrir una conexión nueva en cada recarga).
- Todo acceso a datos pasa por **Route Handlers** (`app/api/...`) o Server Actions. Los componentes de la interfaz no hablan con Mongo.
- Nunca expongas la cadena de conexión al navegador (no uses variables que empiecen con `NEXT_PUBLIC_`).
- Un script de **seed idempotente** (`scripts/seed.ts` o similar) que cargue los senderos de ejemplo y se pueda correr más de una vez sin duplicar.
- Un script o endpoint de comprobación que confirme la conexión.

**Colecciones propuestas** (nombres en inglés, `camelCase` en campos):

| Colección | Qué guarda |
|---|---|
| `users` | Perfil: `displayName`, `firstName`, `lastName`, `age`, `nationality`, `emergencyPhone`, `createdAt` |
| `trails` | Sendero: nombre, dificultad, `start` y `end` como Point, `path` como LineString, `segments` (tramos con pendiente y dificultad), estadísticas, terreno, `isPlaceholder` |
| `descents` | Un descenso: `trailId`, `userId`, `startedAt`, `durationMs`, `avgSpeedKmh`, `elevationChangeM`, `bikeType`, `status` (`completed` o `interrupted`), `validated`, `track` (rastro) |
| `reviews` | Opinión: `trailId`, `userId`, `rating`, `comment`, `createdAt` |

**Ejemplo de documento de `trails`:**

```json
{
  "slug": "circuito-dh-pequia",
  "name": "Circuito DH Pequia",
  "difficulty": "blue",
  "terrain": "tierra seca",
  "start": { "type": "Point", "coordinates": [-68.85, -32.89] },
  "end":   { "type": "Point", "coordinates": [-68.849, -32.8915] },
  "path":  { "type": "LineString", "coordinates": [[-68.85, -32.89], [-68.849, -32.8915]] },
  "stats": { "lengthM": 363, "dropM": 29, "avgGradePct": 8.2, "avgTimeS": 52 },
  "ratingAvg": 4.5,
  "ratingCount": 0,
  "isPlaceholder": true
}
```

(Las coordenadas del ejemplo son provisorias, no reales.)

**GeoJSON:** el orden siempre es `[longitud, latitud]`. Es el error más común.

**Índices (explicá cuál justifica cada uno):**

| Índice | Para qué consulta |
|---|---|
| `trails`: `2dsphere` sobre `start` | "¿Qué senderos tengo cerca?" y "¿estoy cerca del inicio?" con `$geoNear` o `$near` |
| `trails`: único sobre `slug` | Acceso directo a un sendero |
| `descents`: `{ trailId: 1, status: 1, validated: 1, durationMs: 1 }` | Armar el leaderboard ordenado por tiempo |
| `reviews`: `{ trailId: 1, createdAt: -1 }` | Listar opiniones recientes |

**Consultas clave que el sistema debe poder responder** (guardalas como scripts o funciones nombradas):

1. Senderos cercanos a una ubicación (consulta geoespacial).
2. ¿La persona está dentro del radio de inicio de un sendero?
3. Leaderboard de un sendero: los N mejores tiempos válidos, con usuario, fecha, velocidad y tipo de bici.
4. Mejor tiempo personal de un usuario en un sendero.
5. Promedio de calificación de un sendero (agregación sobre `reviews`).
6. Cantidad de descensos por sendero.

**Validación de esquema:** si hay tiempo, agregá `$jsonSchema` en `trails` y `descents`. Es un punto que valora la materia.

**Medición de rendimiento:** cuando haya datos de prueba, usá `explain("executionStats")` en al menos 3 de estas consultas, antes y después de crear los índices, y guardá los resultados en un archivo de documentación. Para eso hace falta un seed que genere un volumen razonable de descensos de prueba (por ejemplo, decenas de miles), **marcados como datos de prueba** (`source: "seed"`).

---

## 8. Datos personales

La app guarda datos personales (nombre, edad, teléfono de contacto). Tené en cuenta, sin entrar en tecnicismos legales:

- Pedí solo lo necesario y mostrá un aviso claro de para qué se usa cada dato (el teléfono es para emergencias).
- En el leaderboard público mostrá solo el nombre de usuario.
- Nunca subas datos reales de personas al repositorio ni al seed. Todo lo del seed es ficticio.
- Esto no es asesoramiento legal. Si la app sale de lo académico, hay que revisar la normativa de protección de datos personales aplicable.

---

## 9. Etapas (sin fechas, una por vez)

**Etapa 1: que se vea.**
Arreglar el mapa (sección 2), cargar mosaicos libres (sección 3), mostrar el sendero Pequia de ejemplo con tramos de colores, mini-mapa centrado en el sendero y fila de datos clave. Todavía con datos en memoria, sin Mongo.
*Listo cuando:* abro `/mapa`, veo el mapa de fondo y los pines, toco uno, veo el sendero con colores y los datos, y puedo recorrer las 6 pantallas.

**Etapa 2: que guarde.**
Conectar MongoDB Atlas, crear colecciones e índices, seed idempotente, Route Handlers para senderos, descensos, opiniones y leaderboard. Las pantallas leen de la base.
*Listo cuando:* los senderos salen de Mongo, un descenso de prueba aparece en el leaderboard y las 6 consultas clave responden.

**Etapa 3: que mida.**
Geolocalización real, regla de proximidad, arranque a 3 m, fin automático, SOS y modo demo.
*Listo cuando:* en modo demo se ve un descenso completo y termina solo, y en un teléfono real se pide permiso y se detecta la ubicación.

**Etapa 4: que sea confiable y prolija.**
Login real con Google y perfil, validación del descenso, rastro, pulido visual, mediciones de índices y documentación.
*Listo cuando:* un descenso inválido no entra al ranking y existe el archivo de rendimiento con los antes y después.

---

## 10. Calidad y accesibilidad

- Contraste suficiente sobre fondo oscuro y botones grandes (mínimo 44 px de alto en elementos táctiles).
- Estados claros: cargando, sin datos, error, sin permiso de ubicación, sin señal.
- Que funcione bien en pantallas chicas y en modo horizontal.
- Textos en español rioplatense, cortos y directos.
- Nada de mensajes de error técnicos mostrados al usuario.

---

## 11. Licencia y atribuciones

- El código del proyecto va con licencia **MIT** (archivo `LICENSE` en la raíz, con los nombres de los autores, que te paso yo).
- Mostrá las atribuciones de los mapas (sección 3).
- No incluyas contenido, imágenes ni datos copiados de otros sitios. Los datos de referencia de la sección 4 se usan solo como ejemplo y se reemplazan por mediciones propias.

---

## 12. Lista final de comprobación

- [ ] El mapa se ve, con mosaicos y atribución, y los pines son tocables.
- [ ] Tocar un pin lleva al sendero; el mini-mapa se centra solo en él.
- [ ] Los tramos aparecen en azul, amarillo y rojo.
- [ ] La pantalla del sendero es simple: datos clave en una fila, play grande, comentarios abajo.
- [ ] El cronómetro respeta las reglas (proximidad, 3 m, fin automático, Parar, SOS por swipe).
- [ ] El leaderboard muestra puesto, usuario, fecha, tiempo, velocidad y tipo de bici.
- [ ] Modo demo funcionando y claramente marcado.
- [ ] MongoDB Atlas conectado vía `MONGODB_URI`, sin la cadena en ningún archivo versionado.
- [ ] Índices creados y justificados; consultas clave guardadas.
- [ ] `.env*` ignorado por git; nada sensible en el repositorio.
- [ ] Ninguna coordenada inventada presentada como real: lo provisorio está marcado.
