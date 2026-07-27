import { describe, expect, it } from 'vitest';

import { count } from '../shared/quantity';
import { TimelineError, bulletinTimeline, emptyTimeline } from './bulletin-timeline';
import { aReport } from '../scenario/__fixtures__/report-builder';

const on = (date: string, id = `sha256:${date}`) => aReport({ id, date });

describe('a BulletinTimeline orders by report date, not by load order (PRD §5.6 invariant 1)', () => {
  it('sorts bulletins into calendar order however they were dropped in', () => {
    const timeline = bulletinTimeline([on('2026-07-29'), on('2026-07-27'), on('2026-07-28')]);

    expect(timeline.reports.map((r) => r.reportDate)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
    ]);
  });

  it('reports the earliest and latest bulletin it holds', () => {
    const timeline = bulletinTimeline([on('2026-07-29'), on('2026-07-27')]);

    expect(timeline.earliest?.reportDate).toBe('2026-07-27');
    expect(timeline.latest?.reportDate).toBe('2026-07-29');
  });

  it('is empty, not broken, before any bulletin is loaded', () => {
    const timeline = emptyTimeline();

    expect(timeline.reports).toEqual([]);
    expect(timeline.latest).toBeUndefined();
    expect(timeline.successivePairs).toEqual([]);
  });
});

describe('loading the same PDF twice is idempotent (PRD §5.6)', () => {
  it('deduplicates by BulletinId, because the id is the content hash', () => {
    const bulletin = on('2026-07-27', 'sha256:asdma-2026-07-27');

    const timeline = emptyTimeline().add(bulletin).add(bulletin);

    expect(timeline.reports).toHaveLength(1);
  });

  it('recognises a re-parse of the same file even as a distinct object', () => {
    const timeline = emptyTimeline()
      .add(aReport({ id: 'sha256:same', date: '2026-07-27' }))
      .add(aReport({ id: 'sha256:same', date: '2026-07-27' }));

    expect(timeline.reports).toHaveLength(1);
  });

  it('lets a re-issued bulletin supersede the one it corrects, keeping one per day', () => {
    const original = aReport({
      id: 'sha256:first-issue',
      date: '2026-07-27',
      statewide: { populationAffected: count(445_495) },
    });
    const reissued = aReport({
      id: 'sha256:corrected-issue',
      date: '2026-07-27',
      statewide: { populationAffected: count(451_002) },
    });

    const timeline = emptyTimeline().add(original).add(reissued);

    expect(timeline.reports).toHaveLength(1);
    expect(timeline.reports[0]?.bulletinId).toBe('sha256:corrected-issue');
  });
});

describe('a timeline is a value, not a mutable collection', () => {
  it('returns a new timeline on add and leaves the original alone', () => {
    const first = emptyTimeline().add(on('2026-07-27'));
    const second = first.add(on('2026-07-28'));

    expect(first.reports).toHaveLength(1);
    expect(second.reports).toHaveLength(2);
  });

  it('refuses a bulletin with no usable report date — there is no undated bulletin', () => {
    expect(() => emptyTimeline().add(aReport({ date: '27-07-2026' }))).toThrow(TimelineError);
    expect(() => emptyTimeline().add(aReport({ date: '' }))).toThrow(/report date/i);
  });

  it('refuses a bulletin with no id, since dedup depends on the content hash', () => {
    expect(() => emptyTimeline().add(aReport({ id: '  ' }))).toThrow(/bulletin id/i);
  });
});

describe('successive pairs carry the span between them', () => {
  it('yields no pair from a single bulletin — the first-run state, not an error', () => {
    const timeline = emptyTimeline().add(on('2026-07-27'));

    expect(timeline.reports).toHaveLength(1);
    expect(timeline.successivePairs).toEqual([]);
  });

  it('records how many days each pair spans, so gaps are visible downstream', () => {
    const timeline = bulletinTimeline([on('2026-07-27'), on('2026-07-29'), on('2026-07-30')]);

    expect(
      timeline.successivePairs.map((p) => [p.previous.reportDate, p.current.reportDate, p.spanDays]),
    ).toEqual([
      ['2026-07-27', '2026-07-29', 2],
      ['2026-07-29', '2026-07-30', 1],
    ]);
  });
});
