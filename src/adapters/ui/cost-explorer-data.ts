/**
 * Cost Explorer — the arithmetic behind the charts, kept out of the charts.
 *
 * ---------------------------------------------------------------------------
 * Why these are pure functions and not inline `.map()` calls
 * ---------------------------------------------------------------------------
 *
 * A chart is the easiest place in this codebase to tell a lie, because the lie
 * is in a shape rather than in a sentence. Three specific ones are available
 * here and each is prevented by a function below that can be tested without
 * rendering anything:
 *
 *   1. **Stacking the tiers.** A bar chart that puts household assets on top of
 *      public infrastructure produces a total the model refuses to compute.
 *      `askSeries` returns three independent rows and there is no total row to
 *      render by accident.
 *   2. **Dropping the interval.** A bar drawn at the central value looks like a
 *      measurement. Every series here carries `low`/`high` alongside `central`,
 *      and the band is what the chart draws by default.
 *   3. **Ranking by the wrong measure.** `tornadoSeries` sorts by rupee swing.
 *      Sorting by range width is offered, because the disagreement between the
 *      two is the point — but it is a named choice the reader makes, not a
 *      default that quietly mis-directs them.
 *
 * Normalisation is the one genuinely new operation this view adds. Dividing a
 * tier by a household count is how appeals are actually framed, and it is
 * honest for the household tier and a *share-of-burden* framing for the public
 * one — so `normaliserNote` exists to say which is which, and the view renders
 * it rather than leaving the reader to assume.
 *
 * Pure. No React, no recharts, no clock.
 */

import type {
  PeriodAssumptionViewModel,
  PeriodBenchmarkViewModel,
  PeriodReplacementViewModel,
  PeriodTierViewModel,
} from './view-models';

/** How a reader wants the money expressed. */
export type NormaliserKey = 'total' | 'per-dwelling' | 'per-household';

export type Normaliser = {
  readonly key: NormaliserKey;
  readonly label: string;
  /** Suffix for an axis, e.g. "per affected household". */
  readonly axisSuffix: string;
};

export const NORMALISERS: readonly Normaliser[] = [
  { key: 'total', label: 'Total', axisSuffix: '' },
  { key: 'per-dwelling', label: 'Per dwelling destroyed', axisSuffix: 'per dwelling destroyed' },
  { key: 'per-household', label: 'Per affected household', axisSuffix: 'per affected household' },
];

/** How the sensitivity chart is ordered. Both are offered; they disagree. */
export type RankKey = 'swing' | 'spread';

export type RankMode = {
  readonly key: RankKey;
  readonly label: string;
  readonly explanation: string;
};

export const RANK_MODES: readonly RankMode[] = [
  {
    key: 'swing',
    label: 'Rupees it moves',
    explanation:
      'How far the answer travels when this one assumption goes from its low bound to its ' +
      'high, with every other assumption held still. This is the order to spend attention in.',
  },
  {
    key: 'spread',
    label: 'How wide its range is',
    explanation:
      'High ÷ low of the assumption’s own range — how unsure we are about it, ignoring ' +
      'the size of the line it sits on. Ranking this way is the obvious choice and it is ' +
      'misleading: a wide range on a small line moves less money than a narrow range on a ' +
      'large one. Shown so the disagreement is visible, not because it is the better order.',
  },
];

/** A band on a chart: the interval, never a bare point. */
export type Band = {
  readonly label: string;
  readonly low: number;
  readonly central: number;
  readonly high: number;
  /** Drawn as a floating bar from `low`; recharts needs the offset explicitly. */
  readonly bandBase: number;
  readonly bandSpan: number;
  /** Free-text qualifier rendered beside the bar. Never colour alone (NFR-8). */
  readonly note: string;
};

const band = (label: string, low: number, central: number, high: number, note: string): Band => ({
  label,
  low,
  central,
  high,
  bandBase: low,
  bandSpan: Math.max(0, high - low),
  note,
});

/** Divide by the caseload the reader picked, or leave alone. */
export const divisorFor = (
  key: NormaliserKey,
  counts: { readonly dwellingsDestroyed?: number; readonly householdsAffected?: number },
): number | undefined => {
  if (key === 'total') return 1;
  const raw = key === 'per-dwelling' ? counts.dwellingsDestroyed : counts.householdsAffected;
  return raw === undefined || raw <= 0 ? undefined : raw;
};

