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

## Equipo

Augustus Rufino, Nicolas Beltran, Ariel Cohen, Josefina Porolli.

## Créditos

- Datos del sendero Circuito DH Pequia: [Trailforks](https://www.trailforks.com/trails/circuito-dh-pequia/).
- Mapas: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors y © [OpenTopoMap](https://opentopomap.org) ([CC-BY-SA](https://creativecommons.org/licenses/by-sa/3.0/)).
