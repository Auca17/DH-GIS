import type { Cerro, Comentario, EntradaLeaderboard } from "@/lib/types";

// Mock dataset for phase 1 (frontend only, no backend). Coordinates sit around the
// Patagonian Andes (Bariloche / Villa La Angostura / San Martin de los Andes area);
// they are plausible but not surveyed trail data.
//
// Each cerro has 3 track segments (facil -> intermedia -> dificil). The last point of
// one segment is reused as the first point of the next so the rendered polyline (and
// the flattened track used by the GPS simulator) has no gaps.

export const cerros: Cerro[] = [
  {
    id: "catedral",
    nombre: "Cerro Catedral",
    ubicacion: { lat: -41.1621, lng: -71.4481 },
    descripcion:
      "The classic Bariloche descent: a mellow warm-up through open slopes that tightens into a technical, rocky finish with big exposure.",
    calificacion: 4.5,
    duracionEstimadaMs: 210_000,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -41.1621, lng: -71.4481, elevacionM: 2000 },
          { lat: -41.1631, lng: -71.4475, elevacionM: 1982 },
          { lat: -41.1641, lng: -71.4469, elevacionM: 1964 },
          { lat: -41.1651, lng: -71.4463, elevacionM: 1946 },
          { lat: -41.1661, lng: -71.4457, elevacionM: 1928 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -41.1661, lng: -71.4457, elevacionM: 1928 },
          { lat: -41.1674, lng: -71.4449, elevacionM: 1900 },
          { lat: -41.1687, lng: -71.4441, elevacionM: 1872 },
          { lat: -41.17, lng: -71.4433, elevacionM: 1844 },
          { lat: -41.1713, lng: -71.4425, elevacionM: 1816 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -41.1713, lng: -71.4425, elevacionM: 1816 },
          { lat: -41.173, lng: -71.4414, elevacionM: 1778 },
          { lat: -41.1747, lng: -71.4403, elevacionM: 1740 },
          { lat: -41.1764, lng: -71.4392, elevacionM: 1702 },
          { lat: -41.1781, lng: -71.4381, elevacionM: 1664 },
        ],
      },
    ],
  },
  {
    id: "otto",
    nombre: "Cerro Otto",
    ubicacion: { lat: -41.1255, lng: -71.3633 },
    descripcion:
      "A flowy, beginner-friendly line through forest switchbacks with a short, punchy rock garden near the bottom.",
    calificacion: 3.8,
    duracionEstimadaMs: 150_000,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -41.1255, lng: -71.3633, elevacionM: 1700 },
          { lat: -41.1264, lng: -71.3628, elevacionM: 1685 },
          { lat: -41.1273, lng: -71.3623, elevacionM: 1670 },
          { lat: -41.1282, lng: -71.3618, elevacionM: 1655 },
          { lat: -41.1291, lng: -71.3613, elevacionM: 1640 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -41.1291, lng: -71.3613, elevacionM: 1640 },
          { lat: -41.1303, lng: -71.3605, elevacionM: 1615 },
          { lat: -41.1315, lng: -71.3597, elevacionM: 1590 },
          { lat: -41.1327, lng: -71.3589, elevacionM: 1565 },
          { lat: -41.1339, lng: -71.3581, elevacionM: 1540 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -41.1339, lng: -71.3581, elevacionM: 1540 },
          { lat: -41.1355, lng: -71.357, elevacionM: 1505 },
          { lat: -41.1371, lng: -71.3559, elevacionM: 1470 },
          { lat: -41.1387, lng: -71.3548, elevacionM: 1435 },
          { lat: -41.1403, lng: -71.3537, elevacionM: 1400 },
        ],
      },
    ],
  },
  {
    id: "bayo",
    nombre: "Cerro Bayo",
    ubicacion: { lat: -40.7598, lng: -71.5522 },
    descripcion:
      "Wide-open alpine views give way to a long, steep, root-covered descent that rewards good line choice over raw speed.",
    calificacion: 4.2,
    duracionEstimadaMs: 240_000,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -40.7598, lng: -71.5522, elevacionM: 1900 },
          { lat: -40.7609, lng: -71.5515, elevacionM: 1878 },
          { lat: -40.762, lng: -71.5508, elevacionM: 1856 },
          { lat: -40.7631, lng: -71.5501, elevacionM: 1834 },
          { lat: -40.7642, lng: -71.5494, elevacionM: 1812 },
          { lat: -40.7653, lng: -71.5487, elevacionM: 1790 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -40.7653, lng: -71.5487, elevacionM: 1790 },
          { lat: -40.7668, lng: -71.5476, elevacionM: 1752 },
          { lat: -40.7683, lng: -71.5465, elevacionM: 1714 },
          { lat: -40.7698, lng: -71.5454, elevacionM: 1676 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -40.7698, lng: -71.5454, elevacionM: 1676 },
          { lat: -40.7716, lng: -71.544, elevacionM: 1630 },
          { lat: -40.7734, lng: -71.5426, elevacionM: 1584 },
          { lat: -40.7752, lng: -71.5412, elevacionM: 1538 },
          { lat: -40.777, lng: -71.5398, elevacionM: 1492 },
        ],
      },
    ],
  },
  {
    id: "chapelco",
    nombre: "Cerro Chapelco",
    ubicacion: { lat: -40.16, lng: -71.355 },
    descripcion:
      "A short, friendly roll into the trees opens into a long, high-speed intermediate section, finished off by a committing, rocky drop.",
    calificacion: 4.7,
    duracionEstimadaMs: 230_000,
    pista: [
      {
        dificultad: "facil",
        puntos: [
          { lat: -40.16, lng: -71.355, elevacionM: 2100 },
          { lat: -40.1613, lng: -71.354, elevacionM: 2070 },
          { lat: -40.1626, lng: -71.353, elevacionM: 2040 },
          { lat: -40.1639, lng: -71.352, elevacionM: 2010 },
        ],
      },
      {
        dificultad: "intermedia",
        puntos: [
          { lat: -40.1639, lng: -71.352, elevacionM: 2010 },
          { lat: -40.1655, lng: -71.3507, elevacionM: 1970 },
          { lat: -40.1671, lng: -71.3494, elevacionM: 1930 },
          { lat: -40.1687, lng: -71.3481, elevacionM: 1890 },
          { lat: -40.1703, lng: -71.3468, elevacionM: 1850 },
          { lat: -40.1719, lng: -71.3455, elevacionM: 1810 },
        ],
      },
      {
        dificultad: "dificil",
        puntos: [
          { lat: -40.1719, lng: -71.3455, elevacionM: 1810 },
          { lat: -40.1739, lng: -71.3439, elevacionM: 1760 },
          { lat: -40.1759, lng: -71.3423, elevacionM: 1710 },
          { lat: -40.1779, lng: -71.3407, elevacionM: 1660 },
          { lat: -40.1799, lng: -71.3391, elevacionM: 1610 },
        ],
      },
    ],
  },
];

