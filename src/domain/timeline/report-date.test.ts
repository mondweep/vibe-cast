import { describe, expect, it } from 'vitest';

import { compareReportDates, daysBetween, datesInBetween, isValidReportDate } from './report-date';
import { reportDate } from '../scenario/__fixtures__/report-builder';

describe('report dates are compared arithmetically, never by the clock', () => {
  it('counts whole days between two bulletin dates', () => {
    expect(daysBetween(reportDate('2026-07-27'), reportDate('2026-07-28'))).toBe(1);
    expect(daysBetween(reportDate('2026-07-27'), reportDate('2026-07-27'))).toBe(0);
    expect(daysBetween(reportDate('2026-07-29'), reportDate('2026-07-27'))).toBe(-2);
  });

  it('crosses month and year boundaries without special-casing them', () => {
    expect(daysBetween(reportDate('2026-07-31'), reportDate('2026-08-01'))).toBe(1);
    expect(daysBetween(reportDate('2026-12-31'), reportDate('2027-01-01'))).toBe(1);
  });

  it('knows 2024 was a leap year and 2026 is not', () => {
    expect(daysBetween(reportDate('2024-02-28'), reportDate('2024-03-01'))).toBe(2);
    expect(daysBetween(reportDate('2026-02-28'), reportDate('2026-03-01'))).toBe(1);
  });

  it('orders dates for the timeline', () => {
    expect(compareReportDates(reportDate('2026-07-27'), reportDate('2026-07-29'))).toBeLessThan(0);
    expect(compareReportDates(reportDate('2026-07-29'), reportDate('2026-07-27'))).toBeGreaterThan(0);
    expect(compareReportDates(reportDate('2026-07-27'), reportDate('2026-07-27'))).toBe(0);
  });

  it('lists the dates that fall strictly between two bulletins', () => {
    expect(datesInBetween(reportDate('2026-07-27'), reportDate('2026-07-30'))).toEqual([
      '2026-07-28',
      '2026-07-29',
    ]);
    expect(datesInBetween(reportDate('2026-07-27'), reportDate('2026-07-28'))).toEqual([]);
    expect(datesInBetween(reportDate('2026-07-31'), reportDate('2026-08-02'))).toEqual([
      '2026-08-01',
    ]);
  });

  it('lists dates across a year boundary, where January and February live in the previous era', () => {
    expect(datesInBetween(reportDate('2026-12-30'), reportDate('2027-01-03'))).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('will not do arithmetic on something that is not a date', () => {
    expect(() => daysBetween(reportDate('27-07-2026'), reportDate('2026-07-28'))).toThrow(
      RangeError,
    );
  });

  it('rejects anything that is not an ISO calendar date', () => {
    expect(isValidReportDate('2026-07-27')).toBe(true);
    expect(isValidReportDate('27-07-2026')).toBe(false);
    expect(isValidReportDate('2026-13-01')).toBe(false);
    expect(isValidReportDate('2026-02-30')).toBe(false);
    expect(isValidReportDate('')).toBe(false);
  });
});
