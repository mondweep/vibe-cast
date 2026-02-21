import { useState, useCallback } from 'react';
import type { FretPosition } from '../../../shared/types/common.ts';
import type { ChordName } from '../../chord-progression/domain/types.ts';
import type { DrillResult } from '../domain/types.ts';
import { evaluatePlacement, togglePosition } from '../domain/fretboard-logic.ts';

export function useFretboard() {
  const [userPositions, setUserPositions] = useState<FretPosition[]>([]);
  const [lastResult, setLastResult] = useState<DrillResult | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const toggle = useCallback((position: FretPosition) => {
    setUserPositions(prev => togglePosition(prev, position));
    setShowAnswer(false);
    setLastResult(null);
  }, []);

  const submit = useCallback((targetPositions: readonly FretPosition[], targetChord: ChordName) => {
    const result = evaluatePlacement(targetPositions, userPositions, targetChord);
    setLastResult(result);
    setShowAnswer(true);
    return result;
  }, [userPositions]);

  const reset = useCallback(() => {
    setUserPositions([]);
    setLastResult(null);
    setShowAnswer(false);
  }, []);

  return { userPositions, lastResult, showAnswer, toggle, submit, reset };
}
