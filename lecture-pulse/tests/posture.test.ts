import { describe, it, expect } from "vitest";
import { calculatePostureScore, classifyPosture } from "../src/lib/posture";
import type { PoseLandmark } from "../src/types";

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a full 33-landmark array with all defaults (will be overridden). */
function makeLandmarks(
  overrides: Partial<Record<number, Partial<PoseLandmark>>> = {},
): PoseLandmark[] {
  const base: PoseLandmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 };
  const lms: PoseLandmark[] = Array.from({ length: 33 }, () => ({ ...base }));
  for (const [idx, patch] of Object.entries(overrides)) {
    lms[Number(idx)] = { ...lms[Number(idx)], ...patch };
  }
  return lms;
}

/**
 * Build "perfect posture" landmarks:
 * - Ears directly above shoulders (same x, y slightly above)
 * - Shoulders level (same y)
 * - Shoulders directly above hips (same x)
 * - No z offset between ears and shoulders
 *
 * MediaPipe indices:
 *   7 = left ear, 8 = right ear
 *   11 = left shoulder, 12 = right shoulder
 *   23 = left hip, 24 = right hip
 */
function perfectPostureLandmarks(): PoseLandmark[] {
  return makeLandmarks({
    7:  { x: 0.45, y: 0.20, z: 0 },  // left ear
    8:  { x: 0.55, y: 0.20, z: 0 },  // right ear
    11: { x: 0.45, y: 0.35, z: 0 },  // left shoulder
    12: { x: 0.55, y: 0.35, z: 0 },  // right shoulder
    23: { x: 0.45, y: 0.65, z: 0 },  // left hip
    24: { x: 0.55, y: 0.65, z: 0 },  // right hip
  });
}

/**
 * Build "severe slouch" landmarks with penalties that push every dimension:
 * - Head severely tilted sideways
 * - Shoulders very uneven
 * - Torso leaning hard
 * - Neck forward (z-offset between ears and shoulders)
 */
function severeSlouchLandmarks(): PoseLandmark[] {
  return makeLandmarks({
    7:  { x: 0.10, y: 0.20, z: 0.3 },  // left ear — far left and very far forward
    8:  { x: 0.15, y: 0.35, z: 0.3 },  // right ear — different height, forward
    11: { x: 0.35, y: 0.30, z: 0 },     // left shoulder
    12: { x: 0.65, y: 0.50, z: 0 },     // right shoulder — much lower, far right
    23: { x: 0.30, y: 0.65, z: 0 },     // left hip — offset from shoulders
    24: { x: 0.70, y: 0.65, z: 0 },     // right hip — wide stance
  });
}

// ─── calculatePostureScore ───────────────────────────────────────

