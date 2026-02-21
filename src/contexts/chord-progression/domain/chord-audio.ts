/**
 * Guitar chord audio synthesis using Web Audio API.
 *
 * Calculates real note frequencies from guitar string tuning + fret positions,
 * then plays them simultaneously with a plucked-string envelope.
 */

import { CHORD_LIBRARY } from './chord-data.ts';
import type { ChordName } from './types.ts';

// Standard guitar tuning frequencies (Hz): strings 1-6
const OPEN_STRING_FREQUENCIES: Record<number, number> = {
    1: 329.63, // E4 (high E)
    2: 246.94, // B3
    3: 196.00, // G3
    4: 146.83, // D3
    5: 110.00, // A2
    6: 82.41,  // E2 (low E)
};

// Semitone ratio
const SEMITONE_RATIO = Math.pow(2, 1 / 12);

let audioCtx: AudioContext | null = null;
let activeNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

/**
 * Calculate the frequency of a note at a given string and fret.
 */
function fretToFrequency(stringNum: number, fret: number): number {
    const openFreq = OPEN_STRING_FREQUENCIES[stringNum];
    if (openFreq === undefined) return 0;
    return openFreq * Math.pow(SEMITONE_RATIO, fret);
}

/**
 * Get all note frequencies for a chord voicing.
 * Includes open strings that are commonly strummed for each chord.
 */
function getChordFrequencies(chordName: ChordName): number[] {
    const voicing = CHORD_LIBRARY[chordName];
    if (!voicing) return [];

    const frequencies: number[] = [];

    // Add fretted positions
    for (const pos of voicing.positions) {
        const freq = fretToFrequency(pos.string, pos.fret);
        if (freq > 0) frequencies.push(freq);
    }

    // Add open strings that are commonly strummed with each chord
    const frettedStrings = new Set(voicing.positions.map(p => p.string));
    const openStrings = getOpenStrings(chordName, frettedStrings);
    for (const s of openStrings) {
        const freq = OPEN_STRING_FREQUENCIES[s];
        if (freq !== undefined) frequencies.push(freq);
    }

    return frequencies;
}

/**
 * Determine which open strings to include for each chord.
 */
function getOpenStrings(chordName: ChordName, frettedStrings: Set<number>): number[] {
    switch (chordName) {
        case 'Am': return [1, 5].filter(s => !frettedStrings.has(s));    // Open E4 + A2
        case 'Am9': return [1, 5].filter(s => !frettedStrings.has(s));    // Open E4 + A2
        case 'C': return [1, 3].filter(s => !frettedStrings.has(s));    // Open E4 + G3
        case 'D': return [4].filter(s => !frettedStrings.has(s));       // Open D3
        case 'Fmaj7': return [];                                          // positions include fret 0
        case 'G': return [2, 3, 4].filter(s => !frettedStrings.has(s)); // Open B3 + G3 + D3
        default: return [];
    }
}

/**
 * Stop all currently playing chord notes.
 */
export function stopChord(): void {
    const ctx = audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;
    for (const node of activeNodes) {
        try {
            node.gain.gain.cancelScheduledValues(now);
            node.gain.gain.setValueAtTime(node.gain.gain.value, now);
            node.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            node.oscillator.stop(now + 0.06);
        } catch {
            // ignore if already stopped
        }
    }
    activeNodes = [];
}

/**
 * Play a guitar chord by name. Synthesizes all notes in the chord
 * with a plucked-string envelope (quick attack, exponential decay).
 *
 * @param chordName - The chord to play (Am, Am9, C, D, Fmaj7, G)
 * @param duration - How long the chord rings (seconds), default 1.5s
 */
export function playChord(chordName: ChordName, duration: number = 1.5): void {
    // Stop any previously ringing chord
    stopChord();

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const frequencies = getChordFrequencies(chordName);
    if (frequencies.length === 0) return;

    const now = ctx.currentTime;
    const newNodes: typeof activeNodes = [];

    // Volume per note (spread across notes so it doesn't clip)
    const noteVolume = 0.15 / Math.sqrt(frequencies.length);

    for (let i = 0; i < frequencies.length; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Use triangle wave for a warmer, more guitar-like tone
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequencies[i]!;

        // Slight detuning for richness (± a few cents per note)
        oscillator.detune.value = (i - frequencies.length / 2) * 3;

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Plucked string envelope: quick attack, natural decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(noteVolume, now + 0.01); // 10ms attack
        gainNode.gain.exponentialRampToValueAtTime(noteVolume * 0.6, now + 0.1); // initial drop
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // ring out

        // Stagger note starts slightly for a strum effect (5ms between strings)
        const strumDelay = i * 0.005;
        oscillator.start(now + strumDelay);
        oscillator.stop(now + duration + 0.1);

        newNodes.push({ oscillator, gain: gainNode });
    }

    activeNodes = newNodes;
}
