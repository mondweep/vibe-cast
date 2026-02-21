import type { ChordVoicing, Progression } from './types.ts';

export const CHORD_LIBRARY: Record<string, ChordVoicing> = {
  Am: {
    name: 'Am',
    positions: [
      { string: 2, fret: 1 },
      { string: 3, fret: 2 },
      { string: 4, fret: 2 },
    ],
    fingering: [null, 1, 2, 3, null, null],
  },
  Am9: {
    name: 'Am9',
    positions: [
      { string: 2, fret: 0 },
      { string: 3, fret: 2 },
      { string: 4, fret: 2 },
    ],
    fingering: [null, null, 2, 3, null, null],
  },
  C: {
    name: 'C',
    positions: [
      { string: 2, fret: 1 },
      { string: 4, fret: 2 },
      { string: 5, fret: 3 },
    ],
    fingering: [null, 1, null, 2, 3, null],
  },
  D: {
    name: 'D',
    positions: [
      { string: 1, fret: 2 },
      { string: 2, fret: 3 },
      { string: 3, fret: 2 },
    ],
    fingering: [2, 3, 1, null, null, null],
  },
  Fmaj7: {
    name: 'Fmaj7',
    positions: [
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
      { string: 3, fret: 2 },
      { string: 4, fret: 3 },
    ],
    fingering: [null, 1, 2, 3, null, null],
  },
  G: {
    name: 'G',
    positions: [
      { string: 1, fret: 3 },
      { string: 5, fret: 2 },
      { string: 6, fret: 3 },
    ],
    fingering: [3, null, null, null, 1, 2],
  },
};

export const RSD_LESSON_PROGRESSION: Progression = {
  name: 'RSD Guitar Lesson',
  bars: [
    {
      barNumber: 1,
      segments: [
        { chord: 'Am', startBeat: 1, endBeat: 2 },
        { chord: 'Am9', startBeat: 3, endBeat: 4 },
      ],
    },
    {
      barNumber: 2,
      segments: [
        { chord: 'C', startBeat: 1, endBeat: 2 },
        { chord: 'D', startBeat: 3, endBeat: 4 },
      ],
    },
    {
      barNumber: 3,
      segments: [
        { chord: 'Fmaj7', startBeat: 1, endBeat: 4, silence: { onBeat: 3 } },
      ],
    },
    {
      barNumber: 4,
      segments: [
        { chord: 'G', startBeat: 1, endBeat: 2 },
        { chord: 'Am', startBeat: 3, endBeat: 4 },
      ],
      label: 'Transition',
    },
  ],
};