/**
 * What normalising this tier actually means, in words.
 *
 * Dividing the household tier by households is a real per-household cost.
 * Dividing PUBLIC infrastructure by households is a share-of-burden framing —
 * legitimate, and a different claim. Saying so is cheaper than being misread.
 */
export const normaliserNote = (key: NormaliserKey): string => {
  if (key === 'total') return '';
  const unit = key === 'per-dwelling' ? 'destroyed dwelling' : 'affected household';
  return (
    `Every figure is divided by the caseload to give a cost per ${unit}. For household ` +
    `assets and dwellings this is a real per-${unit} cost. For public infrastructure it is a ` +
    'share-of-burden framing — no household receives that money, and the division is a way of ' +
    'expressing scale, not an entitlement.'
  );
};

/**
 * The three headline asks.
 *
 * Deliberately three rows and no fourth. Dwellings sit INSIDE the household
 * tier rather than beside it, so a total would double-count as well as making a
 * road and a family home interchangeable.
 */
export const askSeries = (
  replacement: PeriodReplacementViewModel,
  normaliser: NormaliserKey = 'total',
): readonly Band[] => {
  const x = replacement.executive;
  const divisor = divisorFor(normaliser, x);
  if (divisor === undefined) return [];
  const at = (value: number | undefined) => (value ?? 0) / divisor;

  return [
    band(
      'Rebuilding destroyed dwellings',
      at(x.dwellingsLow),
      at(x.dwellingsCentral),
      at(x.dwellingsHigh),
      'Build back better — Pukka, on a raised plinth',
    ),
    band(
      'Household assets: silt and land',
      at(x.microLow),
      at(x.microCentral),
      at(x.microHigh),
      'Must be cleared before rebuilding can start',
    ),
    band(
      'Public infrastructure',
      at(x.macroLow),
      at(x.macroCentral),
      at(x.macroHigh),
      'Restoration, not reconstruction',
    ),
  ];
};

/** One tier's lines, for the breakdown chart. Tiers are charted separately. */
export const tierSeries = (
  tier: PeriodTierViewModel,
  replacement: PeriodReplacementViewModel,
  normaliser: NormaliserKey = 'total',
): readonly Band[] => {
  const divisor = divisorFor(normaliser, replacement.executive);
  if (divisor === undefined) return [];
  return tier.lines.map((line) =>
    band(line.label, line.low / divisor, line.central / divisor, line.high / divisor, line.formula),
  );
};

/**
 * The three reconstruction policies.
 *
 * `note` carries the risk effect, never the cost alone. A policy chart showing
 * only money makes the cheapest look like the best, when the cheapest is the
 * one that rebuilds the vulnerability that caused the loss.
 */
export const policySeries = (
  replacement: PeriodReplacementViewModel,
  normaliser: NormaliserKey = 'total',
): readonly Band[] => {
  const divisor = divisorFor(normaliser, replacement.executive);
  if (divisor === undefined) return [];
  return replacement.policies
    .filter((policy) => policy.totalCentral !== undefined)
    .map((policy) =>
      band(
        policy.label,
        (policy.totalLow ?? 0) / divisor,
        (policy.totalCentral ?? 0) / divisor,
        (policy.totalHigh ?? 0) / divisor,
        policy.uncostedDwellings === undefined || policy.uncostedDwellings === 0
          ? policy.riskEffect
          : `${policy.riskEffect} — ${policy.uncostedDwellings.toLocaleString('en-IN')} dwellings uncosted`,
      ),
    );
};

export type TornadoBar = {
  readonly label: string;
  /**
   * The label as it appears on the chart axis, disambiguated where needed.
   *
   * Four assumptions are called "GST uplift" and four "Share of the SDRF
   * ceiling actually needed" — the same judgement made separately for separate
   * figures. In the table that is fine, because an `affects` column sits beside
   * them. On a chart axis it is four identical bars of different lengths and no
   * way to tell which is which, so the figure is appended when, and only when,
   * the label repeats within the rows actually being drawn.
   */
  readonly chartLabel: string;
  readonly affects: string;
  readonly swing: number;
  readonly spread: number;
  readonly value: number;
  readonly unit: string;
  readonly low: number;
  readonly high: number;
  readonly reason: string;
};

