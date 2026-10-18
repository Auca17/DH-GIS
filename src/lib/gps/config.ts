// GPS rules for a trail descent (Etapa 3 of the spec). Every number lives here,
// so the client and the server always use the same values.

// ---------- Client (the phone) ----------

/** "Jugar" is enabled only within this distance of the trail start. */
export const START_RADIUS_M = 30;
/** The clock starts after moving more than this from the point where "Jugar" was pressed. */
export const START_MOVE_M = 3;
/** The run ends by itself within this distance of the finish. */
export const END_RADIUS_M = 15;
/**
 * Readings with a worse accuracy are ignored. 20 m is the value the spec suggests:
 * it is smaller than the start radius (30 m), so a reading "inside" the start circle
 * can be wrong by 20 m at most. A phone outdoors usually reports 3 to 15 m.
 */
export const MAX_ACCURACY_M = 20;
/**
 * Share of the trail (0 to 1) that must be covered before the auto end can fire.
 * Protects trails whose finish is close to their start.
 */
export const MIN_PROGRESS_FOR_AUTO_END = 0.5;
/** No good reading for this long while running = "signal lost" warning. */
export const SIGNAL_LOST_MS = 10_000;
/** At most one track point per second. */
export const TRACK_SAMPLE_MS = 1000;
/**
 * A jump between two readings faster than this is a GPS error, not the rider.
 * World Cup downhill top speeds are around 60-70 km/h; 90 leaves room for noise.
 */
export const MAX_SPEED_KMH = 90;
/** After this many rejected jumps in a row, the new position is accepted (the GPS moved for real). */
export const MAX_JUMPS_IN_A_ROW = 3;
/** Weight of the newest speed in the moving average (0 to 1). Lower = smoother. */
export const SPEED_SMOOTHING = 0.3;

// ---------- Server (POST /api/descents) ----------

/**
 * Extra meters allowed for the FIRST track point around the start.
 * The first point is saved after moving 3 m from a spot that was up to 30 m away,
 * with up to 20 m of GPS error: 30 + 3 + 20 = 53, rounded to 55 (30 + 25).
 */
export const START_TOLERANCE_M = 25;
/** Extra meters allowed for the LAST track point around the finish (15 + 20 = 35 m). */
export const END_TOLERANCE_M = 20;
/** One hour at one point per second. A bigger track is rejected with 400. */
export const MAX_TRACK_POINTS = 3600;
/** A bigger time gap between two track points means the GPS was lost. */
export const MAX_TRACK_GAP_MS = 15_000;
/** Longest run the server accepts (2 hours). */
export const MAX_DURATION_MS = 2 * 60 * 60 * 1000;
