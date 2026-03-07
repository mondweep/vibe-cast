import type { ChordVoicing, NoteName } from '../types';
import { noteToFrequency } from '../utils/musicTheory';
import { getNoteAtFret } from '../utils/fretboardMath';

// Standard tuning octaves for each string (low to high)
const STRING_OCTAVES = [2, 2, 3, 3, 3, 4];

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Play a chord voicing using Web Audio API synthesis.
 * Simulates a guitar strum with staggered note onsets.
 */
export function playVoicing(
  voicing: ChordVoicing,
  tuning: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'],
  direction: 'down' | 'up' = 'down'
): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Master gain
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.3, now);
  masterGain.connect(ctx.destination);

  const strumDelay = 0.03; // 30ms between strings
  const sustainTime = 1.5;
  const decayTime = 1.0;

  const playOrder = direction === 'down'
    ? [0, 1, 2, 3, 4, 5]
    : [5, 4, 3, 2, 1, 0];

  let strumIndex = 0;

  for (const stringIdx of playOrder) {
    const fret = voicing.strings[stringIdx];
    if (fret === null) continue;

    const note = getNoteAtFret(tuning[stringIdx], fret);
    const octave = getOctaveForString(stringIdx, fret);
    const frequency = noteToFrequency(note, octave);

    const startTime = now + strumIndex * strumDelay;

    playGuitarNote(ctx, masterGain, frequency, startTime, sustainTime, decayTime);
    strumIndex++;
  }
}

/**
 * Calculate the octave for a note on a specific string and fret.
 */
function getOctaveForString(stringIdx: number, fret: number): number {
  const baseOctave = STRING_OCTAVES[stringIdx];
  // Each 12 frets raises the octave by 1
  return baseOctave + Math.floor(fret / 12);
}

/**
 * Synthesize a single guitar-like note.
 * Uses a combination of sawtooth + triangle oscillators with
 * an envelope to approximate a plucked string sound.
 */
function playGuitarNote(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startTime: number,
  sustainTime: number,
  decayTime: number
): void {
  // Create oscillators for richer tone
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(frequency, startTime);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(frequency, startTime);

  // Individual gains for mixing
  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0.6, startTime);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.15, startTime);

  // Envelope
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, startTime);
  // Attack (quick pluck)
  envelope.gain.linearRampToValueAtTime(1.0, startTime + 0.005);
  // Quick initial decay
  envelope.gain.exponentialRampToValueAtTime(0.5, startTime + 0.1);
  // Sustain
  envelope.gain.exponentialRampToValueAtTime(0.3, startTime + sustainTime);
  // Release
  envelope.gain.exponentialRampToValueAtTime(0.001, startTime + sustainTime + decayTime);

  // Low-pass filter to soften the tone
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000 + frequency * 2, startTime);
  filter.frequency.exponentialRampToValueAtTime(400, startTime + sustainTime);
  filter.Q.setValueAtTime(1, startTime);

  // Connect graph
  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(filter);
  gain2.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);

  // Start and stop
  const endTime = startTime + sustainTime + decayTime + 0.1;
  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(endTime);
  osc2.stop(endTime);
}

/**
 * Play a single note (for testing or UI feedback).
 */
export function playNote(note: NoteName, octave: number): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const frequency = noteToFrequency(note, octave);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.3, now);
  masterGain.connect(ctx.destination);

  playGuitarNote(ctx, masterGain, frequency, now, 0.8, 0.5);
}
