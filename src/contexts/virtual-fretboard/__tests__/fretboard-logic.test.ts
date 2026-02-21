import { describe, it, expect } from 'vitest';
import { evaluatePlacement, togglePosition } from '../domain/fretboard-logic.ts';
import type { FretPosition } from '../../../shared/types/common.ts';

const AM_POSITIONS: FretPosition[] = [
  { string: 2, fret: 1 },
  { string: 3, fret: 2 },
  { string: 4, fret: 2 },
];

describe('evaluatePlacement', () => {
  it('should score 100 for perfect placement', () => {
    const result = evaluatePlacement(AM_POSITIONS, AM_POSITIONS, 'Am');
    expect(result.correct).toHaveLength(3);
    expect(result.incorrect).toHaveLength(0);
    expect(result.missed).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('should identify correct and missed positions for partial placement', () => {
    const userPositions: FretPosition[] = [
      { string: 2, fret: 1 },
      { string: 3, fret: 2 },
    ];
    const result = evaluatePlacement(AM_POSITIONS, userPositions, 'Am');
    expect(result.correct).toHaveLength(2);
    expect(result.incorrect).toHaveLength(0);
    expect(result.missed).toHaveLength(1);
    expect(result.missed[0]).toEqual({ string: 4, fret: 2 });
    expect(result.score).toBeLessThan(100);
  });

  it('should identify incorrect positions', () => {
    const userPositions: FretPosition[] = [
      { string: 1, fret: 3 },
    ];
    const result = evaluatePlacement(AM_POSITIONS, userPositions, 'Am');
    expect(result.correct).toHaveLength(0);
    expect(result.incorrect).toHaveLength(1);
    expect(result.missed).toHaveLength(3);
  });

  it('should handle empty user positions', () => {
    const result = evaluatePlacement(AM_POSITIONS, [], 'Am');
    expect(result.correct).toHaveLength(0);
    expect(result.missed).toHaveLength(3);
    expect(result.score).toBe(0);
  });

  it('should reduce score when incorrect positions are present alongside correct ones', () => {
    const userPositions: FretPosition[] = [
      ...AM_POSITIONS,
      { string: 1, fret: 5 },
    ];
    const result = evaluatePlacement(AM_POSITIONS, userPositions, 'Am');
    expect(result.correct).toHaveLength(3);
    expect(result.incorrect).toHaveLength(1);
    expect(result.score).toBeLessThan(100);
  });
});

describe('togglePosition', () => {
  it('should add a position when it does not exist', () => {
    const result = togglePosition([], { string: 2, fret: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ string: 2, fret: 1 });
  });

  it('should remove a position when it already exists', () => {
    const current: FretPosition[] = [{ string: 2, fret: 1 }];
    const result = togglePosition(current, { string: 2, fret: 1 });
    expect(result).toHaveLength(0);
  });

  it('should not modify other positions when toggling', () => {
    const current: FretPosition[] = [
      { string: 2, fret: 1 },
      { string: 3, fret: 2 },
    ];
    const result = togglePosition(current, { string: 2, fret: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ string: 3, fret: 2 });
  });
});
