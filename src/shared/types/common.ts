/** Guitar string number: 1 = high E, 6 = low E */
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Fret number: 0 = open, -1 = muted */
export type FretNumber = number;

export interface FretPosition {
  string: StringNumber;
  fret: FretNumber;
}
