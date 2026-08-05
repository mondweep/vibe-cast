/**
 * The back-test, wired end to end.
 *
 * The composition root is where the two contexts meet: Temporal Comparison
 * supplies the person-day integrals and the distributed quintals, Rehabilitation
 * Economics divides them. Neither imports the other — that boundary is enforced
 * in `architecture.test.ts` — so this is the only place the wiring exists, and
 * the only place it can be got wrong.
 */

import { describe, expect, it } from 'vitest';
import { count, quintals } from '../domain/shared/quantity';
import { aDistrict, aReport } from '../domain/scenario/__fixtures__/report-builder';
import { bulletinTimeline, emptyTimeline } from '../domain/timeline/bulletin-timeline';
import { periodSummaryFrom } from './period-view';

/** A day: statewide levels, plus one District handing out rice. */
const bulletin = (date: string, campInmates: number, nonCamp: number, rice: number) =>
  aReport({
    id: `sha256:${date}`,
    date,
    statewide: {
      campInmates: count(campInmates),
      nonCampInmates: count(nonCamp),
      populationAffected: count(campInmates + nonCamp + 1000),
    },
    districts: [
      {
        ...aDistrict({ name: 'Sivasagar' }),
        relief: { ...aDistrict({ name: 'Sivasagar' }).relief, rice: quintals(rice) },
      },
    ],
  });

describe('period summary — the relief back-test', () => {
  it('divides distributed rice by each exposure basis', () => {
    // 2 days x 5 quintals = 10 quintals = 1,000 kg.
    // Camp exposure 100 + 100 = 200 person-days -> 5 kg/person/day.
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100, 400, 5), bulletin('2026-07-21', 100, 400, 5)]),
    );

    const camp = summary.backTest.find((r) => r.basis === 'Camp inmates');
    expect(camp?.kgPerPersonPerDay).toBeCloseTo(5, 6);

    // Camp + non-camp = 200 + 800 = 1,000 person-days -> 1 kg/person/day.
    const both = summary.backTest.find((r) => r.basis === 'Camp and non-camp inmates');
    expect(both?.kgPerPersonPerDay).toBeCloseTo(1, 6);
  });

  it('offers three bases and picks none of them', () => {
    // The denominator is the open question. A single figure here would be
    // manufactured precision.
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100, 400, 5), bulletin('2026-07-21', 100, 400, 5)]),
    );

    expect(summary.backTest.map((r) => r.basis)).toEqual([
      'Camp inmates',
      'Camp and non-camp inmates',
      'All affected',
    ]);
  });

  it('says the rate is what was delivered, not what was owed', () => {
    const summary = periodSummaryFrom(
      bulletinTimeline([bulletin('2026-07-20', 100, 400, 5), bulletin('2026-07-21', 100, 400, 5)]),
    );

    for (const row of summary.backTest) {
      expect(row.caveat).toMatch(/not the rate anyone was entitled to/i);
    }
  });

  it('reports no rate at all when nothing is loaded, rather than zero', () => {
    const summary = periodSummaryFrom(emptyTimeline());

    for (const row of summary.backTest) {
      expect(row.kgPerPersonPerDay).toBeUndefined();
    }
  });
});
