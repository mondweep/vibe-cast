import { describe, it, expect, beforeEach } from 'vitest';
import {
  DETECTION_PRESETS,
  SIMPLIFIED_QUALITIES,
  QUALITY_SIMPLIFICATION,
  PARAM_RANGES,
  loadDetectionSettings,
  saveDetectionSettings,
  matchesPreset,
} from '../src/audio/detectionConfig';
import { detectChord, simplifyQuality } from '../src/audio/chordDetector';
import type { DetectedPitch } from '../src/types';

function makePitches(notes: { note: string; freq: number }[]): DetectedPitch[] {
  return notes.map((n, i) => ({
    note: n.note as DetectedPitch['note'],
    frequency: n.freq,
    confidence: 0.9 - i * 0.05,
    octave: Math.round(Math.log2(n.freq / 16.35)),
  }));
}

describe('DETECTION_PRESETS', () => {
  it('standard mode has fast throttle and low thresholds', () => {
    const config = DETECTION_PRESETS.standard;
    expect(config.throttleMs).toBe(250);
    expect(config.stabilityHits).toBe(1);
    expect(config.confidenceThreshold).toBe(0.3);
    expect(config.hysteresisMargin).toBe(0);
    expect(config.simplifyQualities).toBe(false);
  });

  it('beginner mode has slower throttle and higher thresholds than standard', () => {
    const config = DETECTION_PRESETS.beginner;
    const standard = DETECTION_PRESETS.standard;
    expect(config.throttleMs).toBeGreaterThan(standard.throttleMs);
    expect(config.stabilityHits).toBeGreaterThan(standard.stabilityHits);
    expect(config.confidenceThreshold).toBeGreaterThan(standard.confidenceThreshold);
    expect(config.hysteresisMargin).toBeGreaterThan(standard.hysteresisMargin);
    expect(config.simplifyQualities).toBe(true);
  });
});

describe('PARAM_RANGES', () => {
  it('defines ranges for all tunable parameters', () => {
    expect(PARAM_RANGES.throttleMs.min).toBeLessThan(PARAM_RANGES.throttleMs.max);
    expect(PARAM_RANGES.stabilityHits.min).toBeLessThan(PARAM_RANGES.stabilityHits.max);
    expect(PARAM_RANGES.confidenceThreshold.min).toBeLessThan(PARAM_RANGES.confidenceThreshold.max);
    expect(PARAM_RANGES.hysteresisMargin.min).toBeLessThan(PARAM_RANGES.hysteresisMargin.max);
  });

  it('presets fall within defined ranges', () => {
    for (const preset of Object.values(DETECTION_PRESETS)) {
      expect(preset.throttleMs).toBeGreaterThanOrEqual(PARAM_RANGES.throttleMs.min);
      expect(preset.throttleMs).toBeLessThanOrEqual(PARAM_RANGES.throttleMs.max);
      expect(preset.stabilityHits).toBeGreaterThanOrEqual(PARAM_RANGES.stabilityHits.min);
      expect(preset.stabilityHits).toBeLessThanOrEqual(PARAM_RANGES.stabilityHits.max);
      expect(preset.confidenceThreshold).toBeGreaterThanOrEqual(PARAM_RANGES.confidenceThreshold.min);
      expect(preset.confidenceThreshold).toBeLessThanOrEqual(PARAM_RANGES.confidenceThreshold.max);
      expect(preset.hysteresisMargin).toBeGreaterThanOrEqual(PARAM_RANGES.hysteresisMargin.min);
      expect(preset.hysteresisMargin).toBeLessThanOrEqual(PARAM_RANGES.hysteresisMargin.max);
    }
  });
});

describe('matchesPreset', () => {
  it('identifies standard preset', () => {
    expect(matchesPreset({ ...DETECTION_PRESETS.standard })).toBe('standard');
  });

  it('identifies beginner preset', () => {
    expect(matchesPreset({ ...DETECTION_PRESETS.beginner })).toBe('beginner');
  });

  it('returns custom for modified config', () => {
    expect(matchesPreset({ ...DETECTION_PRESETS.standard, throttleMs: 500 })).toBe('custom');
  });
});

