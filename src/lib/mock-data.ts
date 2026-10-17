import {
  pistaElLloron,
  pistaEscarpadoGloria,
  pistaPequia,
  statsElLloron,
  statsEscarpadoGloria,
  statsPequia,
} from "@/lib/trazados";
import type { Cerro, Comentario, EntradaLeaderboard } from "@/lib/types";

// Dataset con los 3 trazados reales de Mendoza a partir de los GPX en data/:
// - Circuito DH Pequia (data/circuito-dh-pequia.gpx)
// - Circuito DH El Llorón (data/circuito-dh-el-lloron.gpx)
// - Escarpado Cerro de la Gloria (data/escarpado-cerro-de-la-gloria.gpx)
//
// Los 3 senderos están validados y visibles en el mapa.

export const cerros: Cerro[] = [
  {
    id: "pequia",
    slug: "circuito-dh-pequia",
    nombre: "Circuito DH Pequia",
    ubicacion: { lat: pistaPequia[0].puntos[0].lat, lng: pistaPequia[0].puntos[0].lng },
    descripcion:
      "Singletrack de descenso con saltos y mucho flow, pendiente moderada en el Parque Deportivo de Montaña.",
    dificultadGeneral: "intermedia",
    calificacion: 4.3,
    duracionEstimadaMs: 52_000,
    terreno: "tierra seca",
    largoM: statsPequia.largoM,
    desnivelM: statsPequia.desnivelM,
    pendientePromedioPct: statsPequia.pendientePromedioPct,
    tiempoPromedioS: 52,
    tiempoMinimoValidoS: 30,
    isPlaceholder: false,
    visibleEnMapa: true,
    fuenteDatos: { nombre: "Trailforks", url: "https://www.trailforks.com/trails/circuito-dh-pequia/" },
    criatura: {
      nombre: "El Pomberito",
      tiempoLimiteS: 180,
      descripcion: "Dueño de la siesta y del monte. Te da unos segundos de ventaja de salida; si tardás más de 3 minutos, te persigue la rueda trasera.",
    },
    pista: pistaPequia,
  },
  {
    id: "el-lloron",
    slug: "circuito-dh-el-lloron",
    nombre: "Circuito DH El Llorón",
    ubicacion: { lat: pistaElLloron[0].puntos[0].lat, lng: pistaElLloron[0].puntos[0].lng },
    descripcion:
      "Descenso técnico con curvas pronunciadas y sectores de roca suelta en la bajada de El Llorón.",
    dificultadGeneral: "dificil",
    calificacion: 4.5,
    duracionEstimadaMs: 75_000,
    terreno: "grava",
    largoM: statsElLloron.largoM,
    desnivelM: statsElLloron.desnivelM,
    pendientePromedioPct: statsElLloron.pendientePromedioPct,
    tiempoPromedioS: 75,
    tiempoMinimoValidoS: 40,
    isPlaceholder: false,
    visibleEnMapa: true,
    fuenteDatos: { nombre: "Trailforks", url: "https://www.trailforks.com/trails/circuito-dh-el-lloron/" },
    criatura: {
      nombre: "El Pomberito",
      tiempoLimiteS: 300,
      descripcion: "Guardián de la huella. Arranca detrás tuyo por las piedras sueltas. Tenés 5 minutos para cruzar la meta.",
    },
    pista: pistaElLloron,
  },
  {
    id: "escarpado-gloria",
    slug: "escarpado-cerro-de-la-gloria",
    nombre: "Escarpado Cerro de la Gloria",
    ubicacion: { lat: pistaEscarpadoGloria[0].puntos[0].lat, lng: pistaEscarpadoGloria[0].puntos[0].lng },
    descripcion:
      "Bajada escarpada y directa por la ladera del Cerro de la Gloria, rápida con pendiente pronunciada y terreno pedregoso.",
    dificultadGeneral: "dificil",
    calificacion: 4.6,
    duracionEstimadaMs: 65_000,
    terreno: "grava",
    largoM: statsEscarpadoGloria.largoM,
    desnivelM: statsEscarpadoGloria.desnivelM,
    pendientePromedioPct: statsEscarpadoGloria.pendientePromedioPct,
    tiempoPromedioS: 65,
    tiempoMinimoValidoS: 35,
    isPlaceholder: false,
    visibleEnMapa: true,
    fuenteDatos: { nombre: "Trailforks", url: "https://www.trailforks.com/trails/escarpado-cerro-de-la-gloria/" },
    criatura: {
      nombre: "El Pomberito",
      tiempoLimiteS: 240,
      descripcion: "Baja chiflando entre las jarillas del Cerro de la Gloria. Tenés 4 minutos para llegar a la base antes de que te alcance.",
    },
    pista: pistaEscarpadoGloria,
  },
];

