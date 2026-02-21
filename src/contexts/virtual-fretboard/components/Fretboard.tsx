import type { FretPosition } from '../../../shared/types/common.ts';
import { DEFAULT_FRET_COUNT } from '../domain/types.ts';

interface FretboardProps {
  fretCount?: number;
  userPositions: readonly FretPosition[];
  showAnswer: boolean;
  onFretClick: (position: FretPosition) => void;
  lastResult?: {
    correct: readonly FretPosition[];
    incorrect: readonly FretPosition[];
    missed: readonly FretPosition[];
  } | null;
}

const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'] as const;

export function Fretboard({
  fretCount = DEFAULT_FRET_COUNT,
  userPositions,
  showAnswer,
  onFretClick,
  lastResult,
}: FretboardProps) {
  const strings = [1, 2, 3, 4, 5, 6] as const;
  const frets = Array.from({ length: fretCount + 1 }, (_, i) => i);

  function getFretClass(s: number, f: number): string {
    const isUserPlaced = userPositions.some(p => p.string === s && p.fret === f);
    if (!showAnswer || !lastResult) {
      return isUserPlaced ? 'fretboard__dot--placed' : '';
    }
    const isCorrect = lastResult.correct.some(p => p.string === s && p.fret === f);
    const isIncorrect = lastResult.incorrect.some(p => p.string === s && p.fret === f);
    const isMissed = lastResult.missed.some(p => p.string === s && p.fret === f);

    if (isCorrect) return 'fretboard__dot--correct';
    if (isIncorrect) return 'fretboard__dot--incorrect';
    if (isMissed) return 'fretboard__dot--missed';
    return '';
  }

  return (
    <div className="fretboard" role="grid" aria-label="Guitar fretboard">
      <div className="fretboard__string-names">
        {strings.map((s, i) => (
          <div key={s} className="fretboard__string-label" aria-hidden="true">
            {STRING_NAMES[i]}
          </div>
        ))}
      </div>
      <div className="fretboard__grid">
        {strings.map(s => (
          <div key={s} className="fretboard__string" role="row">
            {frets.map(f => (
              <button
                key={f}
                className={`fretboard__fret ${getFretClass(s, f)}`}
                onClick={() => onFretClick({ string: s, fret: f })}
                role="gridcell"
                aria-label={`String ${s}, fret ${f}`}
                aria-pressed={userPositions.some(p => p.string === s && p.fret === f)}
              >
                {(userPositions.some(p => p.string === s && p.fret === f) ||
                  (showAnswer && lastResult?.missed.some(p => p.string === s && p.fret === f))) && (
                  <span className="fretboard__dot" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
