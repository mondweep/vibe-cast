import {
  bandForScore,
  scoreStopBang,
  isComplete,
  type StopBangAnswers,
} from '../src/safeguarding/stop-bang';
import {
  evaluateRedFlags,
  hasSustainedLoudSnoring,
  LOUD_NIGHTS_REQUIRED,
} from '../src/safeguarding/red-flags';
import { nightStub } from './helpers';

const allFalse: StopBangAnswers = {
  snoringLoudly: false,
  tiredDuringDay: false,
  observedApnoea: false,
  highBloodPressure: false,
  bmiOver35: false,
  ageOver50: false,
  neckOver40cm: false,
  maleSex: false,
};

const withScore = (n: number): StopBangAnswers => {
  const keys = Object.keys(allFalse) as (keyof StopBangAnswers)[];
  const out = { ...allFalse };
  for (let i = 0; i < n; i += 1) out[keys[i]] = true;
  return out;
};

describe('STOP-BANG', () => {
  it('yields no band at all for a partial screen, not a low one (I-S1)', () => {
    const partial = { snoringLoudly: true, tiredDuringDay: false };
    expect(isComplete(partial)).toBe(false);
    expect(scoreStopBang(partial)).toBeNull();
  });

  it('scores a complete screen', () => {
    expect(scoreStopBang(withScore(4))?.score).toBe(4);
  });

  describe('published band thresholds at their exact boundaries (I-S2)', () => {
    it.each([
      [0, 'low'], [2, 'low'],
      [3, 'intermediate'], [4, 'intermediate'],
      [5, 'high'], [8, 'high'],
    ])('a score of %d is %s risk', (score, band) => {
      expect(bandForScore(score as number)).toBe(band);
    });
  });
});

describe('Red Flag rules', () => {
  const noNights = { recentNights: [] };

  it('RF-1 fires on a high-risk STOP-BANG band', () => {
    const flags = evaluateRedFlags({ answers: withScore(5), ...noNights });
    expect(flags.map((f) => f.code)).toContain('RF-1-high-risk-score');
  });

  it('RF-1 does not fire at an intermediate band', () => {
    const flags = evaluateRedFlags({ answers: withScore(4), ...noNights });
    expect(flags.map((f) => f.code)).not.toContain('RF-1-high-risk-score');
  });

  // The two rules that must not be averaged away by a low total.
  it('RF-2 fires on witnessed breathing pauses even at a STOP-BANG score of 0', () => {
    const answers = { ...allFalse, observedApnoea: true };
    const scored = scoreStopBang(answers);
    expect(scored?.score).toBe(1);
    expect(scored?.band).toBe('low');

    const flags = evaluateRedFlags({ answers, ...noNights });
    expect(flags.map((f) => f.code)).toContain('RF-2-witnessed-pauses');
  });

  it('RF-4 fires on sleepiness while driving at a STOP-BANG score of 0', () => {
    const flags = evaluateRedFlags({
      answers: allFalse,
      sleepinessWhileDriving: true,
      ...noNights,
    });
    expect(scoreStopBang(allFalse)?.score).toBe(0);
    expect(flags.map((f) => f.code)).toContain('RF-4-sleepiness-driving');
    expect(flags[0].code).toBe('RF-4-sleepiness-driving');
    expect(flags[0].urgency).toBe('prompt');
  });

  it('RF-4 fires even with no STOP-BANG screen completed at all', () => {
    const flags = evaluateRedFlags({
      answers: {},
      sleepinessWhileDriving: true,
      ...noNights,
    });
    expect(flags.map((f) => f.code)).toContain('RF-4-sleepiness-driving');
  });

  describe('RF-3 sustained loud snoring', () => {
    const loudNight = (i: number) =>
      nightStub({
        nightId: `n${i}`,
        episodeCount: 100,
        bandDistribution: { quiet: 0, mild: 0, moderate: 69, loud: 31 },
      });
    const quietNight = (i: number) =>
      nightStub({
        nightId: `n${i}`,
        episodeCount: 100,
        bandDistribution: { quiet: 0, mild: 0, moderate: 71, loud: 29 },
      });

    it('fires at 31 % loud episodes across 7 of 14 nights', () => {
      const nights = [
        ...Array.from({ length: 7 }, (_, i) => loudNight(i)),
        ...Array.from({ length: 7 }, (_, i) => quietNight(i + 7)),
      ];
      expect(hasSustainedLoudSnoring(nights)).toBe(true);
    });

    it('does not fire at 29 % loud episodes, just below the share threshold', () => {
      const nights = Array.from({ length: 14 }, (_, i) => quietNight(i));
      expect(hasSustainedLoudSnoring(nights)).toBe(false);
    });

    it('does not fire on 6 loud nights, one short of the required count', () => {
      const nights = [
        ...Array.from({ length: LOUD_NIGHTS_REQUIRED - 1 }, (_, i) => loudNight(i)),
        ...Array.from({ length: 8 }, (_, i) => quietNight(i + 6)),
      ];
      expect(hasSustainedLoudSnoring(nights)).toBe(false);
    });

    it('ignores nights whose analysis was insufficient', () => {
      const nights = Array.from({ length: 14 }, (_, i) =>
        nightStub({
          nightId: `n${i}`,
          status: 'insufficient',
          snoreIndex: null,
          episodeCount: 100,
          bandDistribution: { quiet: 0, mild: 0, moderate: 0, loud: 100 },
        }),
      );
      expect(hasSustainedLoudSnoring(nights)).toBe(false);
    });
  });

  it('never asserts or denies a diagnosis in any flag message (I-S4)', () => {
    const flags = evaluateRedFlags({
      answers: { ...withScore(6), observedApnoea: true },
      sleepinessWhileDriving: true,
      recentNights: [],
    });
    expect(flags.length).toBeGreaterThan(0);
    for (const flag of flags) {
      const text = `${flag.title} ${flag.message}`.toLowerCase();

      // No assertion that the user does, or does not, have a condition.
      // "you have reported" and "you may have a legal obligation" are fine;
      // it is the medical claim that is forbidden.
      const CONDITION = '(a |an |the )?(sleep[- ])?(apnoea|apnea|osa|disorder|condition|disease|syndrome)';
      expect(text).not.toMatch(new RegExp(`you (have|do not have|don't have) ${CONDITION}`));
      expect(text).not.toMatch(new RegExp(`(you|this) (is|are) ${CONDITION}`));
      expect(text).not.toMatch(/\b(you are|this is) (fine|healthy|normal)\b/);

      // The word "diagnosis" is permitted only to disclaim one. Strip the
      // disclaiming phrases and nothing diagnostic may remain.
      const asserted = text.replace(/not a diagnos(is|tic)\w*/g, '');
      expect(asserted).not.toMatch(/diagnos/);
    }
  });
});