/** Every distinct figure an assumption feeds, for the filter control. */
export const affectedFigures = (
  register: readonly PeriodAssumptionViewModel[],
): readonly string[] => [...new Set(register.map((a) => a.affects))].sort();

/**
 * The sensitivity chart, ranked the way the reader asked for.
 *
 * `spread` can be infinite when an assumption's low bound is zero, which sorts
 * fine but must not reach a chart axis — the caller charts `swing` in both
 * modes and only the ORDER changes. That keeps the two rankings comparable:
 * the bars stay the same length and visibly rearrange.
 */
export const tornadoSeries = (
  register: readonly PeriodAssumptionViewModel[],
  options: { readonly rankBy?: RankKey; readonly affects?: string; readonly limit?: number } = {},
): readonly TornadoBar[] => {
  const { rankBy = 'swing', affects, limit } = options;
  const selected = register
    .filter((a) => affects === undefined || a.affects === affects)
    .sort((p, q) => (rankBy === 'swing' ? q.swing - p.swing : q.spread - p.spread));
  const drawn = limit === undefined ? selected : selected.slice(0, limit);

  // Counted across the rows being DRAWN, so filtering to one figure — which
  // removes the collisions — does not leave every bar carrying a redundant tail.
  const occurrences = new Map<string, number>();
  for (const a of drawn) occurrences.set(a.label, (occurrences.get(a.label) ?? 0) + 1);

  return drawn.map((a) => ({
    label: a.label,
    chartLabel: (occurrences.get(a.label) ?? 0) > 1 ? `${a.label} — ${a.affects}` : a.label,
    affects: a.affects,
    swing: a.swing,
    spread: a.spread,
    value: a.value,
    unit: a.unit,
    low: a.low,
    high: a.high,
    reason: a.reason,
  }));
};

/**
 * Share of the modelled uncertainty carried by the top `n` assumptions.
 *
 * The number that answers "how much of this rests on how few judgements?" —
 * which is the question a reader of a wide interval actually has.
 */
export const swingConcentration = (
  register: readonly PeriodAssumptionViewModel[],
  topN: number,
): { readonly topShare: number; readonly total: number } => {
  const swings = register.map((a) => a.swing).sort((p, q) => q - p);
  const total = swings.reduce((sum, s) => sum + s, 0);
  if (total === 0) return { topShare: 0, total: 0 };
  const top = swings.slice(0, topN).reduce((sum, s) => sum + s, 0);
  return { topShare: (top / total) * 100, total };
};

export type BenchmarkBar = {
  readonly label: string;
  readonly value: number;
  readonly households: number | undefined;
  readonly kind: 'demand' | 'reconstruction';
  readonly note: string;
};

/**
 * The compensation demand beside reconstruction, held at BOTH denominators.
 *
 * The two totals differ by roughly the denominator, not the rate, and a chart
 * of two bars with no household counts is the single most misleading thing this
 * page could draw. So the household count rides on every bar and the two
 * denominators are separate rows rather than a single comparison.
 */
export const benchmarkSeries = (benchmark: PeriodBenchmarkViewModel): readonly BenchmarkBar[] => {
  const rows: BenchmarkBar[] = [];
  if (benchmark.demandAcrossAffectedCentral !== undefined) {
    rows.push({
      label: 'Demand, paid to every affected household',
      value: benchmark.demandAcrossAffectedCentral,
      households: benchmark.householdsAffected,
      kind: 'demand',
      note: 'Most of these households did not lose a dwelling',
    });
  }
  if (benchmark.demandAcrossDestroyed !== undefined) {
    rows.push({
      label: 'Demand, paid only where a dwelling was destroyed',
      value: benchmark.demandAcrossDestroyed,
      households: benchmark.dwellingsDestroyed,
      kind: 'demand',
      note: 'The same rate, on the reconstruction denominator',
    });
  }
  if (benchmark.reconstructionCentral !== undefined) {
    rows.push({
      label: 'Rebuilding every destroyed dwelling',
      value: benchmark.reconstructionCentral,
      households: benchmark.dwellingsDestroyed,
      kind: 'reconstruction',
      note: 'Build back better, central estimate',
    });
  }
  return rows;
};
