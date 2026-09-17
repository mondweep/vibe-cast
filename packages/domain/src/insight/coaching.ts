import type { RedFlag } from '../safeguarding/red-flags';
import type { Association, AssociationReport } from './correlation';
import type { FactorName } from '../journal/anti-corruption';

export interface Recommendation {
  readonly factor: FactorName;
  readonly headline: string;
  readonly rationale: string;
  readonly basedOnNights: number;
}

export type CoachingOutput =
  | {
      readonly kind: 'suppressed';
      /**
       * FR-I6 / ADR-010: the product may not answer "you may need a doctor"
       * with "try a nasal strip". While a Red Flag is unacknowledged, the
       * escalation is the only message.
       */
      readonly flags: readonly RedFlag[];
      readonly message: string;
    }
  | { readonly kind: 'insufficient_data'; readonly nightsNeeded: number }
  | { readonly kind: 'recommendation'; readonly recommendation: Recommendation }
  | { readonly kind: 'no_clear_factor' };

const COPY: Partial<Record<FactorName, { headline: string; how: string }>> = {
  alcoholUnits: {
    headline: 'Alcohol looks like your biggest lever',
    how: 'Try nights with no alcohol, or none within four hours of bed.',
  },
  lastDrinkMinutesBeforeBed: {
    headline: 'How late you drink looks more important than how much',
    how: 'Try finishing any drink at least four hours before bed.',
  },
  nasalCongestion: {
    headline: 'Nasal congestion tracks with your snoring',
    how: 'Try a saline rinse before bed, and mention recurring congestion to a pharmacist.',
  },
  intendedPosition: {
    headline: 'Sleeping on your back tracks with more snoring',
    how: 'Try side-sleeping — a body pillow behind your back helps hold the position.',
  },
  bedtimeMinutes: {
    headline: 'Later bedtimes track with more snoring',
    how: 'Try holding a consistent bedtime for a couple of weeks.',
  },
  lastMealMinutesBeforeBed: {
    headline: 'Eating close to bedtime tracks with more snoring',
    how: 'Try finishing your last meal three hours before bed.',
  },
  caffeineAfter2pm: {
    headline: 'Afternoon caffeine tracks with more snoring',
    how: 'Try moving your last coffee to before 2pm.',
  },
  weightKg: {
    headline: 'Your weight tracks with your snoring',
    how: 'Even a small, sustained change can matter. Worth discussing with a GP.',
  },
};

/** Below this, an association is not worth acting on. */
export const MIN_ACTIONABLE_EFFECT = 0.3;

/**
 * Produce the day's coaching, subject to safeguarding precedence.
 *
 * The Red Flag check is deliberately the first branch and takes no account of
 * how good the coaching would have been. PRD §4.3 makes Insight the
 * *customer* of Clinical Safeguarding, and this is where that shows up in
 * code rather than in prose.
 */
export function coach(
  report: AssociationReport,
  activeFlags: readonly RedFlag[],
): CoachingOutput {
  if (activeFlags.length > 0) {
    return {
      kind: 'suppressed',
      flags: activeFlags,
      message:
        'Your recent results include something worth raising with a doctor. ' +
        'Rather than suggesting changes to try, we would rather you had that ' +
        'conversation first. Your tracking continues in the background.',
    };
  }

  if (!report.sufficient) {
    return { kind: 'insufficient_data', nightsNeeded: 7 - report.nightsConsidered };
  }

  const top: Association | undefined = report.associations.find(
    (a) => a.effectSize >= MIN_ACTIONABLE_EFFECT && a.direction !== 'none',
  );
  if (top === undefined) return { kind: 'no_clear_factor' };

  const copy = COPY[top.factor];
  if (copy === undefined) return { kind: 'no_clear_factor' };

  return {
    kind: 'recommendation',
    recommendation: {
      factor: top.factor,
      headline: copy.headline,
      rationale:
        `${copy.how} Across ${top.n} of your nights, this factor moves with your ` +
        'Snore Index. That is an association in your own data, not proof of cause.',
      basedOnNights: top.n,
    },
  };
}
