/**
 * Rehabilitation Economics — a constructed replacement cost for dwellings.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE QUOTING ANY NUMBER FROM HERE
 * ---------------------------------------------------------------------------
 *
 * Every figure in this file is **constructed, not published**. The Assam PWD
 * Schedule of Rates prices components — a cubic metre of brickwork, a square
 * metre of roofing — and contains no rate for a house. Getting from one to the
 * other required deciding how big a house is and what it is made of, and those
 * decisions are ours.
 *
 * They are recorded below as `assumed` inputs, each with a range and a reason,
 * so a reader can disagree with any one of them and watch the figure move. That
 * is the whole point: this is an argument, presented as an argument, not a fact
 * presented as a fact.
 *
 * ---------------------------------------------------------------------------
 * Three things the reader must know
 * ---------------------------------------------------------------------------
 *
 * 1. **The SOR edition is undated.** The copy held at `docs/reference/` states
 *    no year anywhere in its text. The roads SOR from the same department was
 *    revised in 2005-06, 2017-18 and 2020-21, so this could sit anywhere in a
 *    fifteen-year band. Construction costs move fast. Until the edition is
 *    confirmed, every figure here is of unknown vintage — recorded in the
 *    citation rather than hidden.
 *
 * 2. **The SOR excludes GST.** It says so explicitly: *"GST is not considered in
 *    the Analysis of Rates. GST applicable is to be provided separately in the
 *    Estimates."* A GST assumption is therefore an input below, not an
 *    afterthought.
 *
 * 3. **Kuccha dwellings are deliberately not costed from this SOR.** A civil
 *    works schedule prices brick, cement and RCC. A Kuccha dwelling is bamboo,
 *    timber and thatch, and pricing it from these rates would be answering a
 *    question about a different building. See `KUCCHA_NOT_COSTED`.
 *
 * Pure. No I/O, no clock.
 */

import { derivation, evaluate, type Derivation, type Interval } from './derivation';
import type { Citation } from './money';

/**
 * The SOR, cited as honestly as it can be.
 *
 * `reference` says the edition is undated rather than leaving it blank or
 * guessing a year. A citation that overstates what is known is worse than one
 * that admits a gap.
 */
const ASSAM_SOR: Citation = {
  publisher: 'Public Works Department (Buildings), Government of Assam',
  document: 'Assam PWD Building Schedule of Rates for Civil Works',
  reference: 'Edition undated — no year appears anywhere in the document text',
  clause: 'see per-item clause on each input',
  source: 'docs/reference/assam-pwd-buildings-schedule-of-rates-civil-works.pdf',
  retrievedOn: '2026-08-06',
};

const sorLine = (label: string, value: number, unit: string, clause: string) =>
  ({
    kind: 'published' as const,
    label,
    value,
    unit,
    citation: { ...ASSAM_SOR, clause },
  });

/**
 * The reference dwelling, and every judgement that defines it.
 *
 * Ranges are deliberately generous. A narrow range on a weak assumption is the
 * dishonest move available here, and the interval is meant to *measure* our
 * uncertainty rather than flatter it.
 */
