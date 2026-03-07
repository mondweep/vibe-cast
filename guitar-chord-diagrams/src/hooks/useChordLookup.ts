import { useMemo } from 'react';
import type { NoteName, ChordVoicing, ParsedChord } from '../types';
import { applyFormula } from '../utils/musicTheory';
import { generateVoicings } from '../utils/fretboardMath';
import { CHORD_DEFINITIONS } from '../data/chordDefinitions';
import { CURATED_VOICINGS } from '../data/chordVoicings';
import { STANDARD_TUNING_NOTES } from '../data/tunings';

export function useChordLookup(chord: ParsedChord | null) {
  const voicings = useMemo<ChordVoicing[]>(() => {
    if (!chord) return [];
    return lookupVoicings(chord.root, chord.quality);
  }, [chord?.root, chord?.quality]);

  const chordNotes = useMemo<NoteName[]>(() => {
    if (!chord) return [];
    const def = CHORD_DEFINITIONS[chord.quality];
    if (!def) return [];
    return [...new Set(applyFormula(chord.root, def.intervals))] as NoteName[];
  }, [chord?.root, chord?.quality]);

  return { voicings, chordNotes };
}

function lookupVoicings(root: NoteName, quality: string): ChordVoicing[] {
  // Get curated voicings for this chord
  const curated = CURATED_VOICINGS.filter(
    v => v.root === root && v.quality === quality
  );

  // Generate algorithmic voicings
  const generated = generateVoicings(root, quality, STANDARD_TUNING_NOTES);

  // Merge: curated first, then generated (deduplicated)
  const seen = new Set<string>();
  const result: ChordVoicing[] = [];

  for (const v of curated) {
    const key = v.strings.map(f => f ?? 'x').join('-');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(v);
    }
  }

  for (const v of generated) {
    const key = v.strings.map(f => f ?? 'x').join('-');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(v);
    }
  }

  return result;
}
