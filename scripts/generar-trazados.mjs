import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const OUT_PATH = join(__dirname, "..", "src", "lib", "trazados.ts");

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

function clasificar(gradePct, anterior) {
  if (gradePct === null) return anterior ?? "facil";
  const magnitud = Math.abs(gradePct);
  if (magnitud < 4) return "facil";
  if (magnitud < 10) return "intermedia";
  return "dificil";
}

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

function procesarPuntos(puntosCrudos, reverseIfAscending = true) {
  // En downhill (DH), un sendero de descenso comienza en la cota más alta y desciende.
  // Si el GPX fue grabado en subida (inicio más bajo que el final), invertimos el orden.
  if (reverseIfAscending && puntosCrudos[0].elevacionM < puntosCrudos[puntosCrudos.length - 1].elevacionM) {
    puntosCrudos = [...puntosCrudos].reverse();
  }

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

  return {
    tramos,
    puntosCrudos,
    stats: {
      largoM,
      desnivelM,
      pendientePromedioPct,
      altitudMinM: Math.round(altitudMinM),
      altitudMaxM: Math.round(altitudMaxM),
    },
  };
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(5));

function formatTramos(tramos) {
  return tramos
    .map(
      (tramo) =>
        `  {\n    dificultad: "${tramo.dificultad}",\n    puntos: [\n${tramo.puntos
          .map((p) => `      { lat: ${fmt(p.lat)}, lng: ${fmt(p.lng)}, elevacionM: ${p.elevacionM} },`)
          .join("\n")}\n    ],\n  },`,
    )
    .join("\n");
}

const configs = [
  {
    key: "pequia",
    file: "circuito-dh-pequia.gpx",
    varPista: "pistaPequia",
    varStats: "statsPequia",
  },
  {
    key: "elLloron",
    file: "circuito-dh-el-lloron.gpx",
    varPista: "pistaElLloron",
    varStats: "statsElLloron",
  },
  {
    key: "escarpadoGloria",
    file: "escarpado-cerro-de-la-gloria.gpx",
    varPista: "pistaEscarpadoGloria",
    varStats: "statsEscarpadoGloria",
  },
];

let tsCode = `// GENERADO por scripts/generar-trazados.mjs a partir de los GPX en data/ (Trailforks).
// No editar a mano: volver a correr el script si algún GPX cambia.
import type { TramoPista } from "@/lib/types";

`;

for (const cfg of configs) {
  const xml = readFileSync(join(DATA_DIR, cfg.file), "utf-8");
  const puntos = parseGpx(xml);
  const { tramos, stats } = procesarPuntos(puntos, true);

  console.log(`[${cfg.file}] => tramos=${tramos.length}, largo=${stats.largoM}m, desnivel=${stats.desnivelM}m, pendiente=${stats.pendientePromedioPct}%`);

  tsCode += `export const ${cfg.varPista}: TramoPista[] = [\n${formatTramos(tramos)}\n];\n\n`;
  tsCode += `export const ${cfg.varStats} = ${JSON.stringify(stats, null, 2)};\n\n`;
}

writeFileSync(OUT_PATH, tsCode, "utf-8");
console.log(`Generado exitosamente en: ${OUT_PATH}`);
