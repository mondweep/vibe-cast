/**
 * Rehabilitation Economics — what to build back, and what that costs.
 *
 * ---------------------------------------------------------------------------
 * Why this is a policy lever and not a modelling detail
 * ---------------------------------------------------------------------------
 *
 * Across the bundled archive, **91.2% of the houses destroyed outright were
 * Kuccha** — 3,187 of 3,494. So the single question "what do we rebuild a
 * destroyed Kuccha house as?" moves the reconstruction bill by more than every
 * other assumption in this codebase put together.
 *
 * That question has no technical answer. It is a choice about whether
 * reconstruction reproduces the exposure that caused the loss, and it belongs to
 * whoever is accountable for the programme. So it is modelled as a **named
 * policy the user selects**, not as a constant buried in a derivation — the same
 * reasoning ADR-0006 applied to severity weights.
 *
 * Three policies, and the middle one is not a compromise but a distinct
 * strategy:
 *
 *   like-for-like     Rebuild each house as it was. Reproduces the vulnerability.
 *   protect-in-place  Rebuild Kuccha as Kuccha, but on a raised Pukka plinth.
 *   build-back-better Rebuild everything to a permanent standard, raised.
 *
 * ---------------------------------------------------------------------------
 * The honest gap, stated rather than filled
 * ---------------------------------------------------------------------------
 *
 * A Kuccha *superstructure* cannot be costed from the Assam PWD civil-works
 * schedule at all — it prices brick, cement and RCC, and a Kuccha house is
 * bamboo, timber and thatch. That is true under every policy, and it has a
 * different consequence under each:
 *
 *   - Under `like-for-like`, 91% of the caseload is uncosted and the total is a
 *     near-meaningless floor. The model says so loudly rather than quietly
 *     reporting the 8.8% it can price.
 *   - Under `protect-in-place`, the *defences* are fully costable even though
 *     the houses they protect are not. That is a genuinely useful answer to
 *     "at least build suitable defences", and it is a real floor rather than an
 *     empty one.
 *   - Under `build-back-better`, nothing is uncosted, because everything is
 *     rebuilt in materials the schedule prices.
 *
 * The last of those is the only policy this data can fully cost. That is a fact
 * about the schedule, not an argument for the policy, and the product must not
 * let the two be confused — a policy is not better because it is easier to
 * price.
 *
 * Pure. No I/O, no clock.
 */

import { derivation, evaluate, type Derivation, type Interval } from './derivation';
import type { Citation } from './money';

const ASSAM_SOR: Citation = {
  publisher: 'Public Works Department (Buildings), Government of Assam',
  document: 'Assam PWD Building Schedule of Rates for Civil Works',
  reference: 'Edition undated — no year appears anywhere in the document text',
  clause: 'see per-item clause on each input',
  source: 'docs/reference/assam-pwd-buildings-schedule-of-rates-civil-works.pdf',
  retrievedOn: '2026-08-06',
};

const sorLine = (label: string, value: number, unit: string, clause: string) =>
  ({ kind: 'published' as const, label, value, unit, citation: { ...ASSAM_SOR, clause } });

/**
 * A raised plinth with apron protection — the flood defence itself.
 *
 * Raising the floor above the flood line is the standard, cheapest and most
 * effective structural mitigation for riverine flooding in Assam, and unlike
 * embankments it protects one household without depending on anyone else's
 * maintenance. It is also entirely priceable from the schedule, which is why
 * this is the one resilience measure modelled here rather than a menu of them.
 *
 * What this does NOT include: any superstructure. It is the platform and its
 * protection, and it is meaningful on its own — a Kuccha house rebuilt on a
 * raised plinth survives a flood that would have destroyed it at grade.
 */