const PUKKA_DWELLING: Derivation = derivation({
  formula:
    'floor area × ( earthwork + brick walling + RCC roof slab + floor finish ) ' +
    '× fittings and finishes uplift × GST uplift',
  inputs: [
    {
      kind: 'assumed',
      label: 'Floor area of a replaced dwelling',
      value: 30,
      unit: 'm²',
      low: 25,
      high: 46.6,
      reason:
        'Both bounds are now sourced rather than judged. The LOW bound is the PMAY-G ' +
        'statutory minimum unit size of 25 m² — a rural house rebuilt with public money is ' +
        'not built smaller than that, so the previous 20 m² lower bound described a dwelling ' +
        'nobody would be funded to construct. The HIGH bound is 46.6 m², the average floor ' +
        'area of a rural dwelling in India measured by NSS 76th round (2018), which is what ' +
        'replacing what people actually had would mean. 30 m² sits between the two: a little ' +
        'above the sanctioned minimum, well below the national average, and close to what ' +
        'PMAY-G units are built to in practice.',
    },
    {
      kind: 'assumed',
      label: 'Foundation earthwork per m² of floor',
      value: 0.15,
      unit: 'm³/m²',
      low: 0.1,
      high: 0.25,
      reason:
        'Trench excavation for a load-bearing brick house on a strip footing. Varies with ' +
        'soil bearing capacity, which in the Brahmaputra floodplain is often poor and ' +
        'sometimes needs sand filling — hence the upper bound.',
    },
    sorLine('Earthwork in excavation, ordinary soil', 108.82, '₹/m³', 'Ch-1, item 1.1(A)(a)'),
    {
      kind: 'assumed',
      label: 'Brick walling volume per m² of floor',
      value: 0.46,
      unit: 'm³/m²',
      low: 0.35,
      high: 0.6,
      reason:
        'A 30 m² square-ish plan has roughly 22 m of external wall; at 2.75 m height and ' +
        '230 mm thickness that is about 13.9 m³, or 0.46 m³ per m² of floor. A more ' +
        'broken-up plan, internal partitions or a taller wall push it up.',
    },
    sorLine(
      'Brick work in cement mortar 1:5, incl. 20 mm plaster both faces',
      6138.4,
      '₹/m³',
      'Ch-33 composite item, brick work 1:5 with 20 mm plaster 1:4',
    ),
    {
      kind: 'assumed',
      label: 'RCC roof slab volume per m² of floor',
      value: 0.11,
      unit: 'm³/m²',
      low: 0.1,
      high: 0.125,
      reason:
        'A 110 mm slab, which is ordinary for a short-span residential roof. Narrow range ' +
        'because slab thickness is one of the few things here that genuinely does not vary ' +
        'much for a house of this size.',
    },
    sorLine(
      'RCC M20 in superstructure, plinth to first floor, machine mixed',
      6241.39,
      '₹/m³',
      'Ch-2, item 2.2.1(I)(B), M20 grade',
    ),
    sorLine('Cement concrete flooring, 50 mm thick', 253.28, '₹/m²', 'Ch-2, item 2.1.2(b)'),
    {
      kind: 'assumed',
      label: 'Uplift for doors, windows, electrical, sanitary and finishes',
      value: 1.35,
      unit: '×',
      low: 1.25,
      high: 1.55,
      reason:
        'The four priced items above are structure only — they buy a shell with a floor and ' +
        'no openings, wiring, water or paint. This is the largest single judgement in the ' +
        'derivation and the one most worth replacing with a real take-off.',
    },
    {
      kind: 'assumed',
      label: 'GST uplift',
      value: 1.18,
      unit: '×',
      low: 1.12,
      high: 1.18,
      reason:
        'The SOR states GST is excluded and must be added separately. 18% is the standard ' +
        'works-contract rate; the lower bound allows for concessional treatment on ' +
        'government housing schemes.',
    },
  ],
  combine: ([
    floorArea = 0,
    earthworkPerM2 = 0,
    earthworkRate = 0,
    wallPerM2 = 0,
    wallRate = 0,
    slabPerM2 = 0,
    slabRate = 0,
    floorRate = 0,
    fittings = 0,
    gst = 0,
  ]) => {
    const perSquareMetre =
      earthworkPerM2 * earthworkRate + wallPerM2 * wallRate + slabPerM2 * slabRate + floorRate;
    return floorArea * perSquareMetre * fittings * gst;
  },
});

/**
 * Why there is no Kuccha figure, in the product's own words.
 *
 * Rendered wherever a Kuccha replacement cost would otherwise appear, so the
 * absence is an answer rather than a blank.
 */
export const KUCCHA_NOT_COSTED =
  'A Kuccha dwelling is built from bamboo, timber and thatch. The Assam PWD schedule ' +
  'prices civil works — brick, cement and RCC — so costing a Kuccha house from it would ' +
  'answer a question about a different building. If the intention is to rebuild to a ' +
  'permanent standard, that is build-back-better and the Pukka figure is the right one — ' +
  'but that is a policy choice, not a valuation, and it should be made deliberately.';

export type ConstructedDwellingCost = {
  readonly label: string;
  readonly derivation: Derivation;
  readonly interval: Interval;
  /** Always true. Present so a renderer cannot forget which kind of figure this is. */
  readonly constructed: true;
  readonly caveat: string;
};

const CAVEAT =
  'Constructed here, not published. No schedule anywhere states a cost per house: this is ' +
  'the Assam PWD component rates combined under stated assumptions about dwelling size and ' +
  'specification. The range comes from those assumptions, not from rounding. The SOR edition ' +
  'is undated, so the underlying prices are of unknown vintage. Treat this as an argument to ' +
  'be checked, not as a published figure — and never as an entitlement.';

/** Replacement cost of one Pukka dwelling, with its whole derivation attached. */
export const pukkaDwellingReplacement = (): ConstructedDwellingCost => ({
  label: 'Pukka dwelling, fully replaced',
  derivation: PUKKA_DWELLING,
  interval: evaluate(PUKKA_DWELLING),
  constructed: true,
  caveat: CAVEAT,
});
