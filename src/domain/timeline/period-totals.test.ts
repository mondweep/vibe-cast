/**
 * Cumulative and peak figures across the loaded bulletins.
 *
 * The arithmetic is trivial. What is under test is the honesty around it: that
 * a stock is never totalled, that a gap is stated rather than smoothed over,
 * and that an unreported District row makes a total a floor rather than a fact.
 */

import { describe, expect, it } from 'vitest';
import { count } from '../shared/quantity';
import type { Casualties, DistrictReport } from '../shared/flood-situation-report';
import { aDistrict, aReport, unknown } from '../scenario/__fixtures__/report-builder';
import { bulletinTimeline, emptyTimeline } from './bulletin-timeline';
import {
  CAMP_INMATES,
  FLOOD_DEATHS,
  GENERAL_DROWNINGS,
  POPULATION_AFFECTED,
} from './measure';
import { cumulativeOf, peakOf, periodCoverage, seriesOf } from './period-totals';

const withCasualties = (name: string, casualties: Casualties): DistrictReport => ({
  ...aDistrict({ name }),
  casualties,
});

const casualties = (floodDeaths: number, generalDrownings = 0, missing = 0): Casualties => ({
  floodDeaths: count(floodDeaths),
  generalDrownings: count(generalDrownings),
  missing: count(missing),
});

const unreported: Casualties = {
  floodDeaths: unknown.count(),
  generalDrownings: unknown.count(),
  missing: unknown.count(),
};

/** One bulletin: a date, a statewide affected total, and a day's flood deaths. */
const bulletin = (
  date: string,
  affected: number,
  floodDeaths: number,
  extraDistricts: readonly DistrictReport[] = [],
) =>
  aReport({
    id: `sha256:${date}`,
    date,
    districts: [withCasualties('Sivasagar', casualties(floodDeaths)), ...extraDistricts],
    statewide: { populationAffected: count(affected) },
  });

/** The six real ASDMA bulletins' statewide shape, minus the days ASDMA missed. */
const sixRealDays = () =>
  bulletinTimeline([
    bulletin('2026-07-20', 362_933, 5),
    bulletin('2026-07-21', 564_660, 21),
    bulletin('2026-07-22', 653_164, 9),
    bulletin('2026-07-25', 654_838, 4),
    bulletin('2026-07-26', 524_733, 2),
    bulletin('2026-07-27', 445_495, 0),
  ]);

describe('periodCoverage', () => {
  it('states the bulletins, the range and the missing days in one clause', () => {
    const coverage = periodCoverage(sixRealDays());

    expect(coverage.bulletinCount).toBe(6);
    expect(coverage.from).toBe('2026-07-20');
    expect(coverage.to).toBe('2026-07-27');
    expect(coverage.spanDays).toBe(8);
    expect(coverage.missingDates).toEqual(['2026-07-23', '2026-07-24']);
    expect(coverage.description).toBe(
      '6 bulletins, 2026-07-20 to 2026-07-27, 2 days missing (2026-07-23, 2026-07-24)',
    );
  });

  it('says so plainly when nothing is missing', () => {
    const coverage = periodCoverage(
      bulletinTimeline([bulletin('2026-07-26', 1, 0), bulletin('2026-07-27', 2, 0)]),
    );

    expect(coverage.hasGaps).toBe(false);
    expect(coverage.description).toBe('2 bulletins, 2026-07-26 to 2026-07-27, no days missing');
  });

  it('describes a single bulletin without pretending it is a period', () => {
    expect(periodCoverage(bulletinTimeline([bulletin('2026-07-27', 1, 0)])).description).toBe(
      '1 bulletin, 2026-07-27',
    );
  });

  it('describes an empty timeline as empty', () => {
    const coverage = periodCoverage(emptyTimeline());

    expect(coverage.bulletinCount).toBe(0);
    expect(coverage.spanDays).toBe(0);
    expect(coverage.description).toBe('no bulletins loaded');
  });
});

