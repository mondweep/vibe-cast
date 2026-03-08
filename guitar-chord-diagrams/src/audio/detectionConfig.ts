export type DetectionMode = 'standard' | 'beginner' | 'custom';

export interface DetectionConfig {
  throttleMs: number;
  stabilityHits: number;
  confidenceThreshold: number;
  hysteresisMargin: number;
  simplifyQualities: boolean;
}

export const DETECTION_PRESETS: Record<'standard' | 'beginner', DetectionConfig> = {
  standard: {
    throttleMs: 250,
    stabilityHits: 1,
    confidenceThreshold: 0.3,
    hysteresisMargin: 0,
    simplifyQualities: false,
  },
  beginner: {
    throttleMs: 600,
    stabilityHits: 2,
    confidenceThreshold: 0.35,
    hysteresisMargin: 0.12,
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

/** Slider range definitions for the UI. */
export const PARAM_RANGES = {
  throttleMs: { min: 100, max: 1200, step: 50, label: 'Detection Speed', unit: 'ms' },
  stabilityHits: { min: 1, max: 5, step: 1, label: 'Stability', unit: 'hits' },
  confidenceThreshold: { min: 0.1, max: 0.8, step: 0.05, label: 'Confidence Threshold', unit: '' },
  hysteresisMargin: { min: 0, max: 0.3, step: 0.01, label: 'Switch Resistance', unit: '' },
} as const;

const STORAGE_KEY = 'chordlab-detection-config';

interface StoredConfig {
  mode: DetectionMode;
  config: DetectionConfig;
}

export function loadDetectionSettings(): StoredConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredConfig;
      if (parsed.config && typeof parsed.config.throttleMs === 'number') {
        return parsed;
      }
    }
    // Migrate from old key
    const oldKey = localStorage.getItem('chordlab-detection-mode');
    if (oldKey === 'beginner') {
      return { mode: 'beginner', config: { ...DETECTION_PRESETS.beginner } };
    }
  } catch {
    // localStorage unavailable
  }
  return { mode: 'standard', config: { ...DETECTION_PRESETS.standard } };
}

export function saveDetectionSettings(mode: DetectionMode, config: DetectionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, config }));
  } catch {
    // localStorage unavailable
  }
}

/** Check if a config matches a preset exactly. */
export function matchesPreset(config: DetectionConfig): DetectionMode {
  for (const [name, preset] of Object.entries(DETECTION_PRESETS)) {
    if (
      config.throttleMs === preset.throttleMs &&
      config.stabilityHits === preset.stabilityHits &&
      config.confidenceThreshold === preset.confidenceThreshold &&
      config.hysteresisMargin === preset.hysteresisMargin &&
      config.simplifyQualities === preset.simplifyQualities
    ) {
      return name as DetectionMode;
    }
  }
  return 'custom';
}
