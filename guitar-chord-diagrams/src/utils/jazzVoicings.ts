import type { NoteName, ChordVoicing } from '../types';
import { applyFormula } from './musicTheory';
import { getNoteAtFret } from './fretboardMath';
import { CHORD_DEFINITIONS } from '../data/chordDefinitions';

/**
 * Generate Drop 2 voicings.
 * A Drop 2 voicing takes a close-position chord and drops the second-from-top
 * note down an octave, creating wider intervals suitable for guitar.
 */
export function generateDrop2Voicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[]
): ChordVoicing[] {
  const def = CHORD_DEFINITIONS[quality];
  if (!def || def.intervals.length < 4) return []; // Need at least 4 notes

  // Get chord tones (mod 12)
  const chordTones = applyFormula(root, def.intervals.slice(0, 4).map(i => i % 12));

  const voicings: ChordVoicing[] = [];

  // Generate all inversions of close-position voicing
  for (let inversion = 0; inversion < chordTones.length; inversion++) {
    const rotated = [...chordTones.slice(inversion), ...chordTones.slice(0, inversion)];

    // Drop 2: move the 2nd-from-top down (which is index rotated.length - 2)
    // In a 4-note chord [bass, tenor, alto, soprano]: drop alto
    // Result: [alto(low), bass, tenor, soprano]
    const drop2 = [rotated[2], rotated[0], rotated[1], rotated[3]];

    // Try placing on different string sets
    const stringSets = [
      [1, 2, 3, 4], // A-D-G-B (common jazz set)
      [2, 3, 4, 5], // D-G-B-e (top 4)
      [0, 1, 2, 3], // E-A-D-G (bottom 4)
    ];

    for (const stringSet of stringSets) {
      const voicing = placeNotesOnStrings(
        root, quality, drop2, stringSet, tuning, 'drop2'
      );
      if (voicing) voicings.push(voicing);
    }
  }

  return voicings;
}

/**
 * Generate Drop 3 voicings.
 * Drops the third-from-top note down an octave.
 */
export function generateDrop3Voicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[]
): ChordVoicing[] {
  const def = CHORD_DEFINITIONS[quality];
  if (!def || def.intervals.length < 4) return [];

  const chordTones = applyFormula(root, def.intervals.slice(0, 4).map(i => i % 12));
  const voicings: ChordVoicing[] = [];

  for (let inversion = 0; inversion < chordTones.length; inversion++) {
    const rotated = [...chordTones.slice(inversion), ...chordTones.slice(0, inversion)];

    // Drop 3: move index 1 (tenor) to bass position
    const drop3 = [rotated[1], rotated[0], rotated[2], rotated[3]];

    const stringSets = [
      [0, 1, 2, 3], // E-A-D-G
      [0, 1, 3, 4], // E-A-G-B (skip D — wider spacing)
    ];

    for (const stringSet of stringSets) {
      const voicing = placeNotesOnStrings(
        root, quality, drop3, stringSet, tuning, 'drop3'
      );
      if (voicing) voicings.push(voicing);
    }
  }

  return voicings;
}

/**
 * Generate shell voicings (root + 3rd + 7th only).
 * Minimal voicings used in jazz comping.
 */
export function generateShellVoicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[]
): ChordVoicing[] {
  const def = CHORD_DEFINITIONS[quality];
  if (!def) return [];

  // Shell voicings need at least root, 3rd, and 7th
  // For triads without 7th, use root + 3rd + 5th
  const intervals = def.intervals.map(i => i % 12);

  let shellIntervals: number[];
  if (intervals.length >= 4) {
    // Root + 3rd (or sus) + 7th
    shellIntervals = [intervals[0], intervals[1], intervals[3]];
  } else {
    // Root + 3rd + 5th
    shellIntervals = intervals.slice(0, 3);
  }

  const shellNotes = applyFormula(root, shellIntervals);
  const voicings: ChordVoicing[] = [];

  // Common shell voicing string sets
  const stringSets = [
    [0, 2, 3], // E-D-G (root on 6th string)
    [1, 2, 3], // A-D-G (root on 5th string)
    [1, 3, 4], // A-G-B
  ];

  for (const stringSet of stringSets) {
    const voicing = placeNotesOnStrings(
      root, quality, shellNotes, stringSet, tuning, 'shell'
    );
    if (voicing) voicings.push(voicing);
  }

  return voicings;
}

