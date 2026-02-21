import { useState, useCallback } from 'react';
import { useFretboard, Fretboard } from '../contexts/virtual-fretboard/index.ts';
import { CHORD_LIBRARY } from '../contexts/chord-progression/index.ts';
import type { ChordName } from '../contexts/chord-progression/domain/types.ts';
import { useGamification } from '../contexts/gamification/index.ts';

const CHORD_NAMES: ChordName[] = ['Am', 'Am9', 'C', 'D', 'Fmaj7', 'G'];

export function FretboardPage() {
  const [targetChordName, setTargetChordName] = useState<ChordName>('Am');
  const { userPositions, lastResult, showAnswer, toggle, submit, reset } = useFretboard();
  const { recordDrill } = useGamification();

  const targetChord = CHORD_LIBRARY[targetChordName];

  const handleSubmit = useCallback(() => {
    if (!targetChord) return;
    const result = submit(targetChord.positions, targetChordName);
    if (result.score >= 50) {
      recordDrill('fretboard');
    }
  }, [submit, targetChord, targetChordName, recordDrill]);

  const handleNext = useCallback(() => {
    reset();
    const currentIdx = CHORD_NAMES.indexOf(targetChordName);
    setTargetChordName(CHORD_NAMES[(currentIdx + 1) % CHORD_NAMES.length]!);
  }, [reset, targetChordName]);

  return (
    <div className="page fretboard-page">
      <h2>Fretboard Drill</h2>
      <p className="page__subtitle">
        Place the fingers for: <strong>{targetChordName}</strong>
      </p>

      <Fretboard
        userPositions={userPositions}
        showAnswer={showAnswer}
        onFretClick={toggle}
        lastResult={lastResult}
        fretCount={5}
      />

      {lastResult && (
        <div className="drill-result" role="alert">
          <p>Score: {lastResult.score}%</p>
          <p>Correct: {lastResult.correct.length} / Incorrect: {lastResult.incorrect.length} / Missed: {lastResult.missed.length}</p>
        </div>
      )}

      <div className="fretboard-page__actions">
        {!showAnswer ? (
          <button className="btn btn--primary" onClick={handleSubmit}>
            Check Answer
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleNext}>
            Next Chord
          </button>
        )}
        <button className="btn btn--secondary" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="fretboard-page__chord-select" role="radiogroup" aria-label="Select target chord">
        {CHORD_NAMES.map(name => (
          <button
            key={name}
            className={`btn btn--small ${name === targetChordName ? 'btn--active' : ''}`}
            onClick={() => { reset(); setTargetChordName(name); }}
            aria-pressed={name === targetChordName}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
