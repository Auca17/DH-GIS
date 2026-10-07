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
  nombre: string;
  ubicacion: { lat: number; lng: number };
  descripcion: string;
  calificacion: number;
  pista: TramoPista[];
  duracionEstimadaMs: number;
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

export interface EntradaLeaderboard {
  id: string;
  cerroId: string;
  usuario: string;
  tiempoMs: number;
  velocidadPromedioKmh: number;
  fecha: string;
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