const RAISED_PLINTH: Derivation = derivation({
  formula:
    'floor area × ( raise × fill rate + plinth wall volume × brickwork rate + ' +
    'apron area × apron rate ) × GST',
  inputs: [
    {
      kind: 'assumed',
      label: 'Floor area of the dwelling being protected',
      value: 30,
      unit: 'm²',
      low: 25,
      high: 46.6,
      reason:
        'The same reference dwelling the replacement cost uses, so the two figures describe ' +
        'the same house and can be compared or added for one dwelling. Bounds are the PMAY-G ' +
        'statutory minimum unit size (25 m²) and the NSS 76th round (2018) average rural ' +
        'dwelling floor area (46.6 m²). A test asserts these match the replacement cost — ' +
        'the two drifted apart once and produced a plinth sized for a different house.',
    },
    {
      kind: 'assumed',
      label: 'Plinth raise above natural ground',
      value: 0.9,
      unit: 'm',
      low: 0.6,
      high: 1.5,
      reason:
        'Raised above the local flood line. The correct height is the highest flood level at ' +
        'that site, which the bulletin does not report anywhere, so this is a general figure ' +
        'for Brahmaputra floodplain practice rather than a site-specific one. The upper bound ' +
        'reflects chronically flooded chars and low-lying Revenue Circles.',
    },
    sorLine('Earth/sand filling in plinth, 150 mm layers', 105.25, '₹/m³', 'Ch-1, item 1.3'),
    {
      kind: 'assumed',
      label: 'Plinth wall volume per m² of floor, per metre of raise',
      value: 0.169,
      unit: 'm³/m²/m',
      low: 0.13,
      high: 0.24,
      reason:
        'A 30 m² square-ish plan has about 22 m of perimeter; at 230 mm thickness that is ' +
        '0.169 m³ of retaining plinth wall per m² of floor for each metre of raise. A longer, ' +
        'thinner plan needs more wall for the same floor.',
    },
    sorLine(
      'Brick work in cement mortar 1:5, incl. 20 mm plaster both faces',
      6138.4,
      '₹/m³',
      'Ch-33 composite item, brick work 1:5 with 20 mm plaster 1:4',
    ),
    {
      kind: 'assumed',
      label: 'Plinth protection apron area per m² of floor',
      value: 0.73,
      unit: 'm²/m²',
      low: 0.55,
      high: 1.0,
      reason:
        'A 1 m apron around a 22 m perimeter is about 22 m², or 0.73 m² per m² of floor. ' +
        'Wider aprons are used where scour is expected, which on an eroding bank it is.',
    },
    sorLine('Plinth protection works', 342.8, '₹/m²', 'Ch-19, item 19.1'),
    {
      kind: 'assumed',
      label: 'GST uplift',
      value: 1.18,
      unit: '×',
      low: 1.12,
      high: 1.18,
      reason:
        'The schedule states GST is excluded and must be added separately. 18% is the standard ' +
        'works-contract rate; the lower bound allows concessional treatment on government ' +
        'housing schemes.',
    },
  ],
  combine: ([
    floorArea = 0,
    raise = 0,
    fillRate = 0,
    wallPerM2PerM = 0,
    wallRate = 0,
    apronPerM2 = 0,
    apronRate = 0,
    gst = 0,
  ]) => {
    const fill = raise * fillRate;
    const wall = wallPerM2PerM * raise * wallRate;
    const apron = apronPerM2 * apronRate;
    return floorArea * (fill + wall + apron) * gst;
  },
});

export const raisedPlinthResilience = (): { derivation: Derivation; interval: Interval } => ({
  derivation: RAISED_PLINTH,
  interval: evaluate(RAISED_PLINTH),
});

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type ReconstructionPolicyKey = 'like-for-like' | 'protect-in-place' | 'build-back-better';

export type ReconstructionPolicy = {
  readonly key: ReconstructionPolicyKey;
  readonly label: string;
  /** What it does, in one sentence an officer can act on. */
  readonly summary: string;
  /** What it means for future risk. Never omitted — it is the point. */
  readonly riskEffect: string;
};

export const RECONSTRUCTION_POLICIES: readonly ReconstructionPolicy[] = [
  {
    key: 'like-for-like',
    label: 'Like for like',
    summary:
      'Rebuild each dwelling in the material it was: Pukka as Pukka, Kuccha as Kuccha, at the ' +
      'same level.',
    riskEffect:
      'Reproduces the exposure that caused the loss. The 3,187 Kuccha dwellings destroyed in ' +
      'this period would be rebuilt as Kuccha dwellings at grade, and the next flood of the ' +
      'same size would destroy them again.',
  },
  {
    key: 'protect-in-place',
    label: 'Protect in place',
    summary:
      'Rebuild Kuccha dwellings as Kuccha, but on a raised Pukka plinth with apron protection. ' +
      'Pukka dwellings are rebuilt Pukka, also raised.',
    riskEffect:
      'Removes most of the flood exposure without changing how people build. A Kuccha house ' +
      'on a raised plinth survives a flood that would have destroyed it at grade, and the ' +
      'plinth outlives several rebuilds of the house on top of it.',
  },
  {
    key: 'build-back-better',
    label: 'Build back better',
    summary:
      'Rebuild every destroyed dwelling to a permanent Pukka standard on a raised plinth, ' +
      'regardless of what stood there before.',
    riskEffect:
      'Removes the exposure and the vulnerability together. The most expensive option and the ' +
      'only one that does not leave a known weakness in place.',
  },
];

