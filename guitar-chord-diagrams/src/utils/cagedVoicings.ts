import type { NoteName, ChordVoicing } from '../types';
import { applyFormula, noteIndex } from './musicTheory';
import { getNoteAtFret } from './fretboardMath';
import { CHORD_DEFINITIONS } from '../data/chordDefinitions';

/**
 * CAGED system template shapes.
 * Each template defines a moveable chord pattern with:
 *   - form: which CAGED shape it's based on
 *   - rootString: which string carries the root note (0=low E, 1=A, etc.)
 *   - rootFret: fret of the root in the template (relative offset from base)
 *   - shape: fret offsets from baseFret for each string (null = muted)
 *   - fingerTemplate: finger assignments
 */
interface CAGEDTemplate {
  form: 'C' | 'A' | 'G' | 'E' | 'D';
  rootString: number;
  rootFretOffset: number; // semitones from nut where root sits in the template
  shape: (number | null)[];       // fret offsets relative to base position
  fingerTemplate: (number | null)[];
  barreOffset: number | null;     // relative fret for barre, or null
  barreFromString: number;
  barreToString: number;
}

// Templates based on open chord shapes, made moveable
const MAJOR_TEMPLATES: CAGEDTemplate[] = [
  {
    form: 'E',
    rootString: 0,
    rootFretOffset: 0,
    shape: [0, 2, 2, 1, 0, 0],
    fingerTemplate: [1, 3, 4, 2, 1, 1],
    barreOffset: 0,
    barreFromString: 0,
    barreToString: 5,
  },
  {
    form: 'A',
    rootString: 1,
    rootFretOffset: 0,
    shape: [null, 0, 2, 2, 2, 0],
    fingerTemplate: [null, 1, 2, 3, 4, 1],
    barreOffset: 0,
    barreFromString: 1,
    barreToString: 5,
  },
  {
    form: 'D',
    rootString: 3,
    rootFretOffset: 0,
    shape: [null, null, 0, 2, 3, 2],
    fingerTemplate: [null, null, null, 1, 3, 2],
    barreOffset: null,
    barreFromString: 0,
    barreToString: 0,
  },
  {
    form: 'C',
    rootString: 1,
    rootFretOffset: 3,
    shape: [null, 3, 2, 0, 1, 0],
    fingerTemplate: [null, 3, 2, null, 1, null],
    barreOffset: null,
    barreFromString: 0,
    barreToString: 0,
  },
  {
    form: 'G',
    rootString: 0,
    rootFretOffset: 3,
    shape: [3, 2, 0, 0, 0, 3],
    fingerTemplate: [2, 1, null, null, null, 3],
    barreOffset: null,
    barreFromString: 0,
    barreToString: 0,
  },
];

const MINOR_TEMPLATES: CAGEDTemplate[] = [
  {
    form: 'E',
    rootString: 0,
    rootFretOffset: 0,
    shape: [0, 2, 2, 0, 0, 0],
    fingerTemplate: [1, 3, 4, 1, 1, 1],
    barreOffset: 0,
    barreFromString: 0,
    barreToString: 5,
  },
  {
    form: 'A',
    rootString: 1,
    rootFretOffset: 0,
    shape: [null, 0, 2, 2, 1, 0],
    fingerTemplate: [null, 1, 3, 4, 2, 1],
    barreOffset: 0,
    barreFromString: 1,
    barreToString: 5,
  },
  {
    form: 'D',
    rootString: 3,
    rootFretOffset: 0,
    shape: [null, null, 0, 2, 3, 1],
    fingerTemplate: [null, null, null, 2, 3, 1],
    barreOffset: null,
    barreFromString: 0,
    barreToString: 0,
  },
];

/**
 * Generate CAGED voicings for a given root and quality.
 * Transposes the template shapes to place the root at the correct position.
 */
export function generateCAGEDVoicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[]
): ChordVoicing[] {
  const def = CHORD_DEFINITIONS[quality];
  if (!def) return [];

  // Select templates based on quality
  let templates: CAGEDTemplate[];
  if (quality === 'major') {
    templates = MAJOR_TEMPLATES;
  } else if (quality === 'minor') {
    templates = MINOR_TEMPLATES;
  } else {
    // For other qualities, use major/minor E and A forms as base
    templates = def.intervals.includes(3) ? MINOR_TEMPLATES.slice(0, 2) : MAJOR_TEMPLATES.slice(0, 2);
  }

  const chordNotes = [...new Set(applyFormula(root, def.intervals.map(i => i % 12)))] as NoteName[];
  const voicings: ChordVoicing[] = [];

  for (const template of templates) {
    // Calculate how many semitones to shift the template
    const openStringNote = tuning[template.rootString];
    const openStringIdx = noteIndex(openStringNote);
    const rootIdx = noteIndex(root);
    const shift = ((rootIdx - openStringIdx - template.rootFretOffset) % 12 + 12) % 12;

    // Don't generate if shift would go past fret 15
    if (shift > 15) continue;

    // Build the actual fret positions
    const strings: (number | null)[] = template.shape.map(fret => {
      if (fret === null) return null;
      return fret + shift;
    });

    // Validate: all frets must be <= 17 and >= 0
    if (strings.some(f => f !== null && (f < 0 || f > 17))) continue;

    // Validate: fret span must be <= 5
    const frettedValues = strings.filter(f => f !== null && f > 0) as number[];
    if (frettedValues.length > 0) {
      const span = Math.max(...frettedValues) - Math.min(...frettedValues);
      if (span > 5) continue;
    }

    // Build notes
    const notes: NoteName[] = [];
    for (let i = 0; i < strings.length; i++) {
      if (strings[i] !== null) {
        const note = getNoteAtFret(tuning[i], strings[i]!);
        notes.push(note);
      }
    }

    // Verify that the voicing actually contains chord tones
    const uniqueNotes = [...new Set(notes)];
    const matchedTones = uniqueNotes.filter(n => chordNotes.includes(n)).length;
    if (matchedTones < Math.min(3, chordNotes.length)) continue;

    // Build barres
    const barres: ChordVoicing['barres'] = [];
    if (template.barreOffset !== null && shift > 0) {
      const barreFret = template.barreOffset + shift;
      barres.push({
        fret: barreFret,
        fromString: template.barreFromString,
        toString: template.barreToString,
        finger: 1,
      });
    }

    // Assign fingers
    const fingers: (number | null)[] = template.fingerTemplate.map(f => f);
    // Adjust: if no barre in original but shift > 0, we might need a barre
    if (template.barreOffset === null && shift > 0) {
      // Simple heuristic: assign fingers based on relative positions
      let nextFinger = 1;
      const sortedPositions = strings
        .map((f, i) => ({ fret: f, string: i }))
        .filter(p => p.fret !== null && p.fret > 0)
        .sort((a, b) => a.fret! - b.fret! || a.string - b.string);
      const newFingers: (number | null)[] = strings.map(() => null);
      for (const pos of sortedPositions) {
        if (nextFinger <= 4) {
          newFingers[pos.string] = nextFinger++;
        }
      }
      fingers.splice(0, fingers.length, ...newFingers);
    }

    const baseFret = frettedValues.length > 0 ? Math.min(...frettedValues) : 1;
    const hasOpen = strings.some(f => f === 0);

    voicings.push({
      name: `${root}${def.symbol}`,
      root,
      quality,
      strings,
      fingers,
      barres,
      baseFret: hasOpen ? 1 : baseFret,
      notes,
      category: hasOpen ? 'open' : 'barre',
    });
  }

  return voicings;
}
