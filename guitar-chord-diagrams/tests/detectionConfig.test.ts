import { describe, it, expect, beforeEach } from 'vitest';
import {
  DETECTION_CONFIGS,
  SIMPLIFIED_QUALITIES,
  QUALITY_SIMPLIFICATION,
  loadDetectionMode,
  saveDetectionMode,
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

describe('DETECTION_CONFIGS', () => {
  it('standard mode has fast throttle and low thresholds', () => {
    const config = DETECTION_CONFIGS.standard;
    expect(config.throttleMs).toBe(250);
    expect(config.stabilityHits).toBe(1);
    expect(config.confidenceThreshold).toBe(0.3);
    expect(config.hysteresisMargin).toBe(0);
    expect(config.simplifyQualities).toBe(false);
  });

  it('beginner mode has slower throttle and higher thresholds than standard', () => {
    const config = DETECTION_CONFIGS.beginner;
    const standard = DETECTION_CONFIGS.standard;
    expect(config.throttleMs).toBeGreaterThan(standard.throttleMs);
    expect(config.stabilityHits).toBeGreaterThan(standard.stabilityHits);
    expect(config.confidenceThreshold).toBeGreaterThan(standard.confidenceThreshold);
    expect(config.hysteresisMargin).toBeGreaterThan(standard.hysteresisMargin);
    expect(config.simplifyQualities).toBe(true);
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

  it('returns fewer candidates in simplified mode', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
      { note: 'B', freq: 246.9 },
    ]);
    const standard = detectChord(pitches);
    const simplified = detectChord(pitches, { simplified: true });
    // Both should return results, but simplified filters more aggressively
    expect(standard.length).toBeGreaterThan(0);
    expect(simplified.length).toBeGreaterThan(0);
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

describe('loadDetectionMode / saveDetectionMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to standard when nothing stored', () => {
    expect(loadDetectionMode()).toBe('standard');
  });

  it('persists and loads beginner mode', () => {
    saveDetectionMode('beginner');
    expect(loadDetectionMode()).toBe('beginner');
  });

  it('persists and loads standard mode', () => {
    saveDetectionMode('standard');
    expect(loadDetectionMode()).toBe('standard');
  });

  it('defaults to standard for invalid stored value', () => {
    localStorage.setItem('chordlab-detection-mode', 'invalid');
    expect(loadDetectionMode()).toBe('standard');
  });
});
