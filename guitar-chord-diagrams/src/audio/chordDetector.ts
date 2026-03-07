import type { DetectedPitch, DetectedChord, NoteName, ChordVoicing } from '../types';
import { CHROMATIC_NOTES, applyFormula } from '../utils/musicTheory';
import { CHORD_DEFINITIONS, formatChordName } from '../data/chordDefinitions';
import { generateVoicings } from '../utils/fretboardMath';
import { CURATED_VOICINGS } from '../data/chordVoicings';
import { STANDARD_TUNING_NOTES } from '../data/tunings';

// Common chord types get a slight preference in ambiguous situations
const COMMONALITY_WEIGHTS: Record<string, number> = {
  major: 1.0,
  minor: 0.95,
  dom7: 0.85,
  min7: 0.85,
  maj7: 0.80,
  sus4: 0.75,
  sus2: 0.75,
  power: 0.70,
  dim: 0.65,
  aug: 0.60,
  sixth: 0.60,
  min6: 0.55,
};

interface ChordCandidate {
  root: NoteName;
  quality: string;
  score: number;
  matchedTones: number;
  totalTones: number;
}

/**
 * Detect the chord from an array of detected pitches.
 * Returns up to 3 chord matches sorted by confidence.
 */
export function detectChord(pitches: DetectedPitch[]): DetectedChord[] {
  if (pitches.length < 2) return [];

  // Extract unique note names (strip octave)
  const detectedNotes = [...new Set(pitches.map(p => p.note))];
  if (detectedNotes.length < 2) return [];

  // Find the bass note (lowest frequency pitch)
  const sortedByFreq = [...pitches].sort((a, b) => a.frequency - b.frequency);
  const bassNote = sortedByFreq[0].note;

  // Try every possible root + quality combination
  const candidates: ChordCandidate[] = [];

  for (const root of CHROMATIC_NOTES) {
    for (const [quality, def] of Object.entries(CHORD_DEFINITIONS)) {
      // Get the notes that should be in this chord (mod 12)
      const expectedNotes = [...new Set(
        applyFormula(root, def.intervals.map(i => i % 12))
      )] as NoteName[];

      // Count how many detected notes match expected chord tones
      const matchedDetected = detectedNotes.filter(n => expectedNotes.includes(n));
      const matchedTones = matchedDetected.length;

      // Must match at least 2 chord tones
      if (matchedTones < 2) continue;

      // Count how many expected chord tones are present
      const coveredExpected = expectedNotes.filter(n => detectedNotes.includes(n));

      // Base score: combination of coverage metrics
      const detectedCoverage = matchedTones / detectedNotes.length;
      const chordCoverage = coveredExpected.length / expectedNotes.length;
      let score = (detectedCoverage * 0.4) + (chordCoverage * 0.6);

      // Bonus: bass note is the root
      if (bassNote === root) {
        score += 0.15;
      }

      // Bonus: commonality weight
      const commonality = COMMONALITY_WEIGHTS[quality] ?? 0.5;
      score *= (0.7 + 0.3 * commonality);

      // Bonus: all detected notes accounted for (no extra notes beyond the chord)
      const extraNotes = detectedNotes.filter(n => !expectedNotes.includes(n));
      if (extraNotes.length === 0) {
        score += 0.1;
      } else {
        score -= extraNotes.length * 0.08;
      }

      // Penalty: very complex chords (5+ tones) only if coverage is incomplete
      if (def.intervals.length > 4 && chordCoverage < 0.8) {
        score -= 0.05;
      }

      // Ensure root note is among detected notes
      if (!detectedNotes.includes(root)) {
        score -= 0.1;
      }

      candidates.push({
        root,
        quality,
        score: Math.max(0, Math.min(1, score)),
        matchedTones,
        totalTones: expectedNotes.length,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Take top 3, deduplicating enharmonic equivalents
  const results: DetectedChord[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (results.length >= 3) break;

    const name = formatChordName(candidate.root, candidate.quality);
    if (seen.has(name)) continue;
    seen.add(name);

    // Look up voicings for this chord
    const voicings = lookupVoicingsForDetected(candidate.root, candidate.quality);

    results.push({
      name,
      root: candidate.root,
      quality: candidate.quality,
      confidence: candidate.score,
      detectedNotes,
      allVoicings: voicings,
    });
  }

  return results;
}

function lookupVoicingsForDetected(root: NoteName, quality: string): ChordVoicing[] {
  const curated = CURATED_VOICINGS.filter(
    v => v.root === root && v.quality === quality
  );
  const generated = generateVoicings(root, quality, STANDARD_TUNING_NOTES);

  const seen = new Set<string>();
  const result: ChordVoicing[] = [];

  for (const v of [...curated, ...generated]) {
    const key = v.strings.map(f => f ?? 'x').join('-');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(v);
    }
  }

  return result;
}

/**
 * Convert a DetectedChord to a ParsedChord for use with existing UI components.
 */
export function detectedToParseResult(chord: DetectedChord) {
  return {
    root: chord.root,
    quality: chord.quality,
    displayName: chord.name,
  };
}
