import React, { useState } from 'react';
import {
  UNKNOWN,
  emptyFactors,
  type JournalEntry,
  type JournalFactors,
  type SleepPosition,
} from '@somnus/domain';
import { toAlcoholUnits } from '@somnus/domain';

/**
 * Nightly context (FR-J1..J4).
 *
 * Every question is skippable, and skipping is recorded as unknown rather
 * than zero (I-J3). That distinction is invisible here and decisive in the
 * correlation engine.
 */
export function JournalScreen({
  date,
  onSave,
  onSkip,
}: {
  date: string;
  onSave: (entry: JournalEntry) => void;
  onSkip: () => void;
}): JSX.Element {
  const [wine, setWine] = useState<number | undefined>(undefined);
  const [beer, setBeer] = useState<number | undefined>(undefined);
  const [congestion, setCongestion] = useState<number | undefined>(undefined);
  const [position, setPosition] = useState<SleepPosition | undefined>(undefined);
  const [caffeine, setCaffeine] = useState<boolean | undefined>(undefined);

  const save = (): void => {
    const factors: JournalFactors = {
      ...emptyFactors(),
      alcoholUnits:
        wine === undefined && beer === undefined
          ? UNKNOWN
          : toAlcoholUnits({ wineGlasses: wine, beerPints: beer }),
      nasalCongestion: congestion ?? UNKNOWN,
      intendedPosition: position ?? UNKNOWN,
      caffeineAfter2pm: caffeine ?? UNKNOWN,
    };
    onSave({ userId: 'local', date, factors, recordedAt: Date.now() });
  };

  const counter = (
    label: string,
    value: number | undefined,
    set: (n: number | undefined) => void,
  ): JSX.Element => (
    <fieldset className="question">
      <legend>{label}</legend>
      <div className="choices">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={value === n ? 'chip selected' : 'chip'} onClick={() => set(n)}>
            {n}
          </button>
        ))}
        <button className={value === undefined ? 'chip selected' : 'chip'} onClick={() => set(undefined)}>
          Not sure
        </button>
      </div>
    </fieldset>
  );

  return (
    <div className="screen">
      <h1>Last night</h1>
      <p className="lead">
        Answer what you remember and skip the rest. A skipped question is
        recorded as &ldquo;unknown&rdquo;, not as zero &mdash; guessing would
        distort the picture more than leaving it blank.
      </p>

      {counter('Glasses of wine', wine, setWine)}
      {counter('Pints of beer', beer, setBeer)}
      {counter('Blocked nose (0 clear, 3 fully blocked)', congestion, setCongestion)}

      <fieldset className="question">
        <legend>How did you mean to sleep?</legend>
        <div className="choices">
          {(['back', 'side', 'front', 'unsure'] as SleepPosition[]).map((p) => (
            <button key={p} className={position === p ? 'chip selected' : 'chip'} onClick={() => setPosition(p)}>
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="question">
        <legend>Caffeine after 2pm?</legend>
        <div className="choices">
          <button className={caffeine === true ? 'chip selected' : 'chip'} onClick={() => setCaffeine(true)}>
            Yes
          </button>
          <button className={caffeine === false ? 'chip selected' : 'chip'} onClick={() => setCaffeine(false)}>
            No
          </button>
        </div>
      </fieldset>

      <button className="primary" onClick={save}>
        Save
      </button>
      <button className="secondary" onClick={onSkip}>
        Skip for now
      </button>
    </div>
  );
}