describe("calculatePostureScore", () => {
  it("returns score near 100 for perfect posture (all landmarks aligned)", () => {
    const result = calculatePostureScore(perfectPostureLandmarks());
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns a low score (poor classification) for severe slouch", () => {
    const result = calculatePostureScore(severeSlouchLandmarks());
    // With all 4 penalties stacked, score should be in "poor" territory (< 40)
    expect(result.score).toBeLessThan(40);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("applies head tilt penalty when only head is tilted", () => {
    // Start with perfect posture, then shift ear midpoint sideways
    const lms = perfectPostureLandmarks();
    // Shift both ears to the left — head tilt relative to shoulders
    lms[7].x = 0.30; // left ear far left
    lms[8].x = 0.40; // right ear far left
    // Ears midpoint now at x=0.35, shoulders midpoint at x=0.50 → large head tilt

    const result = calculatePostureScore(lms);
    const perfectResult = calculatePostureScore(perfectPostureLandmarks());

    // Head tilt alone should reduce score noticeably
    expect(result.score).toBeLessThan(perfectResult.score);
    expect(result.headTilt).toBeGreaterThan(0);
  });

  it("applies shoulder asymmetry penalty when shoulders are uneven", () => {
    const lms = perfectPostureLandmarks();
    // Make one shoulder much lower than the other
    lms[11].y = 0.30; // left shoulder stays
    lms[12].y = 0.45; // right shoulder drops significantly (delta = 0.15)

    const result = calculatePostureScore(lms);
    const perfectResult = calculatePostureScore(perfectPostureLandmarks());

    expect(result.score).toBeLessThan(perfectResult.score);
    expect(result.shoulderDelta).toBeGreaterThan(0);
  });

  it("clamps score to never go below 0", () => {
    // Even with the most extreme penalties, score should never be negative
    const result = calculatePostureScore(severeSlouchLandmarks());
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("clamps score to never exceed 100", () => {
    const result = calculatePostureScore(perfectPostureLandmarks());
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns score 0 with zeroed details for empty landmarks array", () => {
    const result = calculatePostureScore([]);
    expect(result.score).toBe(0);
    expect(result.headTilt).toBe(0);
    expect(result.shoulderDelta).toBe(0);
    expect(result.torsoLean).toBe(0);
    expect(result.neckForward).toBe(0);
  });

  it("returns score 0 for null/undefined landmarks", () => {
    const result = calculatePostureScore(null as unknown as PoseLandmark[]);
    expect(result.score).toBe(0);
  });

  it("returns score 0 for insufficient landmarks (< 25)", () => {
    const shortList: PoseLandmark[] = Array.from({ length: 10 }, () => ({
      x: 0.5, y: 0.5, z: 0, visibility: 1,
    }));
    const result = calculatePostureScore(shortList);
    expect(result.score).toBe(0);
  });

  it("returns numeric headTilt, shoulderDelta, torsoLean, neckForward fields", () => {
    const result = calculatePostureScore(perfectPostureLandmarks());
    expect(typeof result.headTilt).toBe("number");
    expect(typeof result.shoulderDelta).toBe("number");
    expect(typeof result.torsoLean).toBe("number");
    expect(typeof result.neckForward).toBe("number");
  });

  it("perfect posture results in minimal penalties", () => {
    const result = calculatePostureScore(perfectPostureLandmarks());
    expect(result.headTilt).toBeLessThan(5);      // near zero head tilt
    expect(result.shoulderDelta).toBeLessThan(0.01); // shoulders level
    expect(result.torsoLean).toBeLessThan(5);      // near zero torso lean
    expect(result.neckForward).toBeLessThan(0.01); // neck not forward
  });
});

// ─── classifyPosture ────────────────────────────────────────────

describe("classifyPosture", () => {
  it("classifies score >= 70 as good", () => {
    expect(classifyPosture(80)).toBe("good");
    expect(classifyPosture(100)).toBe("good");
    expect(classifyPosture(95)).toBe("good");
  });

  it("classifies score >= 40 and < 70 as fair", () => {
    expect(classifyPosture(50)).toBe("fair");
    expect(classifyPosture(69)).toBe("fair");
    expect(classifyPosture(55)).toBe("fair");
  });

  it("classifies score < 40 as poor", () => {
    expect(classifyPosture(39)).toBe("poor");
    expect(classifyPosture(0)).toBe("poor");
    expect(classifyPosture(20)).toBe("poor");
  });

  // ── Boundary values ──────────────────────────────────────────

  it("classifies exactly 70 as good (boundary)", () => {
    expect(classifyPosture(70)).toBe("good");
  });

  it("classifies exactly 69 as fair (just below good boundary)", () => {
    expect(classifyPosture(69)).toBe("fair");
  });

  it("classifies exactly 40 as fair (boundary)", () => {
    expect(classifyPosture(40)).toBe("fair");
  });

  it("classifies exactly 39 as poor (just below fair boundary)", () => {
    expect(classifyPosture(39)).toBe("poor");
  });

  it("classifies 0 as poor", () => {
    expect(classifyPosture(0)).toBe("poor");
  });

  it("classifies 100 as good", () => {
    expect(classifyPosture(100)).toBe("good");
  });
});
