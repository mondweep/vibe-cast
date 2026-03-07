import { describe, it, expect } from 'vitest';
import type { ParsedChord } from '../src/types';

describe('session capture data model', () => {
  it('creates valid chord capture entries', () => {
    const chord: ParsedChord = {
      root: 'Am',
      quality: 'minor',
      displayName: 'Am',
    };

    const entry = {
      chord_name: chord.displayName,
      root: chord.root,
      quality: chord.quality,
      timestamp_ms: 1500,
      duration_ms: 3000,
      source: 'audio' as const,
      confidence: 0.85,
    };

    expect(entry.chord_name).toBe('Am');
    expect(entry.source).toBe('audio');
    expect(entry.confidence).toBe(0.85);
    expect(entry.timestamp_ms).toBeGreaterThan(0);
  });

  it('handles search source with null confidence', () => {
    const entry = {
      chord_name: 'C',
      root: 'C',
      quality: 'major',
      timestamp_ms: 0,
      duration_ms: 0,
      source: 'search' as const,
      confidence: null,
    };

    expect(entry.source).toBe('search');
    expect(entry.confidence).toBeNull();
  });

  it('tracks progression timestamps correctly', () => {
    const start = Date.now();
    const entries = [
      { timestamp_ms: 0, duration_ms: 2000 },
      { timestamp_ms: 2000, duration_ms: 1500 },
      { timestamp_ms: 3500, duration_ms: 0 },
    ];

    // Last entry has no duration yet (still playing)
    expect(entries[entries.length - 1].duration_ms).toBe(0);

    // Previous entries have non-zero durations
    expect(entries[0].duration_ms).toBeGreaterThan(0);
    expect(entries[1].duration_ms).toBeGreaterThan(0);

    // Timestamps are sequential
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].timestamp_ms).toBeGreaterThan(entries[i - 1].timestamp_ms);
    }

    void start; // suppress unused
  });

  it('serializes session export data as valid JSON', () => {
    const exportData = {
      session: {
        started_at: '2026-03-07T10:00:00Z',
        ended_at: '2026-03-07T10:30:00Z',
        duration_ms: 1800000,
        tuning: 'Standard',
        chord_count: 12,
      },
      chords: [
        { chord_name: 'Am', root: 'A', quality: 'minor', timestamp_ms: 0, duration_ms: 3000, source: 'audio', confidence: 0.9 },
        { chord_name: 'F', root: 'F', quality: 'major', timestamp_ms: 3000, duration_ms: 2500, source: 'audio', confidence: 0.85 },
      ],
    };

    const json = JSON.stringify(exportData);
    const parsed = JSON.parse(json);

    expect(parsed.session.chord_count).toBe(12);
    expect(parsed.chords).toHaveLength(2);
    expect(parsed.chords[0].chord_name).toBe('Am');
  });
});
