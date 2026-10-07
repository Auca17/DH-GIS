// Lee data/circuito-dh-pequia.gpx (Trailforks) y genera src/lib/pequia-trazado.ts con el
// trazado real agrupado en tramos por pendiente real. Volver a correr si el GPX cambia:
//   node scripts/generar-pequia.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GPX_PATH = join(__dirname, "..", "data", "circuito-dh-pequia.gpx");
const OUT_PATH = join(__dirname, "..", "src", "lib", "pequia-trazado.ts");

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg) => (deg * Math.PI) / 180;

function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Clasificación por pendiente real (bajada): < 4% suave (azul), 4-10% media (amarillo),
// >= 10% fuerte (rojo). Tramos de distancia ~0 (jitter de GPS) heredan la dificultad
// del tramo anterior en vez de dividir por cero.
function clasificar(gradePct, anterior) {
  if (gradePct === null) return anterior ?? "facil";
  const magnitud = Math.abs(gradePct);
  if (magnitud < 4) return "facil";
  if (magnitud < 10) return "intermedia";
  return "dificil";
}

// La elevación del GPX viene redondeada al metro y los puntos están a ~5-8m entre sí:
// la pendiente punto a punto salta de forma artificial. Se promedia sobre una ventana
// de puntos adelante para que la clasificación siga la tendencia real del terreno.
const VENTANA = 4;

function pendienteSuavizada(puntos, i) {
  if (i === 0) return null;
  const j = Math.min(i + VENTANA, puntos.length - 1);
  const desde = puntos[Math.max(0, i - 1)];
  const hasta = puntos[j];
  const distM = haversineM(desde, hasta);
  if (distM < 3) return null;
  const caidaM = desde.elevacionM - hasta.elevacionM;
  return (caidaM / distM) * 100;
}

function parseGpx(xml) {
  const puntos = [];
  const regex = /<trkpt lat="(-?[\d.]+)" lon="(-?[\d.]+)">\s*<ele>([\d.]+)<\/ele>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    puntos.push({
      lat: Number(match[1]),
      lng: Number(match[2]),
      elevacionM: Number(match[3]),
    });
  }
  return puntos;
}

const xml = readFileSync(GPX_PATH, "utf-8");
const puntosCrudos = parseGpx(xml);
if (puntosCrudos.length < 2) {
  throw new Error(`Se esperaban al menos 2 trkpt en el GPX, se encontraron ${puntosCrudos.length}`);
}

// Agrupa puntos consecutivos en tramos por dificultad, reutilizando el punto límite
// entre tramos (igual que el resto del dataset mock) para que flattenPista no duplique distancia.
const tramos = [];
let tramoActual = null;
let distanciaAcumuladaM = 0;

for (let i = 0; i < puntosCrudos.length; i += 1) {
  const punto = puntosCrudos[i];
  let dificultad;
  if (i === 0) {
    dificultad = "facil";
  } else {
    const anterior = puntosCrudos[i - 1];
    distanciaAcumuladaM += haversineM(anterior, punto);
    const gradePct = pendienteSuavizada(puntosCrudos, i);
    dificultad = clasificar(gradePct, tramoActual?.dificultad);
  }

  if (!tramoActual || tramoActual.dificultad !== dificultad) {
    const puntoLimite = tramoActual ? tramoActual.puntos.at(-1) : null;
    tramoActual = { dificultad, puntos: puntoLimite ? [puntoLimite, punto] : [punto] };
    tramos.push(tramoActual);
  } else {
    tramoActual.puntos.push(punto);
  }
}

const elevaciones = puntosCrudos.map((p) => p.elevacionM);
const altitudMinM = Math.min(...elevaciones);
const altitudMaxM = Math.max(...elevaciones);
const desnivelM = Math.round(puntosCrudos[0].elevacionM - puntosCrudos.at(-1).elevacionM);
const largoM = Math.round(distanciaAcumuladaM);
const pendientePromedioPct = Math.round((desnivelM / largoM) * 1000) / 10;

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(5));

const tramosTs = tramos
  .map(
    (tramo) =>
      `  {\n    dificultad: "${tramo.dificultad}",\n    puntos: [\n${tramo.puntos
        .map((p) => `      { lat: ${fmt(p.lat)}, lng: ${fmt(p.lng)}, elevacionM: ${p.elevacionM} },`)
        .join("\n")}\n    ],\n  },`,
  )
  .join("\n");

const output = `// GENERADO por scripts/generar-pequia.mjs a partir de data/circuito-dh-pequia.gpx (Trailforks).
// No editar a mano: volver a correr el script si el GPX cambia.
import type { TramoPista } from "@/lib/types";

export const pistaPequia: TramoPista[] = [
${tramosTs}
];

export const statsPequia = {
  largoM: ${largoM},
  desnivelM: ${desnivelM},
  pendientePromedioPct: ${pendientePromedioPct},
  altitudMinM: ${Math.round(altitudMinM)},
  altitudMaxM: ${Math.round(altitudMaxM)},
};
`;

writeFileSync(OUT_PATH, output, "utf-8");
console.log(`OK: ${tramos.length} tramos, ${puntosCrudos.length} puntos, largoM=${largoM}, desnivelM=${desnivelM}, pendientePromedioPct=${pendientePromedioPct}`);
console.log(`Escrito en ${OUT_PATH}`);