/**
 * Place a set of notes onto specific guitar strings, finding the best fret positions.
 */
function placeNotesOnStrings(
  root: NoteName,
  quality: string,
  notes: NoteName[],
  stringSet: number[],
  tuning: NoteName[],
  _voicingType: string
): ChordVoicing | null {
  if (notes.length !== stringSet.length) return null;

  const def = CHORD_DEFINITIONS[quality];
  if (!def) return null;

  // For each note, find valid fret positions on its assigned string
  const options: { string: number; fret: number; note: NoteName }[][] = [];

  for (let i = 0; i < notes.length; i++) {
    const stringIdx = stringSet[i];
    const targetNote = notes[i];
    const positions: { string: number; fret: number; note: NoteName }[] = [];

    for (let fret = 0; fret <= 15; fret++) {
      if (getNoteAtFret(tuning[stringIdx], fret) === targetNote) {
        positions.push({ string: stringIdx, fret, note: targetNote });
      }
    }

    if (positions.length === 0) return null;
    options.push(positions);
  }

  // Find the combination with the smallest fret span
  let bestCombo: { string: number; fret: number; note: NoteName }[] | null = null;
  let bestSpan = Infinity;

  function findBest(idx: number, current: { string: number; fret: number; note: NoteName }[]) {
    if (idx === options.length) {
      const frets = current.filter(p => p.fret > 0).map(p => p.fret);
      if (frets.length === 0) {
        if (bestSpan > 0) {
          bestSpan = 0;
          bestCombo = [...current];
        }
        return;
      }
      const span = Math.max(...frets) - Math.min(...frets);
      if (span <= 4 && span < bestSpan) {
        bestSpan = span;
        bestCombo = [...current];
      }
      return;
    }

    for (const opt of options[idx]) {
      findBest(idx + 1, [...current, opt]);
    }
  }

  findBest(0, []);

  if (!bestCombo) return null;

  // Re-assign to a new const so TypeScript knows the type after the null guard
  const combo: { string: number; fret: number; note: NoteName }[] = bestCombo;

  // Build the voicing
  const strings: (number | null)[] = new Array(6).fill(null);
  const voicingNotes: NoteName[] = [];

  for (const pos of combo) {
    strings[pos.string] = pos.fret;
  }

  for (let i = 0; i < 6; i++) {
    if (strings[i] !== null) {
      voicingNotes.push(getNoteAtFret(tuning[i], strings[i]!));
    }
  }

  // Assign fingers
  const fretted = combo.filter(p => p.fret > 0).sort((a, b) => a.fret - b.fret || a.string - b.string);
  const fingers: (number | null)[] = new Array(6).fill(null);
  let nextFinger = 1;
  for (const pos of fretted) {
    if (nextFinger <= 4) {
      fingers[pos.string] = nextFinger++;
    }
  }

  const frettedValues = combo.filter(p => p.fret > 0).map(p => p.fret);
  const baseFret = frettedValues.length > 0 ? Math.min(...frettedValues) : 1;
  const hasOpen = strings.some(f => f === 0);

  return {
    name: `${root}${def.symbol}`,
    root,
    quality,
    strings,
    fingers,
    barres: [],
    baseFret: hasOpen ? 1 : baseFret,
    notes: voicingNotes,
    category: 'jazz',
  };
}

/**
 * Generate all jazz voicings for a chord.
 */
export function generateAllJazzVoicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[]
): ChordVoicing[] {
  const all: ChordVoicing[] = [];
  const seen = new Set<string>();

  for (const v of [
    ...generateDrop2Voicings(root, quality, tuning),
    ...generateDrop3Voicings(root, quality, tuning),
    ...generateShellVoicings(root, quality, tuning),
  ]) {
    const key = v.strings.map(f => f ?? 'x').join('-');
    if (!seen.has(key)) {
      seen.add(key);
      all.push(v);
    }
  }

  return all;
}
