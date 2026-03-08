export type DetectionMode = 'standard' | 'beginner';

export interface DetectionConfig {
  throttleMs: number;
  stabilityHits: number;
  confidenceThreshold: number;
  hysteresisMargin: number;
  simplifyQualities: boolean;
}

export const DETECTION_CONFIGS: Record<DetectionMode, DetectionConfig> = {
  standard: {
    throttleMs: 250,
    stabilityHits: 1,
    confidenceThreshold: 0.3,
    hysteresisMargin: 0,
    simplifyQualities: false,
  },
  beginner: {
    throttleMs: 800,
    stabilityHits: 3,
    confidenceThreshold: 0.5,
    hysteresisMargin: 0.15,
    simplifyQualities: true,
  },
};

/** Qualities allowed in beginner (simplified) mode. */
export const SIMPLIFIED_QUALITIES = new Set([
  'major', 'minor', 'dom7', 'min7', 'maj7',
]);

/**
 * Maps complex chord qualities to simpler equivalents for beginner mode.
 * Qualities not in this map and not in SIMPLIFIED_QUALITIES are skipped entirely.
 */
export const QUALITY_SIMPLIFICATION: Record<string, string> = {
  dim: 'minor',
  aug: 'major',
  sus2: 'major',
  sus4: 'major',
  min7b5: 'min7',
  dim7: 'min7',
  dom7sus4: 'dom7',
  dom9: 'dom7',
  maj9: 'maj7',
  min9: 'min7',
  dom11: 'dom7',
  dom13: 'dom7',
  add9: 'major',
  add11: 'major',
  sixth: 'major',
  min6: 'minor',
  dom7s5: 'dom7',
  dom7b5: 'dom7',
  dom7s9: 'dom7',
  dom7b9: 'dom7',
  power: 'major',
};

const STORAGE_KEY = 'chordlab-detection-mode';

export function loadDetectionMode(): DetectionMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'standard' || stored === 'beginner') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'standard';
}

export function saveDetectionMode(mode: DetectionMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
}