describe('seriesOf', () => {
  it('gives one point per loaded bulletin, in date order', () => {
    const series = seriesOf(sixRealDays(), POPULATION_AFFECTED);

    expect(series.map((point) => point.date)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ]);
    expect(series.map((point) => point.value)).toEqual([
      362_933, 564_660, 653_164, 654_838, 524_733, 445_495,
    ]);
  });

  it('puts nothing at all where no bulletin was loaded', () => {
    // The missing days are the gap detector's business. Inventing a point for
    // 23 July here would be fabrication, whatever value it carried.
    const dates = seriesOf(sixRealDays(), POPULATION_AFFECTED).map((point) => point.date);

    expect(dates).not.toContain('2026-07-23');
    expect(dates).not.toContain('2026-07-24');
  });
});

describe('cumulativeOf — flows only', () => {
  it('totals flood deaths across the six real bulletins', () => {
    const figure = cumulativeOf(sixRealDays(), FLOOD_DEATHS);

    expect(figure.total).toBe(41);
    expect(figure.bulletinsCounted).toBe(6);
    expect(figure.substitution).toBe('5 + 21 + 9 + 4 + 2 + 0 = 41');
  });

  it('never presents a total over a period with gaps as complete', () => {
    const figure = cumulativeOf(sixRealDays(), FLOOD_DEATHS);

    expect(figure.completeness).toBe('partial');
    expect(figure.caveat).toContain('cumulative over 6 bulletins');
    expect(figure.caveat).toContain('2 days missing (2026-07-23, 2026-07-24)');
    expect(figure.caveat).toMatch(/not in this total/);
    expect(figure.caveat).toMatch(/Nothing is estimated for them/);
  });

  it('calls a total complete only when every day between the ends is loaded', () => {
    const figure = cumulativeOf(
      bulletinTimeline([bulletin('2026-07-26', 1, 2), bulletin('2026-07-27', 2, 0)]),
      FLOOD_DEATHS,
    );

    expect(figure.total).toBe(2);
    expect(figure.completeness).toBe('complete');
  });

  it('keeps flood deaths and general drownings as two separate totals', () => {
    // PRD §4.2: summing them overstates flood mortality. Two calls, two answers,
    // and no call that produces their sum.
    const timeline = bulletinTimeline([
      aReport({
        id: 'a',
        date: '2026-07-26',
        districts: [withCasualties('Sivasagar', casualties(2, 3))],
      }),
      aReport({
        id: 'b',
        date: '2026-07-27',
        districts: [withCasualties('Sivasagar', casualties(0, 1))],
      }),
    ]);

    expect(cumulativeOf(timeline, FLOOD_DEATHS).total).toBe(2);
    expect(cumulativeOf(timeline, GENERAL_DROWNINGS).total).toBe(4);
  });

  it('counts an unreported District row as a shortfall, not as a zero', () => {
    const timeline = bulletinTimeline([
      aReport({
        id: 'a',
        date: '2026-07-26',
        districts: [
          withCasualties('Sivasagar', casualties(4)),
          withCasualties('Karbi Anglong', unreported),
        ],
      }),
      aReport({
        id: 'b',
        date: '2026-07-27',
        districts: [withCasualties('Sivasagar', casualties(1))],
      }),
    ]);

    const figure = cumulativeOf(timeline, FLOOD_DEATHS);

    expect(figure.total).toBe(5);
    expect(figure.districtRowsNotReporting).toBe(1);
    expect(figure.completeness).toBe('partial');
    expect(figure.caveat).toMatch(/1 District row carried no figure for it/);
    expect(figure.caveat).toMatch(/the true figure is higher/);
  });

  it('names the bulletins that reported nothing at all for the measure', () => {
    const timeline = bulletinTimeline([
      aReport({ id: 'a', date: '2026-07-26', districts: [withCasualties('Sivasagar', unreported)] }),
      aReport({ id: 'b', date: '2026-07-27', districts: [withCasualties('Sivasagar', casualties(3))] }),
    ]);

    const figure = cumulativeOf(timeline, FLOOD_DEATHS);

    expect(figure.total).toBe(3);
    expect(figure.bulletinsCounted).toBe(1);
    expect(figure.datesNotReporting).toEqual(['2026-07-26']);
    expect(figure.caveat).toMatch(/1 loaded bulletin \(2026-07-26\) did not report it/);
  });

  it('reports no total at all — never zero — when nothing reported the measure', () => {
    const figure = cumulativeOf(
      bulletinTimeline([
        aReport({ id: 'a', date: '2026-07-27', districts: [withCasualties('Sivasagar', unreported)] }),
      ]),
      FLOOD_DEATHS,
    );

    expect(figure.total).toBeUndefined();
    expect(figure.completeness).toBe('unavailable');
    expect(figure.substitution).toBe('—');
  });

  it('reports no total for an empty timeline', () => {
    expect(cumulativeOf(emptyTimeline(), FLOOD_DEATHS).total).toBeUndefined();
  });

  it('labels itself as derived, never as an ASDMA figure', () => {
    expect(cumulativeOf(sixRealDays(), FLOOD_DEATHS).caveat).toMatch(
      /Derived here, not reported by ASDMA/,
    );
  });
});

