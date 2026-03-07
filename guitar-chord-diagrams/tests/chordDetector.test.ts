import { describe, it, expect } from 'vitest';
import { detectChord, detectedToParseResult } from '../src/audio/chordDetector';
import type { DetectedPitch } from '../src/types';

function makePitches(notes: { note: string; freq: number }[]): DetectedPitch[] {
  return notes.map((n, i) => ({
    note: n.note as DetectedPitch['note'],
    frequency: n.freq,
    confidence: 0.9 - i * 0.05,
    octave: Math.round(Math.log2(n.freq / 16.35)),
  }));
}

describe('detectChord', () => {
  it('returns empty array for fewer than 2 pitches', () => {
    const pitches = makePitches([{ note: 'A', freq: 110 }]);
    expect(detectChord(pitches)).toEqual([]);
  });

  it('detects C major from C, E, G', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('C');
    expect(results[0].quality).toBe('major');
    expect(results[0].root).toBe('C');
  });

  it('detects A minor from A, C, E', () => {
    const pitches = makePitches([
      { note: 'A', freq: 110 },
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('A');
    expect(results[0].quality).toBe('minor');
  });

  it('detects G7 from G, B, D, F', () => {
    const pitches = makePitches([
      { note: 'G', freq: 98 },
      { note: 'B', freq: 123.5 },
      { note: 'D', freq: 146.8 },
      { note: 'F', freq: 174.6 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('G');
    expect(results[0].quality).toBe('dom7');
  });

  it('detects Am7 from A, C, E, G with A in bass', () => {
    const pitches = makePitches([
      { note: 'A', freq: 110 },   // lowest = bass note
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    // Should prefer Am7 over C6 because A is in the bass
    expect(results[0].root).toBe('A');
    expect(results[0].quality).toBe('min7');
  });

  it('detects E minor from E, G, B', () => {
    const pitches = makePitches([
      { note: 'E', freq: 82.4 },
      { note: 'G', freq: 196 },
      { note: 'B', freq: 246.9 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('E');
    expect(results[0].quality).toBe('minor');
  });

  it('detects D major from D, F#, A', () => {
    const pitches = makePitches([
      { note: 'D', freq: 146.8 },
      { note: 'F#', freq: 185 },
      { note: 'A', freq: 220 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].root).toBe('D');
    expect(results[0].quality).toBe('major');
  });

  it('returns confidence scores between 0 and 1', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches);
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('returns max 3 results', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
      { note: 'B', freq: 246.9 },
    ]);
    const results = detectChord(pitches);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('includes voicings in results', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches);
    expect(results[0].allVoicings.length).toBeGreaterThan(0);
  });

  it('includes detected notes in results', () => {
    const pitches = makePitches([
      { note: 'A', freq: 110 },
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
    ]);
    const results = detectChord(pitches);
    expect(results[0].detectedNotes).toContain('A');
    expect(results[0].detectedNotes).toContain('C');
    expect(results[0].detectedNotes).toContain('E');
  });
});

describe('detectedToParseResult', () => {
  it('converts DetectedChord to ParsedChord format', () => {
    const pitches = makePitches([
      { note: 'C', freq: 130.8 },
      { note: 'E', freq: 164.8 },
      { note: 'G', freq: 196.0 },
    ]);
    const results = detectChord(pitches);
    const parsed = detectedToParseResult(results[0]);
    expect(parsed.root).toBe('C');
    expect(parsed.quality).toBe('major');
    expect(parsed.displayName).toBe('C');
  });
});
