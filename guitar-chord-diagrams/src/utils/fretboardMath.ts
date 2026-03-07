import type { NoteName, ChordVoicing, Barre } from '../types';
import { transposeNote, applyFormula } from './musicTheory';
import { CHORD_DEFINITIONS } from '../data/chordDefinitions';
import { STANDARD_TUNING_NOTES } from '../data/tunings';

const MAX_FRET = 15;
const MAX_FRET_SPAN = 4;
const NUM_STRINGS = 6;

export function getNoteAtFret(stringNote: NoteName, fret: number): NoteName {
  return transposeNote(stringNote, fret);
}

export function findNotePositions(
  note: NoteName,
  tuning: NoteName[] = STANDARD_TUNING_NOTES,
  maxFret: number = MAX_FRET
): { string: number; fret: number }[] {
  const positions: { string: number; fret: number }[] = [];
  for (let s = 0; s < tuning.length; s++) {
    for (let f = 0; f <= maxFret; f++) {
      if (getNoteAtFret(tuning[s], f) === note) {
        positions.push({ string: s, fret: f });
      }
    }
  }
  return positions;
}

export function generateVoicings(
  root: NoteName,
  quality: string,
  tuning: NoteName[] = STANDARD_TUNING_NOTES
): ChordVoicing[] {
  const def = CHORD_DEFINITIONS[quality];
  if (!def) return [];

  // Get the notes needed (mod 12 for extended chords)
  const rawNotes = applyFormula(root, def.intervals);
  const chordNotes = [...new Set(rawNotes)] as NoteName[];

  // Find all positions for each chord note on each string
  const stringOptions: { fret: number; note: NoteName }[][] = [];
  for (let s = 0; s < NUM_STRINGS; s++) {
    const options: { fret: number; note: NoteName }[] = []; // muted is handled separately
    for (let f = 0; f <= MAX_FRET; f++) {
      const noteAtFret = getNoteAtFret(tuning[s], f);
      if (chordNotes.includes(noteAtFret)) {
        options.push({ fret: f, note: noteAtFret });
      }
    }
    stringOptions.push(options);
  }

  const voicings: ChordVoicing[] = [];
  const seen = new Set<string>();

  // Generate combinations — use a recursive approach with pruning
  function generate(
    stringIdx: number,
    current: (number | null)[],
    currentNotes: NoteName[],
    minFret: number,
    maxFretUsed: number
  ) {
    if (stringIdx === NUM_STRINGS) {
      // Validate: at least 3 strings played
      const playedStrings = current.filter(f => f !== null);
      if (playedStrings.length < 3) return;

      // Must contain the root
      if (!currentNotes.includes(root)) return;

      // Must contain at least 3 different chord tones for 4+ note chords, or all tones for triads
      const uniqueNotes = [...new Set(currentNotes)];
      if (chordNotes.length <= 3 && uniqueNotes.length < chordNotes.length) return;
      if (chordNotes.length > 3 && uniqueNotes.length < 3) return;

      const key = current.map(f => f ?? 'x').join('-');
      if (seen.has(key)) return;
      seen.add(key);

      const voicing = buildVoicing(root, quality, current as (number | null)[], currentNotes, tuning);
      if (voicing) voicings.push(voicing);
      return;
    }

    // Option: mute this string
    generate(stringIdx + 1, [...current, null], [...currentNotes], minFret, maxFretUsed);

    // Option: play a note on this string
    for (const opt of stringOptions[stringIdx]) {
      const newMin = opt.fret === 0 ? minFret : Math.min(minFret, opt.fret);
      const newMax = opt.fret === 0 ? maxFretUsed : Math.max(maxFretUsed, opt.fret);

      // Prune if fret span exceeds max
      if (newMax - newMin > MAX_FRET_SPAN) continue;

      generate(
        stringIdx + 1,
        [...current, opt.fret],
        [...currentNotes, opt.note],
        newMin,
        newMax
      );
    }
  }

  generate(0, [], [], Infinity, 0);

  // Score and sort voicings
  return voicings
    .map(v => ({ voicing: v, score: scoreVoicing(v, root, chordNotes) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30) // limit to top 30
    .map(v => v.voicing);
}

function scoreVoicing(v: ChordVoicing, root: NoteName, chordNotes: NoteName[]): number {
  let score = 0;

  // Prefer root in bass
  const bassNote = v.notes[0];
  if (bassNote === root) score += 20;

  // Prefer more strings played
  const played = v.strings.filter(f => f !== null).length;
  score += played * 3;

  // Prefer open strings
  const openStrings = v.strings.filter(f => f === 0).length;
  score += openStrings * 5;

  // Prefer lower positions
  const frets = v.strings.filter(f => f !== null && f > 0) as number[];
  if (frets.length > 0) {
    const avgFret = frets.reduce((a, b) => a + b, 0) / frets.length;
    score -= avgFret * 2;
  }

  // Prefer smaller fret span
  if (frets.length > 1) {
    const span = Math.max(...frets) - Math.min(...frets);
    score -= span * 3;
  }

  // Prefer all chord tones present
  const uniqueNotes = [...new Set(v.notes)];
  const coverage = uniqueNotes.filter(n => chordNotes.includes(n)).length / chordNotes.length;
  score += coverage * 15;

  // Prefer no consecutive muted strings in the middle
  let hasMiddleMute = false;
  const firstPlayed = v.strings.findIndex(f => f !== null);
  const lastPlayed = v.strings.length - 1 - [...v.strings].reverse().findIndex(f => f !== null);
  for (let i = firstPlayed + 1; i < lastPlayed; i++) {
    if (v.strings[i] === null) hasMiddleMute = true;
  }
  if (hasMiddleMute) score -= 15;

  // Categorization bonus
  if (v.category === 'open') score += 10;

  return score;
}

function buildVoicing(
  root: NoteName,
  quality: string,
  strings: (number | null)[],
  _notes: NoteName[],
  tuning: NoteName[]
): ChordVoicing | null {
  const frettedPositions = strings
    .map((f, i) => ({ fret: f, string: i }))
    .filter(p => p.fret !== null && p.fret > 0) as { fret: number; string: number }[];

  if (frettedPositions.length === 0 && strings.some(f => f === 0)) {
    // All open chord
    const def = CHORD_DEFINITIONS[quality];
    return {
      name: `${root}${def.symbol}`,
      root,
      quality,
      strings,
      fingers: strings.map(() => null),
      barres: [],
      baseFret: 1,
      notes: strings.filter((_, i) => strings[i] !== null).map((f, i) => {
        const actualIdx = strings.indexOf(f!, i > 0 ? strings.indexOf(f!) + 1 : 0);
        return getNoteAtFret(tuning[actualIdx >= 0 ? actualIdx : i], f!);
      }),
      category: 'open',
    };
  }

  const minFret = frettedPositions.length > 0
    ? Math.min(...frettedPositions.map(p => p.fret))
    : 1;
  // Detect barres
  const barres = detectBarres(strings, frettedPositions);

  // Assign fingers
  const fingers = assignFingers(strings, barres, minFret);

  // Check finger count (max 4 fingers)
  const fingerCount = new Set(fingers.filter(f => f !== null && f > 0)).size;
  if (fingerCount > 4) return null;

  // Build notes array (only for played strings)
  const voicingNotes: NoteName[] = [];
  for (let i = 0; i < strings.length; i++) {
    if (strings[i] !== null) {
      voicingNotes.push(getNoteAtFret(tuning[i], strings[i]!));
    }
  }

  const isOpen = minFret <= 3 && strings.some(f => f === 0);
  const hasBarre = barres.length > 0;
  const category: ChordVoicing['category'] = isOpen ? 'open' : hasBarre ? 'barre' : 'partial';

  const def = CHORD_DEFINITIONS[quality];
  const baseFret = isOpen ? 1 : minFret;

  return {
    name: `${root}${def.symbol}`,
    root,
    quality,
    strings,
    fingers,
    barres,
    baseFret,
    notes: voicingNotes,
    category,
  };
}

function detectBarres(
  strings: (number | null)[],
  frettedPositions: { fret: number; string: number }[]
): Barre[] {
  const barres: Barre[] = [];
  const fretCounts = new Map<number, { string: number; fret: number }[]>();

  for (const pos of frettedPositions) {
    const existing = fretCounts.get(pos.fret) || [];
    existing.push(pos);
    fretCounts.set(pos.fret, existing);
  }

  // A barre is when the lowest fret has 2+ notes and forms a continuous span
  const minFret = Math.min(...frettedPositions.map(p => p.fret));
  const minFretPositions = fretCounts.get(minFret);

  if (minFretPositions && minFretPositions.length >= 2) {
    const sortedStrings = minFretPositions.map(p => p.string).sort((a, b) => a - b);
    const fromString = sortedStrings[0];
    const toString = sortedStrings[sortedStrings.length - 1];

    // Check that all strings in between are either at this fret or higher
    let validBarre = true;
    for (let s = fromString; s <= toString; s++) {
      const fret = strings[s];
      if (fret === null || fret < minFret) {
        validBarre = false;
        break;
      }
    }

    if (validBarre) {
      barres.push({
        fret: minFret,
        fromString,
        toString,
        finger: 1,
      });
    }
  }

  return barres;
}

function assignFingers(
  strings: (number | null)[],
  barres: Barre[],
  _minFret: number
): (number | null)[] {
  const fingers: (number | null)[] = new Array(strings.length).fill(null);
  const barreFret = barres.length > 0 ? barres[0].fret : -1;

  // Collect non-barre fretted positions
  const positions: { string: number; fret: number }[] = [];
  for (let i = 0; i < strings.length; i++) {
    if (strings[i] !== null && strings[i]! > 0) {
      if (strings[i] === barreFret && barres.length > 0) {
        fingers[i] = 1; // barre finger
      } else {
        positions.push({ string: i, fret: strings[i]! });
      }
    }
  }

  // Sort remaining positions by fret then string
  positions.sort((a, b) => a.fret - b.fret || a.string - b.string);

  // Assign fingers 2, 3, 4 to remaining
  let nextFinger = barres.length > 0 ? 2 : 1;
  for (const pos of positions) {
    if (nextFinger <= 4) {
      fingers[pos.string] = nextFinger++;
    }
  }

  return fingers;
}