describe('peakOf', () => {
  it('finds the peak of a stock and the day it was reached', () => {
    const timeline = sixRealDays();

    const affected = peakOf(timeline, POPULATION_AFFECTED);

    expect(affected.value).toBe(654_838);
    expect(affected.onDate).toBe('2026-07-25');
    expect(affected.latest).toBe(445_495);
    expect(affected.latestDate).toBe('2026-07-27');
  });

  it('gives a tie to the earlier day — when the level was first that bad', () => {
    const timeline = bulletinTimeline([
      bulletin('2026-07-25', 500, 0),
      bulletin('2026-07-26', 500, 0),
    ]);

    expect(peakOf(timeline, POPULATION_AFFECTED).onDate).toBe('2026-07-25');
  });

  it('says a stock is never totalled, right next to the number', () => {
    const figure = peakOf(sixRealDays(), CAMP_INMATES);

    expect(figure.caveat).toMatch(/never totalled across bulletins/);
    expect(figure.caveat).toMatch(/counted again in every bulletin/);
  });

  it('warns that the true peak may have fallen on a day with no bulletin', () => {
    const figure = peakOf(sixRealDays(), POPULATION_AFFECTED);

    expect(figure.completeness).toBe('partial');
    expect(figure.caveat).toMatch(/may have fallen on one of the missing days/);
  });

  it('reads the worst single bulletin for a flow without calling it a total', () => {
    const figure = peakOf(sixRealDays(), FLOOD_DEATHS);

    expect(figure.value).toBe(21);
    expect(figure.onDate).toBe('2026-07-21');
    expect(figure.caveat).toMatch(/worst single bulletin, not a total/);
  });

  it('skips a bulletin that did not report the measure rather than treating it as zero', () => {
    const timeline = bulletinTimeline([
      aReport({ id: 'a', date: '2026-07-26', districts: [withCasualties('Sivasagar', unreported)] }),
      aReport({ id: 'b', date: '2026-07-27', districts: [withCasualties('Sivasagar', casualties(3))] }),
    ]);

    const figure = peakOf(timeline, FLOOD_DEATHS);

    expect(figure.value).toBe(3);
    expect(figure.latest).toBe(3);
    expect(figure.datesNotReporting).toEqual(['2026-07-26']);
  });

  it('has no peak at all for an empty timeline', () => {
    const figure = peakOf(emptyTimeline(), POPULATION_AFFECTED);

    expect(figure.value).toBeUndefined();
    expect(figure.onDate).toBeUndefined();
    expect(figure.completeness).toBe('unavailable');
  });
});
