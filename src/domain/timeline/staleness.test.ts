/**
 * Staleness — the safety-critical arithmetic.
 *
 * Every case here is written as a clock the caller supplies, never a clock this
 * code reads, so "what does the console say on 4 September" is a test rather
 * than a thing you find out on 4 September.
 */

import { describe, expect, it } from 'vitest';
import type { ReportDate } from '../shared/flood-situation-report';
import {
  assessStaleness,
  isTooOldForDecisions,
  STALENESS_BANDS,
  type StalenessLevel,
} from './staleness';

const date = (iso: string): ReportDate => iso as ReportDate;

/** 09:00 in Dispur on the given day, as a UTC instant. */
const morningInAssam = (iso: string): Date => new Date(`${iso}T03:30:00.000Z`);

describe('assessStaleness', () => {
  const bulletin = date('2026-07-27');

  describe('the age it reports', () => {
    it('is zero on the bulletin’s own day', () => {
      expect(assessStaleness(bulletin, morningInAssam('2026-07-27')).ageDays).toBe(0);
    });

    it('counts whole calendar days, not elapsed hours', () => {
      // 22:00 IST on the 27th to 00:30 IST on the 28th is two and a half hours,
      // and it is one day. Bulletins are dated, not timestamped.
      const lateOn27th = new Date('2026-07-27T16:30:00.000Z');
      const justAfterMidnightOn28th = new Date('2026-07-27T19:00:00.000Z');
      expect(assessStaleness(bulletin, lateOn27th).ageDays).toBe(0);
      expect(assessStaleness(bulletin, justAfterMidnightOn28th).ageDays).toBe(1);
    });

    it('uses Assam’s calendar, not the browser’s UTC day', () => {
      // 01:00 IST on 28 July is still 19:30 UTC on 27 July. An officer in
      // Dispur is on the 28th, and the bulletin is a day old for them.
      expect(assessStaleness(bulletin, new Date('2026-07-27T19:30:00.000Z')).ageDays).toBe(1);
    });

    it('reports the age in days across a month boundary', () => {
      expect(assessStaleness(bulletin, morningInAssam('2026-08-30')).ageDays).toBe(34);
    });
  });

  describe('the bands', () => {
    const levelOn = (iso: string): StalenessLevel =>
      assessStaleness(bulletin, morningInAssam(iso)).level;

    it('calls today’s and yesterday’s bulletin current', () => {
      expect(levelOn('2026-07-27')).toBe('current');
      expect(levelOn('2026-07-28')).toBe('current');
    });

    it('calls two and three days old ageing', () => {
      expect(levelOn('2026-07-29')).toBe('ageing');
      expect(levelOn('2026-07-30')).toBe('ageing');
    });

    it('calls four days to a fortnight stale', () => {
      expect(levelOn('2026-07-31')).toBe('stale');
      expect(levelOn('2026-08-10')).toBe('stale');
    });

    it('calls anything past a fortnight obsolete', () => {
      expect(levelOn('2026-08-11')).toBe('obsolete');
      expect(levelOn('2027-07-27')).toBe('obsolete');
    });

    it('publishes its boundaries, so the UI copy and the bands cannot drift apart', () => {
      expect(STALENESS_BANDS.map((band) => band.level)).toEqual([
        'current',
        'ageing',
        'stale',
        'obsolete',
      ]);
      expect(STALENESS_BANDS[0]?.maxAgeDays).toBe(1);
      expect(STALENESS_BANDS[1]?.maxAgeDays).toBe(3);
      expect(STALENESS_BANDS[2]?.maxAgeDays).toBe(14);
      expect(STALENESS_BANDS[3]?.maxAgeDays).toBeUndefined();
    });
  });

  describe('a bulletin dated in the future', () => {
    // Clock skew on a control-room machine, or a bulletin loaded before the
    // browser's own date catches up. Either way the officer must not be shown
    // "this bulletin is -3 days old", and it is certainly not stale.
    const tomorrow = morningInAssam('2026-07-26');

    it('never produces a negative age', () => {
      expect(assessStaleness(bulletin, tomorrow).ageDays).toBe(0);
    });

    it('is treated as current, and says why', () => {
      const assessment = assessStaleness(bulletin, tomorrow);
      expect(assessment.level).toBe('current');
      expect(assessment.datedInFuture).toBe(true);
    });

    it('does not flag a bulletin dated today as future', () => {
      expect(assessStaleness(bulletin, morningInAssam('2026-07-27')).datedInFuture).toBe(false);
    });
  });

  describe('when there is no usable date (ADR-0005)', () => {
    it('reports unknown rather than inventing a date for an absent one', () => {
      const assessment = assessStaleness(undefined, morningInAssam('2026-08-30'));
      expect(assessment.level).toBe('unknown');
      expect(assessment.ageDays).toBeUndefined();
      expect(assessment.reportDate).toBeUndefined();
    });

    it('reports unknown rather than zero for an unparseable date', () => {
      const assessment = assessStaleness(date('27-07-2026'), morningInAssam('2026-08-30'));
      expect(assessment.level).toBe('unknown');
      // Zero would read as "this bulletin is current". It is the one answer
      // that must never be produced by not knowing.
      expect(assessment.ageDays).toBeUndefined();
    });

    it('reports unknown when the clock itself is unusable', () => {
      const assessment = assessStaleness(bulletin, new Date(Number.NaN));
      expect(assessment.level).toBe('unknown');
      expect(assessment.ageDays).toBeUndefined();
      expect(assessment.asOf).toBeUndefined();
      // The bulletin's own date is still known and still worth showing.
      expect(assessment.reportDate).toBe('2026-07-27');
    });
  });

  it('reports the day it judged against, so the banner can be read months later', () => {
    expect(assessStaleness(bulletin, morningInAssam('2026-08-30')).asOf).toBe('2026-08-30');
  });

  it('reads no clock of its own', () => {
    // The same inputs a year apart must give the same answer. If this function
    // ever reached for `new Date()`, this is the test that would catch it.
    const first = assessStaleness(bulletin, morningInAssam('2026-08-30'));
    const second = assessStaleness(bulletin, morningInAssam('2026-08-30'));
    expect(first).toEqual(second);
    expect(first.ageDays).toBe(34);
  });
});

describe('isTooOldForDecisions', () => {
  it('holds the line at stale', () => {
    expect(isTooOldForDecisions('current')).toBe(false);
    expect(isTooOldForDecisions('ageing')).toBe(false);
    expect(isTooOldForDecisions('stale')).toBe(true);
    expect(isTooOldForDecisions('obsolete')).toBe(true);
  });

  it('treats an unknown age as too old, because we cannot show it is not', () => {
    // Unknown is not zero, and it is not "probably fine" either. A bulletin
    // whose date we could not read is a bulletin we cannot vouch for.
    expect(isTooOldForDecisions('unknown')).toBe(true);
  });
});
