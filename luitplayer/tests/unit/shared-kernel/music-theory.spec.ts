import { describe, it, expect } from 'vitest';
import {
  pitchToMidi,
  midiToPitch,
  midiToFrequency,
  frequencyToMidi,
  durationToBeats,
  type Pitch,
} from '@domains/shared-kernel/types';

describe('Music Theory Value Objects', () => {
  describe('pitchToMidi', () => {
    it('should convert middle C (C4) to MIDI 60', () => {
      const pitch: Pitch = { noteName: 'C', octave: 4 };
      expect(pitchToMidi(pitch)).toBe(60);
    });

    it('should convert A4 to MIDI 69', () => {
      const pitch: Pitch = { noteName: 'A', octave: 4 };
      expect(pitchToMidi(pitch)).toBe(69);
    });

    it('should handle sharps correctly', () => {
      const pitch: Pitch = { noteName: 'F', octave: 4, accidental: 'sharp' };
      expect(pitchToMidi(pitch)).toBe(66); // F#4
    });

    it('should handle flats correctly', () => {
      const pitch: Pitch = { noteName: 'B', octave: 3, accidental: 'flat' };
      expect(pitchToMidi(pitch)).toBe(58); // Bb3
    });

    it('should handle double sharps', () => {
      const pitch: Pitch = { noteName: 'C', octave: 4, accidental: 'double-sharp' };
      expect(pitchToMidi(pitch)).toBe(62); // C##4 = D4
    });

    it('should handle low octaves', () => {
      const pitch: Pitch = { noteName: 'C', octave: 0 };
      expect(pitchToMidi(pitch)).toBe(12);
    });
  });

  describe('midiToPitch', () => {
    it('should convert MIDI 60 to C4', () => {
      const pitch = midiToPitch(60);
      expect(pitch.noteName).toBe('C');
      expect(pitch.octave).toBe(4);
    });

    it('should convert MIDI 69 to A4', () => {
      const pitch = midiToPitch(69);
      expect(pitch.noteName).toBe('A');
      expect(pitch.octave).toBe(4);
    });

    it('should handle black keys with sharps', () => {
      const pitch = midiToPitch(61); // C#4
      expect(pitch.noteName).toBe('C');
      expect(pitch.accidental).toBe('sharp');
    });
  });

  describe('midiToFrequency', () => {
    it('should convert A4 (69) to 440Hz', () => {
      expect(midiToFrequency(69)).toBe(440);
    });

    it('should convert A5 (81) to 880Hz', () => {
      expect(midiToFrequency(81)).toBe(880);
    });

    it('should convert A3 (57) to 220Hz', () => {
      expect(midiToFrequency(57)).toBe(220);
    });

    it('should convert C4 (60) to approximately 261.63Hz', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });
  });

  describe('frequencyToMidi', () => {
    it('should convert 440Hz to MIDI 69', () => {
      expect(frequencyToMidi(440)).toBe(69);
    });

    it('should convert 880Hz to MIDI 81', () => {
      expect(frequencyToMidi(880)).toBe(81);
    });

    it('should round to nearest MIDI note', () => {
      expect(frequencyToMidi(445)).toBe(69); // Close to A4
    });
  });

  describe('durationToBeats', () => {
    it('should convert quarter note to 1 beat', () => {
      expect(durationToBeats('quarter')).toBe(1);
    });

    it('should convert half note to 2 beats', () => {
      expect(durationToBeats('half')).toBe(2);
    });

    it('should convert whole note to 4 beats', () => {
      expect(durationToBeats('whole')).toBe(4);
    });

    it('should convert eighth note to 0.5 beats', () => {
      expect(durationToBeats('eighth')).toBe(0.5);
    });

    it('should handle dotted quarter (1.5 beats)', () => {
      expect(durationToBeats('quarter', true)).toBe(1.5);
    });

    it('should handle dotted half (3 beats)', () => {
      expect(durationToBeats('half', true)).toBe(3);
    });
  });
});
