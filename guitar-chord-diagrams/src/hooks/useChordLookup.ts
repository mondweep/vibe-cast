import { useMemo } from 'react';
import type { NoteName, ChordVoicing, ParsedChord } from '../types';
import { applyFormula } from '../utils/musicTheory';
import { generateVoicings } from '../utils/fretboardMath';
import { generateCAGEDVoicings } from '../utils/cagedVoicings';
import { generateAllJazzVoicings } from '../utils/jazzVoicings';
import { CHORD_DEFINITIONS } from '../data/chordDefinitions';
import { CURATED_VOICINGS } from '../data/chordVoicings';
import { STANDARD_TUNING_NOTES } from '../data/tunings';

export function useChordLookup(chord: ParsedChord | null, tuning: NoteName[] = STANDARD_TUNING_NOTES) {
  const voicings = useMemo<ChordVoicing[]>(() => {
    if (!chord) return [];
    return lookupVoicings(chord.root, chord.quality, tuning);
  }, [chord?.root, chord?.quality, tuning]);

  const chordNotes = useMemo<NoteName[]>(() => {
    if (!chord) return [];
    const def = CHORD_DEFINITIONS[chord.quality];
    if (!def) return [];
    return [...new Set(applyFormula(chord.root, def.intervals))] as NoteName[];
  }, [chord?.root, chord?.quality]);

  return { voicings, chordNotes };
}

function lookupVoicings(root: NoteName, quality: string, tuning: NoteName[]): ChordVoicing[] {
  const isStandard = tuning.join(',') === STANDARD_TUNING_NOTES.join(',');

  // Get curated voicings (only for standard tuning)
  const curated = isStandard
    ? CURATED_VOICINGS.filter(v => v.root === root && v.quality === quality)
    : [];

  // Generate algorithmic voicings
  const generated = generateVoicings(root, quality, tuning);

  // Generate CAGED voicings
  const caged = generateCAGEDVoicings(root, quality, tuning);

  // Generate jazz voicings
  const jazz = generateAllJazzVoicings(root, quality, tuning);

  // Merge: curated first, then CAGED, then generated, then jazz (all deduplicated)
  const seen = new Set<string>();
  const result: ChordVoicing[] = [];

  for (const v of [...curated, ...caged, ...generated, ...jazz]) {
    const key = v.strings.map(f => f ?? 'x').join('-');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(v);
    }
  }

  return result;
}