export const comentarios: Comentario[] = [
  {
    id: "c-catedral-1",
    cerroId: "catedral",
    autor: "Lucas R.",
    texto: "The rock garden at the bottom is no joke, go in with speed but stay loose.",
    fecha: "2026-09-12",
  },
  {
    id: "c-catedral-2",
    cerroId: "catedral",
    autor: "Mica V.",
    texto: "Best views on the mountain and the flow in the middle section is amazing.",
    fecha: "2026-09-20",
  },
  {
    id: "c-catedral-3",
    cerroId: "catedral",
    autor: "Facu T.",
    texto: "Ran it after rain and the roots got sketchy. Dry conditions recommended.",
    fecha: "2026-10-01",
  },
  {
    id: "c-otto-1",
    cerroId: "otto",
    autor: "Sol M.",
    texto: "Great track to warm up on, lots of flow and not too demanding.",
    fecha: "2026-08-30",
  },
  {
    id: "c-otto-2",
    cerroId: "otto",
    autor: "Ignacio P.",
    texto: "Short but sweet. The final rock section wakes you up right before the finish.",
    fecha: "2026-09-15",
  },
  {
    id: "c-bayo-1",
    cerroId: "bayo",
    autor: "Carla D.",
    texto: "Long one! Pace yourself on the first half so your arms survive the steep part.",
    fecha: "2026-09-05",
  },
  {
    id: "c-bayo-2",
    cerroId: "bayo",
    autor: "Tomas G.",
    texto: "Roots everywhere on the lower half, line choice matters more than speed here.",
    fecha: "2026-09-22",
  },
  {
    id: "c-bayo-3",
    cerroId: "bayo",
    autor: "Pau A.",
    texto: "The lake views from the top are unreal, worth the climb just for that.",
    fecha: "2026-10-02",
  },
  {
    id: "c-chapelco-1",
    cerroId: "chapelco",
    autor: "Nico F.",
    texto: "That final drop is committing, scope it out before sending it full speed.",
    fecha: "2026-08-18",
  },
  {
    id: "c-chapelco-2",
    cerroId: "chapelco",
    autor: "Jime L.",
    texto: "The high-speed middle section is my favorite part of the whole mountain.",
    fecha: "2026-09-10",
  },
];