export const comentarios: Comentario[] = [
  {
    id: "c-pequia-1",
    cerroId: "pequia",
    autor: "Lucas R.",
    texto: "Mucho flow en la parte media, pero la salida quedó molida, mucho barro.",
    fecha: "2026-09-12",
  },
  {
    id: "c-pequia-2",
    cerroId: "pequia",
    autor: "Mica V.",
    texto: "Corto pero divertido, los saltos del inicio se pueden linkear fácil.",
    fecha: "2026-09-20",
  },
  {
    id: "c-lloron-1",
    cerroId: "el-lloron",
    autor: "Facu T.",
    texto: "El tramo pedregoso del final exige mucho la línea, no vayas pasado.",
    fecha: "2026-09-18",
  },
  {
    id: "c-lloron-2",
    cerroId: "el-lloron",
    autor: "Romi S.",
    texto: "Buena pendiente al principio, curvas cerradas bien técnicas.",
    fecha: "2026-09-25",
  },
  {
    id: "c-gloria-1",
    cerroId: "escarpado-gloria",
    autor: "Sol M.",
    texto: "Tremenda vista y bajada muy empinada, ojo con las piedras sueltas.",
    fecha: "2026-08-30",
  },
  {
    id: "c-gloria-2",
    cerroId: "escarpado-gloria",
    autor: "Ignacio P.",
    texto: "Mucha adrenalina de entrada, el desnivel se siente de inmediato.",
    fecha: "2026-09-15",
  },
];

export const leaderboardPorCerro: Record<string, EntradaLeaderboard[]> = {
  pequia: [
    { id: "lb-peq-1", cerroId: "pequia", usuario: "Lucas R.", tiempoMs: 49_800, velocidadPromedioKmh: 26.2, fecha: "2026-09-12", bikeType: "DH" },
    { id: "lb-peq-2", cerroId: "pequia", usuario: "Mica V.", tiempoMs: 51_300, velocidadPromedioKmh: 25.5, fecha: "2026-09-20", bikeType: "Enduro" },
    { id: "lb-peq-3", cerroId: "pequia", usuario: "Facu T.", tiempoMs: 53_900, velocidadPromedioKmh: 24.2, fecha: "2026-10-01", bikeType: "DH" },
    { id: "lb-peq-4", cerroId: "pequia", usuario: "Romi S.", tiempoMs: 55_600, velocidadPromedioKmh: 23.5, fecha: "2026-08-28", bikeType: "Trail" },
  ],
  "el-lloron": [
    { id: "lb-llo-1", cerroId: "el-lloron", usuario: "Facu T.", tiempoMs: 71_200, velocidadPromedioKmh: 26.6, fecha: "2026-09-18", bikeType: "DH" },
    { id: "lb-llo-2", cerroId: "el-lloron", usuario: "Romi S.", tiempoMs: 76_400, velocidadPromedioKmh: 24.8, fecha: "2026-09-25", bikeType: "Enduro" },
    { id: "lb-llo-3", cerroId: "el-lloron", usuario: "Dieguito", tiempoMs: 82_100, velocidadPromedioKmh: 23.1, fecha: "2026-09-02", bikeType: "Enduro" },
  ],
  "escarpado-gloria": [
    { id: "lb-glo-1", cerroId: "escarpado-gloria", usuario: "Ignacio P.", tiempoMs: 59_500, velocidadPromedioKmh: 29.2, fecha: "2026-09-15", bikeType: "DH" },
    { id: "lb-glo-2", cerroId: "escarpado-gloria", usuario: "Bruno K.", tiempoMs: 63_100, velocidadPromedioKmh: 27.5, fecha: "2026-08-25", bikeType: "Enduro" },
    { id: "lb-glo-3", cerroId: "escarpado-gloria", usuario: "Jime L.", tiempoMs: 67_400, velocidadPromedioKmh: 25.8, fecha: "2026-09-10", bikeType: "Trail" },
  ],
};
