import type { FretPosition } from '../../../shared/types/common.ts';
import type { ChordName } from '../../chord-progression/domain/types.ts';
import type { DrillResult } from './types.ts';

function positionsMatch(a: FretPosition, b: FretPosition): boolean {
  return a.string === b.string && a.fret === b.fret;
}

export function evaluatePlacement(
  targetPositions: readonly FretPosition[],
  userPositions: readonly FretPosition[],
  targetChord: ChordName
): DrillResult {
  const correct: FretPosition[] = [];
  const incorrect: FretPosition[] = [];
  const missed: FretPosition[] = [];

  for (const userPos of userPositions) {
    if (targetPositions.some(t => positionsMatch(t, userPos))) {
      correct.push(userPos);
    } else {
      incorrect.push(userPos);
    }
  }

  for (const targetPos of targetPositions) {
    if (!userPositions.some(u => positionsMatch(u, targetPos))) {
      missed.push(targetPos);
    }
  }

  const totalPositions = targetPositions.length;
  const score = totalPositions > 0
    ? Math.round((correct.length / totalPositions) * 100 * (incorrect.length === 0 ? 1 : 0.5))
    : 0;

  return {
    targetChord,
    correct,
    incorrect,
    missed,
    score: Math.max(0, Math.min(100, score)),
    timestamp: Date.now(),
  };
}

export function togglePosition(
  currentPositions: readonly FretPosition[],
  position: FretPosition
): FretPosition[] {
  const exists = currentPositions.some(p => positionsMatch(p, position));
  if (exists) {
    return currentPositions.filter(p => !positionsMatch(p, position));
  }
  return [...currentPositions, position];
}