export const leaderboardPorCerro: Record<string, EntradaLeaderboard[]> = {
  catedral: [
    { id: "lb-cat-1", cerroId: "catedral", usuario: "Lucas R.", tiempoMs: 182_400, velocidadPromedioKmh: 27.8, fecha: "2026-09-12" },
    { id: "lb-cat-2", cerroId: "catedral", usuario: "Mica V.", tiempoMs: 191_100, velocidadPromedioKmh: 26.5, fecha: "2026-09-20" },
    { id: "lb-cat-3", cerroId: "catedral", usuario: "Facu T.", tiempoMs: 198_700, velocidadPromedioKmh: 25.6, fecha: "2026-10-01" },
    { id: "lb-cat-4", cerroId: "catedral", usuario: "Romi S.", tiempoMs: 205_300, velocidadPromedioKmh: 24.8, fecha: "2026-08-28" },
    { id: "lb-cat-5", cerroId: "catedral", usuario: "Dieguito", tiempoMs: 212_900, velocidadPromedioKmh: 23.9, fecha: "2026-09-02" },
  ],
  otto: [
    { id: "lb-otto-1", cerroId: "otto", usuario: "Sol M.", tiempoMs: 128_500, velocidadPromedioKmh: 24.1, fecha: "2026-08-30" },
    { id: "lb-otto-2", cerroId: "otto", usuario: "Ignacio P.", tiempoMs: 133_900, velocidadPromedioKmh: 23.2, fecha: "2026-09-15" },
    { id: "lb-otto-3", cerroId: "otto", usuario: "Vale H.", tiempoMs: 139_200, velocidadPromedioKmh: 22.3, fecha: "2026-09-18" },
    { id: "lb-otto-4", cerroId: "otto", usuario: "Bruno K.", tiempoMs: 145_600, velocidadPromedioKmh: 21.4, fecha: "2026-08-25" },
  ],
  bayo: [
    { id: "lb-bayo-1", cerroId: "bayo", usuario: "Carla D.", tiempoMs: 221_800, velocidadPromedioKmh: 23.6, fecha: "2026-09-05" },
    { id: "lb-bayo-2", cerroId: "bayo", usuario: "Tomas G.", tiempoMs: 229_400, velocidadPromedioKmh: 22.8, fecha: "2026-09-22" },
    { id: "lb-bayo-3", cerroId: "bayo", usuario: "Pau A.", tiempoMs: 236_100, velocidadPromedioKmh: 22.1, fecha: "2026-10-02" },
    { id: "lb-bayo-4", cerroId: "bayo", usuario: "Marti N.", tiempoMs: 244_700, velocidadPromedioKmh: 21.3, fecha: "2026-09-10" },
    { id: "lb-bayo-5", cerroId: "bayo", usuario: "Fede C.", tiempoMs: 251_300, velocidadPromedioKmh: 20.7, fecha: "2026-08-29" },
    { id: "lb-bayo-6", cerroId: "bayo", usuario: "Clara Z.", tiempoMs: 259_900, velocidadPromedioKmh: 19.9, fecha: "2026-09-14" },
  ],
  chapelco: [
    { id: "lb-chap-1", cerroId: "chapelco", usuario: "Nico F.", tiempoMs: 205_600, velocidadPromedioKmh: 28.9, fecha: "2026-08-18" },
    { id: "lb-chap-2", cerroId: "chapelco", usuario: "Jime L.", tiempoMs: 212_200, velocidadPromedioKmh: 27.9, fecha: "2026-09-10" },
    { id: "lb-chap-3", cerroId: "chapelco", usuario: "Agus R.", tiempoMs: 219_800, velocidadPromedioKmh: 26.8, fecha: "2026-09-25" },
    { id: "lb-chap-4", cerroId: "chapelco", usuario: "Male B.", tiempoMs: 227_400, velocidadPromedioKmh: 25.8, fecha: "2026-08-22" },
    { id: "lb-chap-5", cerroId: "chapelco", usuario: "Santi O.", tiempoMs: 235_000, velocidadPromedioKmh: 24.9, fecha: "2026-09-30" },
  ],
};