describe('SIMPLIFIED_QUALITIES', () => {
  it('includes only beginner-friendly qualities', () => {
    expect(SIMPLIFIED_QUALITIES.has('major')).toBe(true);
    expect(SIMPLIFIED_QUALITIES.has('minor')).toBe(true);
    expect(SIMPLIFIED_QUALITIES.has('dom7')).toBe(true);
    expect(SIMPLIFIED_QUALITIES.has('min7')).toBe(true);
    expect(SIMPLIFIED_QUALITIES.has('maj7')).toBe(true);
  });

  it('excludes complex qualities', () => {
    expect(SIMPLIFIED_QUALITIES.has('dim')).toBe(false);
    expect(SIMPLIFIED_QUALITIES.has('aug')).toBe(false);
    expect(SIMPLIFIED_QUALITIES.has('sus2')).toBe(false);
    expect(SIMPLIFIED_QUALITIES.has('sus4')).toBe(false);
    expect(SIMPLIFIED_QUALITIES.has('dom9')).toBe(false);
  });
});

describe('QUALITY_SIMPLIFICATION', () => {
  it('maps every non-simplified quality to a simplified one', () => {
    for (const [, target] of Object.entries(QUALITY_SIMPLIFICATION)) {
      expect(SIMPLIFIED_QUALITIES.has(target)).toBe(true);
    }
  });
});

describe('simplifyQuality', () => {
  it('returns simple qualities unchanged', () => {
    expect(simplifyQuality('major')).toBe('major');
    expect(simplifyQuality('minor')).toBe('minor');
    expect(simplifyQuality('dom7')).toBe('dom7');
  });

  it('maps complex qualities to simpler equivalents', () => {
    expect(simplifyQuality('dim')).toBe('minor');
    expect(simplifyQuality('aug')).toBe('major');
    expect(simplifyQuality('sus4')).toBe('major');
    expect(simplifyQuality('dom9')).toBe('dom7');
    expect(simplifyQuality('min9')).toBe('min7');
  });

  it('defaults unknown qualities to major', () => {
    expect(simplifyQuality('unknownQuality')).toBe('major');
  });
});

describe('detectChord with simplified mode', () => {
  it('only returns simplified qualities when simplified=true', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches, { simplified: true });
    for (const r of results) {
      expect(SIMPLIFIED_QUALITIES.has(r.quality)).toBe(true);
    }
  });

  it('still detects C major in simplified mode', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches, { simplified: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('C');
    expect(results[0].quality).toBe('major');
  });

  it('still detects A minor in simplified mode', () => {
    const pitches = makePitches([
      { note: 'A', freq: 110 },
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
    ]);
    const results = detectChord(pitches, { simplified: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('A');
    expect(results[0].quality).toBe('minor');
  });

  it('backward compatible — no options behaves as standard', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const withoutOptions = detectChord(pitches);
    const withStandard = detectChord(pitches, { simplified: false });
    expect(withoutOptions[0].name).toBe(withStandard[0].name);
    expect(withoutOptions[0].quality).toBe(withStandard[0].quality);
  });
});

describe('loadDetectionSettings / saveDetectionSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to standard config when nothing stored', () => {
    const { mode, config } = loadDetectionSettings();
    expect(mode).toBe('standard');
    expect(config).toEqual(DETECTION_PRESETS.standard);
  });

  it('persists and loads custom config', () => {
    const custom = { ...DETECTION_PRESETS.standard, throttleMs: 500 };
    saveDetectionSettings('custom', custom);
    const { mode, config } = loadDetectionSettings();
    expect(mode).toBe('custom');
    expect(config.throttleMs).toBe(500);
  });

  it('persists and loads beginner preset', () => {
    saveDetectionSettings('beginner', DETECTION_PRESETS.beginner);
    const { mode, config } = loadDetectionSettings();
    expect(mode).toBe('beginner');
    expect(config).toEqual(DETECTION_PRESETS.beginner);
  });

  it('migrates from old detection-mode key', () => {
    localStorage.setItem('chordlab-detection-mode', 'beginner');
    const { mode, config } = loadDetectionSettings();
    expect(mode).toBe('beginner');
    expect(config).toEqual(DETECTION_PRESETS.beginner);
  });

  it('defaults to standard for corrupted stored value', () => {
    localStorage.setItem('chordlab-detection-config', 'not-json');
    const { mode, config } = loadDetectionSettings();
    expect(mode).toBe('standard');
    expect(config).toEqual(DETECTION_PRESETS.standard);
  });
});
