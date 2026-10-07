import { pistaPequia, statsPequia } from "@/lib/pequia-trazado";
import type { Cerro, Comentario, EntradaLeaderboard } from "@/lib/types";

// Mock dataset for Etapa 1 (frontend only, no Mongo yet). All trails live around
// Mendoza capital (section 1: "foco local: senderos de Mendoza"). Circuito DH Pequia
// uses the real recorded track from data/circuito-dh-pequia.gpx (Trailforks) — see
// scripts/generar-pequia.mjs, which writes pequia-trazado.ts. The other 3 trails are
// entirely fictional placeholders and stay hidden from the main map (visibleEnMapa)
// until there's a real track for them too, per prompt.md paso 1.e.
//
// Each cerro has track segments (facil -> intermedia -> dificil) for the colored
// mini-map preview. The last point of one segment is reused as the first point of the
// next so the rendered polyline (and the flattened track used by the GPS simulator)
// has no gaps.

export const cerros: Cerro[] = [
  {
    id: "pequia",
    slug: "circuito-dh-pequia",
    nombre: "Circuito DH Pequia",
    ubicacion: { lat: pistaPequia[0].puntos[0].lat, lng: pistaPequia[0].puntos[0].lng },
    descripcion:
      "Singletrack de descenso con saltos y mucho flow, pendiente moderada. Una reseña menciona la salida muy molida y barro en la parte baja.",
    dificultadGeneral: "intermedia",
    calificacion: 4.3,
    // Tiempo promedio de referencia (no viene del GPX: este recorrido es una grabación
    // de referencia de Trailforks, no una bajada cronometrada en bici).
    duracionEstimadaMs: 52_000,
    terreno: "tierra seca",
    largoM: statsPequia.largoM,
    desnivelM: statsPequia.desnivelM,
    pendientePromedioPct: statsPequia.pendientePromedioPct,
    tiempoPromedioS: 52,
    isPlaceholder: false,
    visibleEnMapa: true,
    fuenteDatos: { nombre: "Trailforks", url: "https://www.trailforks.com/trails/circuito-dh-pequia/" },
    pista: pistaPequia,
  },
  {
    id: "cantera",
    slug: "bajada-la-cantera",
    nombre: "Bajada La Cantera",
    ubicacion: { lat: -32.905, lng: -68.87 },
    descripcion:
      "Trazado ficticio para la demo: entrada rápida por terreno abierto que se cierra en un tramo pedregoso y técnico sobre el final.",
    dificultadGeneral: "dificil",
    calificacion: 4.0,
    duracionEstimadaMs: 95_000,
    terreno: "grava",
    largoM: 540,
    desnivelM: 48,
    pendientePromedioPct: 9.1,
    tiempoPromedioS: 88,
    isPlaceholder: true,
    visibleEnMapa: false,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -32.905, lng: -68.87, elevacionM: 1020 },
          { lat: -32.9057, lng: -68.8695, elevacionM: 1012 },
          { lat: -32.9064, lng: -68.869, elevacionM: 1004 },
          { lat: -32.9071, lng: -68.8685, elevacionM: 996 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -32.9071, lng: -68.8685, elevacionM: 996 },
          { lat: -32.908, lng: -68.868, elevacionM: 985 },
          { lat: -32.9089, lng: -68.8675, elevacionM: 974 },
          { lat: -32.9098, lng: -68.867, elevacionM: 973 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -32.9098, lng: -68.867, elevacionM: 973 },
          { lat: -32.911, lng: -68.8663, elevacionM: 972.5 },
          { lat: -32.9122, lng: -68.8656, elevacionM: 972.2 },
          { lat: -32.9134, lng: -68.8649, elevacionM: 972 },
        ],
      },
    ],
  },
  {
    id: "zampal",
    slug: "loma-del-zampal",
    nombre: "Loma del Zampal",
    ubicacion: { lat: -32.87, lng: -68.84 },
    descripcion:
      "Trazado ficticio para la demo: bajada corta y amigable, ideal para calentar antes de senderos más exigentes.",
    dificultadGeneral: "facil",
    calificacion: 3.7,
    duracionEstimadaMs: 65_000,
    terreno: "tierra húmeda",
    largoM: 280,
    desnivelM: 18,
    pendientePromedioPct: 5.4,
    tiempoPromedioS: 60,
    isPlaceholder: true,
    visibleEnMapa: false,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -32.87, lng: -68.84, elevacionM: 910 },
          { lat: -32.8706, lng: -68.8396, elevacionM: 905 },
          { lat: -32.8712, lng: -68.8392, elevacionM: 900 },
          { lat: -32.8718, lng: -68.8388, elevacionM: 896 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -32.8718, lng: -68.8388, elevacionM: 896 },
          { lat: -32.8724, lng: -68.8384, elevacionM: 894 },
          { lat: -32.873, lng: -68.838, elevacionM: 892 },
        ],
      },
      {
        dificultad: "facil",
        puntos: [
          { lat: -32.873, lng: -68.838, elevacionM: 892 },
          { lat: -32.8736, lng: -68.8375, elevacionM: 891 },
          { lat: -32.8742, lng: -68.837, elevacionM: 892 },
        ],
      },
    ],
  },
  {
    id: "quebrada-seca",
    slug: "quebrada-seca",
    nombre: "Quebrada Seca",
    ubicacion: { lat: -32.92, lng: -68.88 },
    descripcion:
      "Trazado ficticio para la demo: curvas encadenadas por un cauce seco, con un salto marcado cerca de la mitad del recorrido.",
    dificultadGeneral: "intermedia",
    calificacion: 4.1,
    duracionEstimadaMs: 78_000,
    terreno: "tierra seca",
    largoM: 410,
    desnivelM: 33,
    pendientePromedioPct: 8.0,
    tiempoPromedioS: 70,
    isPlaceholder: true,
    visibleEnMapa: false,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -32.92, lng: -68.88, elevacionM: 980 },
          { lat: -32.9207, lng: -68.8794, elevacionM: 974 },
          { lat: -32.9214, lng: -68.8788, elevacionM: 968 },
          { lat: -32.9221, lng: -68.8782, elevacionM: 962 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -32.9221, lng: -68.8782, elevacionM: 962 },
          { lat: -32.923, lng: -68.8777, elevacionM: 954 },
          { lat: -32.9239, lng: -68.8772, elevacionM: 946 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -32.9239, lng: -68.8772, elevacionM: 946 },
          { lat: -32.9248, lng: -68.8765, elevacionM: 940 },
          { lat: -32.9257, lng: -68.8758, elevacionM: 947 },
        ],
      },
    ],
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
    id: "c-cantera-1",
    cerroId: "cantera",
    autor: "Facu T.",
    texto: "El tramo pedregoso del final exige mucho la línea, no vayas con todo.",
    fecha: "2026-09-18",
  },
  {
    id: "c-cantera-2",
    cerroId: "cantera",
    autor: "Romi S.",
    texto: "Buena pendiente al principio, se agradece para tomar ritmo.",
    fecha: "2026-09-25",
  },
  {
    id: "c-zampal-1",
    cerroId: "zampal",
    autor: "Sol M.",
    texto: "Ideal para entrar en calor, nada técnico y bien fluido.",
    fecha: "2026-08-30",
  },
  {
    id: "c-quebrada-1",
    cerroId: "quebrada-seca",
    autor: "Ignacio P.",
    texto: "El salto de la mitad sorprende la primera vez, después se disfruta.",
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
  cantera: [
    { id: "lb-can-1", cerroId: "cantera", usuario: "Facu T.", tiempoMs: 86_200, velocidadPromedioKmh: 22.6, fecha: "2026-09-18", bikeType: "DH" },
    { id: "lb-can-2", cerroId: "cantera", usuario: "Romi S.", tiempoMs: 90_700, velocidadPromedioKmh: 21.4, fecha: "2026-09-25", bikeType: "Enduro" },
    { id: "lb-can-3", cerroId: "cantera", usuario: "Dieguito", tiempoMs: 94_100, velocidadPromedioKmh: 20.7, fecha: "2026-09-02", bikeType: "Enduro" },
  ],
  zampal: [
    { id: "lb-zam-1", cerroId: "zampal", usuario: "Sol M.", tiempoMs: 58_400, velocidadPromedioKmh: 17.3, fecha: "2026-08-30", bikeType: "Trail" },
    { id: "lb-zam-2", cerroId: "zampal", usuario: "Vale H.", tiempoMs: 61_900, velocidadPromedioKmh: 16.3, fecha: "2026-09-18", bikeType: "Trail" },
  ],
  "quebrada-seca": [
    { id: "lb-que-1", cerroId: "quebrada-seca", usuario: "Ignacio P.", tiempoMs: 68_500, velocidadPromedioKmh: 21.6, fecha: "2026-09-15", bikeType: "Enduro" },
    { id: "lb-que-2", cerroId: "quebrada-seca", usuario: "Bruno K.", tiempoMs: 72_100, velocidadPromedioKmh: 20.5, fecha: "2026-08-25", bikeType: "DH" },
    { id: "lb-que-3", cerroId: "quebrada-seca", usuario: "Jime L.", tiempoMs: 75_400, velocidadPromedioKmh: 19.6, fecha: "2026-09-10", bikeType: "Trail" },
  ],
};
