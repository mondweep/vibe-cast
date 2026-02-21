import type { Flashcard } from './types.ts';

export const TECHNIQUE_CARDS: Flashcard[] = [
  {
    id: 'slide-a-string',
    category: 'slide',
    question: 'Describe the slide technique taught in the RSD lesson.',
    answer: 'Open A string → Slide on A string from 2nd fret up to 8th fret → End on 7th fret.',
    diagram: {
      type: 'fretboard_range',
      startFret: 0,
      endFret: 8,
      string: 5,
    },
  },
  {
    id: 'finger-substitution',
    category: 'finger_substitution',
    question: 'Which finger substitution makes the Am transition easier?',
    answer: 'Use the 2nd finger instead of the 1st finger for certain transitions, freeing the 1st finger to move to the Am chord shape more quickly.',
  },
  {
    id: 'fingerstyle-arpeggio',
    category: 'arpeggio',
    question: 'What is the fingerstyle arpeggio pattern?',
    answer: 'Bass note (Thumb) followed by higher strings: 1st, 2nd, and 3rd strings in sequence.',
  },
  {
    id: 'fmaj7-silence',
    category: 'general',
    question: 'What is the Fmaj7 silence rule?',
    answer: 'In Bar 3 (Fmaj7), do NOT play on the 3rd beat. Stop the sound or lift fingers to create silence. This is a rhythmic discipline exercise.',
  },
  {
    id: 'bar1-structure',
    category: 'general',
    question: 'What is the chord structure of Bar 1?',
    answer: 'Am for beats 1-2, then Am9 from beat 3. The change happens exactly on the "3" count.',
  },
  {
    id: 'counting-method',
    category: 'general',
    question: 'What counting method does the RSD lesson use?',
    answer: 'Eighth-note subdivisions: "1 and 2 and 3 and 4 and" — 4 beats = 1 bar (4/4 time).',
  },
];
