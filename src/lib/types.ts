// Domain types for the downhill leaderboard mock frontend.
// Phase 1 is frontend-only: these shapes mirror what a future backend/DB would store,
// but everything here is plain data consumed by mock-data.ts and the simulator.

export type Dificultad = "facil" | "intermedia" | "dificil";

export interface PuntoPista {
  lat: number;
  lng: number;
  elevacionM: number;
}

export interface TramoPista {
  dificultad: Dificultad;
  puntos: PuntoPista[];
}

export interface Cerro {
  id: string;
  slug: string;
  nombre: string;
  ubicacion: { lat: number; lng: number };
  descripcion: string;
  /** Overall trail rating shown in the header (ski-run style: facil/intermedia/dificil). */
  dificultadGeneral: Dificultad;
  calificacion: number;
  pista: TramoPista[];
  duracionEstimadaMs: number;
  terreno: string;
  largoM: number;
  desnivelM: number;
  pendientePromedioPct: number;
  tiempoPromedioS: number;
  /** Fastest time (seconds) the server accepts as a valid descent; faster runs do not rank. */
  tiempoMinimoValidoS: number;
  /** True while the real GPS track hasn't been recorded yet — see mock-data.ts TODOs. */
  isPlaceholder: boolean;
  /** False hides the trail from the main map without deleting its data (prompt.md paso 1.e). */
  visibleEnMapa: boolean;
  /** Optional attribution link shown on the trail screen when the track comes from an external source. */
  fuenteDatos?: { nombre: string; url: string };
}

export interface Comentario {
  id: string;
  cerroId: string;
  autor: string;
  texto: string;
  fecha: string;
}

export interface Usuario {
  id: string;
  nombre: string;
}

export type TipoBici = "DH" | "Enduro" | "Trail";

export interface EntradaLeaderboard {
  id: string;
  cerroId: string;
  usuario: string;
  tiempoMs: number;
  velocidadPromedioKmh: number;
  fecha: string;
  bikeType: TipoBici;
  /** True when the run was simulated (demo mode). */
  esDemo?: boolean;
}

export interface PuntoDescenso {
  lat: number;
  lng: number;
  elevacionM: number;
  distanciaRecorridaM: number;
  timestampMs: number;
  velocidadKmh: number;
}

export interface ResultadoDescenso {
  cerroId: string;
  tiempoMs: number;
  velocidadPromedioKmh: number;
  cambioElevacionM: number;
  interrumpidoPorSos: boolean;
  path: PuntoDescenso[];
  guardadoEn: number;
}
