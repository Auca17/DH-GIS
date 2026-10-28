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

export interface CriaturaSendero {
  nombre: string;
  tiempoLimiteS: number;
  descripcion: string;
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
  /** Criatura mítica/guardián del sendero que persigue al ciclista si se excede del tiempo límite */
  criatura?: CriaturaSendero;
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

/** Rider level, chosen when signing up. */
export type NivelRider = "principiante" | "intermedio" | "avanzado";

/** Wheel size: 27.5", 29" or mullet (29 front, 27.5 rear). */
export type RodadoBici = "27.5" | "29" | "mullet";

/** A bike of the signed-in rider, as the screens use it (the database uses English names). */
export interface Bici {
  id: string;
  tipo: TipoBici;
  marca: string;
  modelo: string;
  anio: number;
  rodado: RodadoBici;
  recorridoDelanteroMm: number;
  /** 0 = hardtail (no rear suspension). */
  recorridoTraseroMm: number;
  /** The bike preselected before a run. Each rider has exactly one. */
  principal: boolean;
}

/** The signed-in rider (never includes the password). */
export interface PerfilRider {
  id: string;
  nombre: string;
  email: string;
  nivel: NivelRider;
  ciudad: string;
  /** Year the rider started riding. */
  andaDesde: number;
}

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

/** "gps" = measured with the phone's real GPS; "demo" = simulated route. */
export type ModoCorrida = "gps" | "demo";

/** One track point as it is saved in MongoDB: [longitude, latitude, ms since the start]. */
export type PuntoRastro = [number, number, number];

export interface ResultadoDescenso {
  cerroId: string;
  /** How the run was measured; isDemo in the database comes from here. Missing = "demo" (older results). */
  modo?: ModoCorrida;
  tiempoMs: number;
  velocidadPromedioKmh: number;
  cambioElevacionM: number;
  interrumpidoPorSos: boolean;
  path: PuntoDescenso[];
  /** Track sent to the server (at most one point per second). Missing = no track (older results). */
  track?: PuntoRastro[];
  /** Bike chosen before the run (null = no account or no bike). Missing = older results. */
  bikeId?: string | null;
  guardadoEn: number;
}

