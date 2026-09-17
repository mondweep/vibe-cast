import type { NightAnalysis } from '../analysis/night-analysis';
import { isComplete, scoreStopBang, type PartialStopBangAnswers } from './stop-bang';

/**
 * Conditions obliging the product to recommend a clinical conversation
 * (ADR-010, PRD §4.4).
 *
 * These are domain rules with tests, not conditional rendering. A UI refactor
 * cannot regress them.
 */
export type RedFlagCode =
  | 'RF-1-high-risk-score'
  | 'RF-2-witnessed-pauses'
  | 'RF-3-sustained-loud-snoring'
  | 'RF-4-sleepiness-driving';

export interface RedFlag {
  readonly code: RedFlagCode;
  readonly title: string;
  /**
   * Invariant I-S4: signposting only. No string here asserts, or denies, a
   * diagnosis.
   */
  readonly message: string;
  readonly urgency: 'routine' | 'prompt';
}

/** RF-3 thresholds. */
export const LOUD_EPISODE_SHARE_THRESHOLD = 0.3;
export const LOUD_NIGHTS_REQUIRED = 7;
export const LOUD_NIGHTS_WINDOW = 14;

export interface RedFlagInput {
  readonly answers: PartialStopBangAnswers;
  /** Asked separately from STOP-BANG because RF-4 is graver than tiredness. */
  readonly sleepinessWhileDriving?: boolean;
  /** Most recent nights, newest first. */
  readonly recentNights: readonly NightAnalysis[];
}

/**
 * Evaluate every Red Flag rule.
 *
 * Note that RF-2 and RF-4 fire **regardless of the STOP-BANG score, including
 * a score of zero**. Witnessed breathing pauses and falling asleep at the
 * wheel are not findings to be averaged into a total — they are each
 * sufficient on their own.
 */
export function evaluateRedFlags(input: RedFlagInput): RedFlag[] {
  const flags: RedFlag[] = [];

  // RF-4 first: it is the one with immediate physical danger attached.
  if (input.sleepinessWhileDriving === true) {
    flags.push({
      code: 'RF-4-sleepiness-driving',
      title: 'Sleepiness while driving',
      message:
        'You have reported feeling sleepy while driving. Please speak to a doctor ' +
        'before driving again, and tell them about your snoring and your sleep. ' +
        'In the UK you may also have a legal obligation to notify the DVLA about ' +
        'excessive sleepiness.',
      urgency: 'prompt',
    });
  }

  if (input.answers.observedApnoea === true) {
    flags.push({
      code: 'RF-2-witnessed-pauses',
      title: 'Witnessed pauses in breathing',
      message:
        'Someone has observed you stop breathing during sleep. This is worth ' +
        'discussing with a doctor, who can arrange a proper sleep assessment. ' +
        'This app cannot measure breathing and cannot tell you what is causing it.',
      urgency: 'prompt',
    });
  }

  const scored = isComplete(input.answers) ? scoreStopBang(input.answers) : null;
  if (scored !== null && scored.band === 'high') {
    flags.push({
      code: 'RF-1-high-risk-score',
      title: 'STOP-BANG screening suggests further assessment',
      message:
        `Your STOP-BANG screening score is ${scored.score} of 8, which the ` +
        'questionnaire places in its high-risk band. STOP-BANG is a screening ' +
        'tool, not a diagnosis — it is designed to be cautious. It means a ' +
        'conversation with a doctor is worthwhile, nothing more and nothing less.',
      urgency: 'routine',
    });
  }

  if (hasSustainedLoudSnoring(input.recentNights)) {
    flags.push({
      code: 'RF-3-sustained-loud-snoring',
      title: 'Loud snoring on most recent nights',
      message:
        'Most of your recent nights show a high proportion of loud snoring. ' +
        'Persistent loud snoring is worth mentioning to a doctor. This app ' +
        'measures sound only and cannot assess your breathing.',
      urgency: 'routine',
    });
  }

  return flags;
}

/**
 * RF-3: loud episodes make up at least 30 % of a night's episodes, on at
 * least 7 of the last 14 analysed nights.
 */
export function hasSustainedLoudSnoring(nights: readonly NightAnalysis[]): boolean {
  const analysed = nights
    .filter((n) => n.status === 'analysed')
    .slice(0, LOUD_NIGHTS_WINDOW);

  const loudNights = analysed.filter((n) => {
    if (n.episodeCount === 0) return false;
    return n.bandDistribution.loud / n.episodeCount >= LOUD_EPISODE_SHARE_THRESHOLD;
  });

  return loudNights.length >= LOUD_NIGHTS_REQUIRED;
}
