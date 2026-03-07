import type { ChordDefinition, NoteName, ParsedChord } from '../types';
import { CHROMATIC_NOTES, normalizeNote } from '../utils/musicTheory';

export const CHORD_DEFINITIONS: Record<string, ChordDefinition> = {
  major:   { name: 'Major',           symbol: '',       intervals: [0, 4, 7] },
  minor:   { name: 'Minor',           symbol: 'm',      intervals: [0, 3, 7] },
  dim:     { name: 'Diminished',      symbol: 'dim',    intervals: [0, 3, 6] },
  aug:     { name: 'Augmented',       symbol: 'aug',    intervals: [0, 4, 8] },
  dom7:    { name: 'Dominant 7th',    symbol: '7',      intervals: [0, 4, 7, 10] },
  maj7:    { name: 'Major 7th',       symbol: 'maj7',   intervals: [0, 4, 7, 11] },
  min7:    { name: 'Minor 7th',       symbol: 'm7',     intervals: [0, 3, 7, 10] },
  min7b5:  { name: 'Half Diminished', symbol: 'm7b5',   intervals: [0, 3, 6, 10] },
  dim7:    { name: 'Diminished 7th',  symbol: 'dim7',   intervals: [0, 3, 6, 9] },
  sus2:    { name: 'Suspended 2nd',   symbol: 'sus2',   intervals: [0, 2, 7] },
  sus4:    { name: 'Suspended 4th',   symbol: 'sus4',   intervals: [0, 5, 7] },
  dom7sus4:{ name: '7sus4',           symbol: '7sus4',  intervals: [0, 5, 7, 10] },
  dom9:    { name: 'Dominant 9th',    symbol: '9',      intervals: [0, 4, 7, 10, 14] },
  maj9:    { name: 'Major 9th',       symbol: 'maj9',   intervals: [0, 4, 7, 11, 14] },
  min9:    { name: 'Minor 9th',       symbol: 'm9',     intervals: [0, 3, 7, 10, 14] },
  dom11:   { name: '11th',            symbol: '11',     intervals: [0, 4, 7, 10, 14, 17] },
  dom13:   { name: '13th',            symbol: '13',     intervals: [0, 4, 7, 10, 14, 21] },
  add9:    { name: 'Add 9',           symbol: 'add9',   intervals: [0, 4, 7, 14] },
  add11:   { name: 'Add 11',          symbol: 'add11',  intervals: [0, 4, 7, 17] },
  sixth:   { name: '6th',             symbol: '6',      intervals: [0, 4, 7, 9] },
  min6:    { name: 'Minor 6th',       symbol: 'm6',     intervals: [0, 3, 7, 9] },
  dom7s5:  { name: '7#5',             symbol: '7#5',    intervals: [0, 4, 8, 10] },
  dom7b5:  { name: '7b5',             symbol: '7b5',    intervals: [0, 4, 6, 10] },
  dom7s9:  { name: '7#9',             symbol: '7#9',    intervals: [0, 4, 7, 10, 15] },
  dom7b9:  { name: '7b9',             symbol: '7b9',    intervals: [0, 4, 7, 10, 13] },
  power:   { name: 'Power Chord',     symbol: '5',      intervals: [0, 7] },
};

// Ordered longest-first so parsing matches greedily
const SYMBOL_TO_QUALITY: [string, string][] = Object.entries(CHORD_DEFINITIONS)
  .map(([quality, def]) => [def.symbol, quality] as [string, string])
  .sort((a, b) => b[0].length - a[0].length);

export function parseChordName(input: string): ParsedChord | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Extract root note (1-2 chars)
  let root: NoteName | null = null;
  let rest = '';

  // Try 2-char root first (e.g., C#, Bb)
  if (trimmed.length >= 2) {
    const twoChar = trimmed.substring(0, 2);
    try {
      root = normalizeNote(twoChar);
      rest = trimmed.substring(2);
    } catch {
      // not a valid 2-char note
    }
  }

  // Try 1-char root
  if (!root && trimmed.length >= 1) {
    const oneChar = trimmed.substring(0, 1).toUpperCase();
    try {
      root = normalizeNote(oneChar);
      rest = trimmed.substring(1);
    } catch {
      return null;
    }
  }

  if (!root) return null;

  // Match quality suffix
  if (rest === '') {
    return { root, quality: 'major', displayName: `${root}` };
  }

  for (const [symbol, quality] of SYMBOL_TO_QUALITY) {
    if (symbol && rest === symbol) {
      return { root, quality, displayName: `${root}${symbol}` };
    }
  }

  return null;
}

export function formatChordName(root: NoteName, quality: string): string {
  const def = CHORD_DEFINITIONS[quality];
  if (!def) return `${root}?`;
  return `${root}${def.symbol}`;
}

export function getAllChordNames(): string[] {
  const names: string[] = [];
  for (const note of CHROMATIC_NOTES) {
    for (const [, def] of Object.entries(CHORD_DEFINITIONS)) {
      names.push(`${note}${def.symbol}`);
    }
  }
  return names;
}