export type Caseload = {
  /** Dwellings destroyed outright that were Kuccha. */
  readonly kuccha: number | undefined;
  /** Dwellings destroyed outright that were Pukka. */
  readonly pukka: number | undefined;
};

export type PolicyCosting = {
  readonly policy: ReconstructionPolicy;
  /** Dwellings this policy can fully cost. */
  readonly costedDwellings: number | undefined;
  /** Dwellings whose superstructure cannot be priced from a civil-works schedule. */
  readonly uncostedDwellings: number | undefined;
  readonly totalLow: number | undefined;
  readonly totalCentral: number | undefined;
  readonly totalHigh: number | undefined;
  /** True whenever anything is uncosted, so the total reads as "at least". */
  readonly isFloor: boolean;
  readonly caveat: string;
};

/**
 * Cost a policy against a caseload.
 *
 * `pukkaDwelling` and `raisedPlinth` arrive as intervals rather than being
 * computed here, so the caller decides which derivations are in play and this
 * function stays a pure combination — which is also what makes it testable
 * without the SOR.
 */
export const costPolicy = (
  policy: ReconstructionPolicy,
  caseload: Caseload,
  pukkaDwelling: Interval,
  raisedPlinth: Interval,
): PolicyCosting => {
  const kuccha = caseload.kuccha;
  const pukka = caseload.pukka;

  if (kuccha === undefined || pukka === undefined) {
    return {
      policy,
      costedDwellings: undefined,
      uncostedDwellings: undefined,
      totalLow: undefined,
      totalCentral: undefined,
      totalHigh: undefined,
      isFloor: false,
      caveat:
        'No figure: the count of dwellings destroyed was not reported, and an unreported ' +
        'quantity is not a quantity of zero.',
    };
  }

  const scale = (unit: Interval, n: number) => ({
    low: unit.low * n,
    central: unit.central * n,
    high: unit.high * n,
  });
  const add = (a: Interval, b: Interval): Interval => ({
    low: a.low + b.low,
    central: a.central + b.central,
    high: a.high + b.high,
  });
  const nothing: Interval = { low: 0, central: 0, high: 0 };

  // Under every policy a Pukka dwelling is rebuilt Pukka; the policies differ
  // only in what happens to the 91% that were Kuccha.
  const raisedPukkaUnit = add(pukkaDwelling, raisedPlinth);

  let total: Interval;
  let costed: number;
  let uncosted: number;

  switch (policy.key) {
    case 'like-for-like':
      // Kuccha rebuilt as Kuccha: not priceable from this schedule at all.
      total = scale(pukkaDwelling, pukka);
      costed = pukka;
      uncosted = kuccha;
      break;
    case 'protect-in-place':
      // The plinth under a Kuccha house IS priceable even though the house is not.
      total = add(scale(raisedPukkaUnit, pukka), scale(raisedPlinth, kuccha));
      costed = pukka;
      uncosted = kuccha;
      break;
    case 'build-back-better':
      total = scale(raisedPukkaUnit, pukka + kuccha);
      costed = pukka + kuccha;
      uncosted = 0;
      break;
    default:
      total = nothing;
      costed = 0;
      uncosted = pukka + kuccha;
  }

  const isFloor = uncosted > 0;

  return {
    policy,
    costedDwellings: costed,
    uncostedDwellings: uncosted,
    totalLow: total.low,
    totalCentral: total.central,
    totalHigh: total.high,
    isFloor,
    caveat: isFloor
      ? `This is a floor — at least this much. ${uncosted.toLocaleString('en-IN')} Kuccha ` +
        'dwellings are counted in the caseload but their superstructure is not priced: a ' +
        'civil-works schedule prices brick, cement and RCC, and a Kuccha house is bamboo, ' +
        'timber and thatch. ' +
        (policy.key === 'protect-in-place'
          ? 'The raised plinths beneath them ARE priced and are included above.'
          : 'Nothing at all is included for them above.')
      : 'Every dwelling in the caseload is priced, because this policy rebuilds them all in ' +
        'materials the schedule covers. That makes this the only policy here that can be ' +
        'costed in full — which is a fact about the schedule, not a reason to choose it.',
  };
};
