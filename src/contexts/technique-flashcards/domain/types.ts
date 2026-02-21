import type { StringNumber } from '../../../shared/types/common.ts';

export interface Flashcard {
  id: string;
  category: 'slide' | 'finger_substitution' | 'arpeggio' | 'general';
  question: string;
  answer: string;
  diagram?: {
    type: 'fretboard_range';
    startFret: number;
    endFret: number;
    string: StringNumber;
  };
}

export interface ReviewSchedule {
  cardId: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export type Confidence = 'again' | 'hard' | 'good' | 'easy';
