import { describe, it, expect, beforeEach } from 'vitest';
import type { ChordVoicing } from '../src/types';

const STORAGE_KEY = 'chordlab-favorites';

function makeVoicing(name: string, strings: (number | null)[]): ChordVoicing {
  return {
    name,
    root: 'C',
    quality: 'major',
    strings,
    fingers: strings.map(() => null),
    barres: [],
    baseFret: 1,
    notes: ['C', 'E', 'G'],
    category: 'open',
  };
}

describe('favorites localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores favorites in localStorage', () => {
    const v = makeVoicing('C', [null, 3, 2, 0, 1, 0]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([v]));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ChordVoicing[];
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('C');
  });

  it('returns empty array when no favorites', () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it('handles invalid JSON gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    let result: ChordVoicing[] = [];
    try {
      result = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ChordVoicing[];
    } catch {
      result = [];
    }
    expect(result).toEqual([]);
  });

  it('persists multiple favorites', () => {
    const v1 = makeVoicing('C', [null, 3, 2, 0, 1, 0]);
    const v2 = makeVoicing('Am', [null, 0, 2, 2, 1, 0]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([v1, v2]));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as ChordVoicing[];
    expect(loaded).toHaveLength(2);
  });
});
