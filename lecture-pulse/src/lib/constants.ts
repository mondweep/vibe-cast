// ─── Detection ───────────────────────────────────────────────────

/** How often (ms) pose detection runs on the student device. */
export const DETECTION_INTERVAL_MS = 3000;

// ─── Nudge ───────────────────────────────────────────────────────

/** Score below which posture is considered "nudge-worthy". */
export const NUDGE_THRESHOLD = 40;

/** Duration (ms) of sustained poor posture before a nudge fires. */
export const NUDGE_DELAY_MS = 120_000; // 2 minutes

// ─── Score thresholds ────────────────────────────────────────────

/** Score >= this is classified as "good". */
export const GOOD_THRESHOLD = 70;

/** Score >= this (but < GOOD) is classified as "fair". */
export const FAIR_THRESHOLD = 40;

/** Maximum possible posture score. */
export const MAX_SCORE = 100;

// ─── Penalty caps ────────────────────────────────────────────────

/** Maximum penalty for head tilt (0-30). */
export const HEAD_TILT_MAX_PENALTY = 30;

/** Maximum penalty for shoulder asymmetry (0-20). */
export const SHOULDER_ASYMMETRY_MAX_PENALTY = 20;

/** Maximum penalty for forward / backward torso lean (0-30). */
export const TORSO_LEAN_MAX_PENALTY = 30;

/** Maximum penalty for neck-forward position (0-20). */
export const NECK_FORWARD_MAX_PENALTY = 20;

// ─── Server / WebSocket ──────────────────────────────────────────

/** How often (ms) the server broadcasts aggregated state to the dashboard. */
export const WS_BROADCAST_INTERVAL = 2000;

/** Idle session auto-timeout (ms). 2 hours. */
export const SESSION_TIMEOUT_MS = 7_200_000;

/** Port the Express / WS server listens on. */
export const SERVER_PORT = 3000;
