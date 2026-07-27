import { describe, expect, it } from 'vitest';

import { count, unknownCount } from '../shared/quantity';
import { bulletinTimeline } from './bulletin-timeline';
import { districtTransitions, transitionsAcrossTimeline } from './newly-affected';
import { aDistrict, aReport } from '../scenario/__fixtures__/report-builder';
import type { ReportSpec } from '../scenario/__fixtures__/report-builder';

const bulletin = (date: string, spec: Omit<ReportSpec, 'id' | 'date'>) =>
  aReport({ id: `sha256:${date}`, date, ...spec });

const yesterday = () =>
  bulletin('2026-07-27', {
    districts: [
      aDistrict({ name: 'Sivasagar', affected: count(144_461) }),
      aDistrict({ name: 'Dhemaji', affected: count(32_000) }),
      // Reported and quiet, not absent (PRD §4.1).
      aDistrict({ name: 'Dibrugarh', affected: count(0) }),
    ],
  });

const today = () =>
  bulletin('2026-07-28', {
    districts: [
      aDistrict({ name: 'Sivasagar', affected: count(150_000) }),
      // Dhemaji has drained.
      aDistrict({ name: 'Dhemaji', affected: count(0) }),
      // Dibrugarh has gone under.
      aDistrict({ name: 'Dibrugarh', affected: count(4_100) }),
      // Golaghat appears in the bulletin for the first time.
      aDistrict({ name: 'Golaghat', affected: count(12_500) }),
    ],
  });

describe('districts newly affected or newly clear (FR-5.3)', () => {
  const transitions = () => districtTransitions(yesterday(), today());

  it('flags a district that was quiet yesterday and is flooded today', () => {
    expect(transitions().newlyAffected).toEqual([
      { district: 'Dibrugarh', transition: 'newly-affected', previously: 0, now: 4_100 },
      { district: 'Golaghat', transition: 'newly-affected', previously: undefined, now: 12_500 },
    ]);
  });

  it('flags a district that was flooded yesterday and is clear today', () => {
    expect(transitions().newlyClear).toEqual([
      { district: 'Dhemaji', transition: 'newly-clear', previously: 32_000, now: 0 },
    ]);
  });

  it('says nothing about a district that was affected on both days', () => {
    const all = [...transitions().newlyAffected, ...transitions().newlyClear];

    expect(all.some((t) => t.district === 'Sivasagar')).toBe(false);
  });

  it('carries the dates it compared, so the flag is never read out of context', () => {
    expect(transitions()).toMatchObject({ from: '2026-07-27', to: '2026-07-28' });
  });

  it('matches districts across bulletins despite DRIMS spelling drift', () => {
    const previous = bulletin('2026-07-27', {
      districts: [aDistrict({ name: 'Kamrup  Metro', affected: count(0) })],
    });
    const current = bulletin('2026-07-28', {
      districts: [aDistrict({ name: 'kamrup metro', affected: count(900) })],
    });

    expect(districtTransitions(previous, current).newlyAffected).toEqual([
      { district: 'kamrup metro', transition: 'newly-affected', previously: 0, now: 900 },
    ]);
  });
});

describe('an unknown is never read as a clearance', () => {
  it('will not call a district clear when today’s figure was not reported', () => {
    const previous = bulletin('2026-07-27', {
      districts: [aDistrict({ name: 'Majuli', affected: count(45_034) })],
    });
    const current = bulletin('2026-07-28', {
      districts: [aDistrict({ name: 'Majuli', affected: unknownCount() })],
    });

    const result = districtTransitions(previous, current);

    expect(result.newlyClear).toEqual([]);
    expect(result.notAssessable).toEqual([
      {
        district: 'Majuli',
        reason: 'Affected population was not reported for this district in the 2026-07-28 bulletin.',
      },
    ]);
  });

  it('will not call a district newly affected when yesterday’s figure was not reported', () => {
    const previous = bulletin('2026-07-27', {
      districts: [aDistrict({ name: 'Majuli', affected: unknownCount() })],
    });
    const current = bulletin('2026-07-28', {
      districts: [aDistrict({ name: 'Majuli', affected: count(45_034) })],
    });

    const result = districtTransitions(previous, current);

    expect(result.newlyAffected).toEqual([]);
    expect(result.notAssessable).toEqual([
      {
        district: 'Majuli',
        reason: 'Affected population was not reported for this district in the 2026-07-27 bulletin.',
      },
    ]);
  });

  it('will not call a district clear merely because it dropped out of the bulletin', () => {
    const previous = bulletin('2026-07-27', {
      districts: [aDistrict({ name: 'Majuli', affected: count(45_034) })],
    });
    const current = bulletin('2026-07-28', { districts: [] });

    const result = districtTransitions(previous, current);

    expect(result.newlyClear).toEqual([]);
    expect(result.notAssessable).toEqual([
      {
        district: 'Majuli',
        reason: 'This district does not appear in the 2026-07-28 bulletin at all.',
      },
    ]);
  });
});

describe('transitions across a timeline', () => {
  it('reports one transition set per adjacent pair of days', () => {
    const timeline = bulletinTimeline([yesterday(), today()]);

    expect(transitionsAcrossTimeline(timeline).map((t) => [t.from, t.to])).toEqual([
      ['2026-07-27', '2026-07-28'],
    ]);
  });

  it('refuses to compare across a gap, because it cannot know what happened between', () => {
    const timeline = bulletinTimeline([
      yesterday(),
      bulletin('2026-07-30', { districts: [aDistrict({ name: 'Golaghat', affected: count(1) })] }),
    ]);

    expect(transitionsAcrossTimeline(timeline)).toEqual([]);
  });

  it('reports nothing for a single-bulletin timeline', () => {
    expect(transitionsAcrossTimeline(bulletinTimeline([yesterday()]))).toEqual([]);
  });
});
