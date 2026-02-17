import type { PoseLandmark, PostureResult, PostureClassification } from "@/types";
import {
  MAX_SCORE,
  HEAD_TILT_MAX_PENALTY,
  SHOULDER_ASYMMETRY_MAX_PENALTY,
  TORSO_LEAN_MAX_PENALTY,
  NECK_FORWARD_MAX_PENALTY,
  GOOD_THRESHOLD,
  FAIR_THRESHOLD,
} from "./constants";

// ─── MediaPipe landmark indices ──────────────────────────────────

const _NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

// Suppress unused-variable lint for NOSE (kept for documentation).
void _NOSE;

// ─── Helpers ─────────────────────────────────────────────────────

/** Midpoint of two landmarks along each axis. */
function midpoint(a: PoseLandmark, b: PoseLandmark): { x: number; y: number; z: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/** Clamp a number between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Angle (in degrees) of the vector from `lower` to `upper` measured from
 * the vertical axis.
 *
 * In MediaPipe normalised coordinates the y-axis points **downward**, so
 * "perfectly vertical" means Δx = 0. The function returns the absolute
 * angle from that vertical.
 */
function angleFromVertical(
  upperX: number,
  upperY: number,
  lowerX: number,
  lowerY: number,
): number {
  const dx = upperX - lowerX;
  const dy = upperY - lowerY;
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (radians * 180) / Math.PI;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Calculate a posture score from MediaPipe pose landmarks.
 *
 * Algorithm (from PRD section 7):
 *   score = 100
 *     - headTiltPenalty      (0-30)
 *     - shoulderAsymmetry    (0-20)
 *     - torsoLeanPenalty     (0-30)
 *     - neckForwardPenalty   (0-20)
 *
 * Landmarks are expected in MediaPipe normalised coordinates ([0,1]).
 */
export function calculatePostureScore(landmarks: PoseLandmark[]): PostureResult {
  // Ensure we have enough landmarks (MediaPipe Pose outputs 33).
  if (!landmarks || landmarks.length < 25) {
    return { score: 0, headTilt: 0, shoulderDelta: 0, torsoLean: 0, neckForward: 0 };
  }

  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];
  const leftHip = landmarks[LEFT_HIP];
  const rightHip = landmarks[RIGHT_HIP];

  const earMid = midpoint(leftEar, rightEar);
  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  // 1. Head tilt: angle of ear-midpoint -> shoulder-midpoint from vertical.
  //    Perfectly upright head yields ~0 degrees; heavy tilt -> up to 45+ degrees.
  const headTiltDeg = angleFromVertical(earMid.x, earMid.y, shoulderMid.x, shoulderMid.y);
  // Scale 0-45 degrees -> 0-MAX_PENALTY (linear, capped).
  const headTiltPenalty = clamp(
    (headTiltDeg / 45) * HEAD_TILT_MAX_PENALTY,
    0,
    HEAD_TILT_MAX_PENALTY,
  );

  // 2. Shoulder asymmetry: absolute y-difference between left and right shoulder.
  //    Normalised coords range [0,1]; a difference > 0.05 is noticeable.
  const shoulderDelta = Math.abs(leftShoulder.y - rightShoulder.y);
  // Scale 0-0.1 -> 0-MAX_PENALTY.
  const shoulderPenalty = clamp(
    (shoulderDelta / 0.1) * SHOULDER_ASYMMETRY_MAX_PENALTY,
    0,
    SHOULDER_ASYMMETRY_MAX_PENALTY,
  );

  // 3. Torso lean: angle of shoulder-midpoint -> hip-midpoint from vertical.
  const torsoLeanDeg = angleFromVertical(shoulderMid.x, shoulderMid.y, hipMid.x, hipMid.y);
  const torsoLeanPenalty = clamp(
    (torsoLeanDeg / 45) * TORSO_LEAN_MAX_PENALTY,
    0,
    TORSO_LEAN_MAX_PENALTY,
  );

  // 4. Neck-forward penalty: horizontal distance from ear-midpoint to shoulder-midpoint.
  //    Ears far in front of shoulders (in x or z) indicates forward-head posture.
  //    In front-facing camera z depth is unreliable, so we combine x-distance
  //    with a down-weighted z component.
  const neckForwardDist =
    Math.abs(earMid.x - shoulderMid.x) + Math.abs(earMid.z - shoulderMid.z) * 0.5;
  const neckForwardPenalty = clamp(
    (neckForwardDist / 0.15) * NECK_FORWARD_MAX_PENALTY,
    0,
    NECK_FORWARD_MAX_PENALTY,
  );

  // Final score, clamped 0-100.
  const score = clamp(
    Math.round(
      MAX_SCORE - headTiltPenalty - shoulderPenalty - torsoLeanPenalty - neckForwardPenalty,
    ),
    0,
    MAX_SCORE,
  );

  return {
    score,
    headTilt: Math.round(headTiltDeg * 10) / 10,
    shoulderDelta: Math.round(shoulderDelta * 1000) / 1000,
    torsoLean: Math.round(torsoLeanDeg * 10) / 10,
    neckForward: Math.round(neckForwardDist * 1000) / 1000,
  };
}

/**
 * Classify a numeric posture score into a human-readable bucket.
 *
 *   good:  score >= 70  (green)
 *   fair:  score >= 40  (amber)
 *   poor:  score < 40   (red)
 */
export function classifyPosture(score: number): PostureClassification {
  if (score >= GOOD_THRESHOLD) return "good";
  if (score >= FAIR_THRESHOLD) return "fair";
  return "poor";
}

/**
 * Backwards-compatible alias for {@link classifyPosture}.
 */
export const classifyScore = classifyPosture;
