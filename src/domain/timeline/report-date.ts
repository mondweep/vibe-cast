/**
 * Temporal Comparison — calendar arithmetic on `ReportDate`.
 *
 * Deliberately built from integers rather than `Date`. Nothing here may read a
 * clock (ADR-0001), and going via `Date` would drag in a timezone: a bulletin
 * dated 27-07-2026 is dated that in Dispur regardless of where the browser
 * thinks it is, and an off-by-one here would invent or erase a day of flood.
 */

import type { ReportDate } from '../shared/flood-situation-report';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number =>
  [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;

type CivilDate = { readonly year: number; readonly month: number; readonly day: number };

const parse = (date: string): CivilDate | undefined => {
  const match = ISO_DATE.exec(date);
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > daysInMonth(year, month)) return undefined;
  return { year, month, day };
};

export const isValidReportDate = (date: string): boolean => parse(date) !== undefined;

/** Days from the civil epoch. Howard Hinnant's `days_from_civil`. */
const toDayNumber = (date: CivilDate): number => {
  const y = date.year - (date.month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (date.month + (date.month > 2 ? -3 : 9)) + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146_097 + doe - 719_468;
};

const fromDayNumber = (dayNumber: number): CivilDate => {
  const z = dayNumber + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  return { year: y + (month <= 2 ? 1 : 0), month, day };
};

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

const format = (date: CivilDate): ReportDate =>
  `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}` as ReportDate;

const dayNumberOf = (date: ReportDate): number => {
  const civil = parse(date);
  if (civil === undefined) {
    throw new RangeError(`"${date}" is not an ISO calendar date (YYYY-MM-DD).`);
  }
  return toDayNumber(civil);
};

/** Positive when `to` is later than `from`. */
export const daysBetween = (from: ReportDate, to: ReportDate): number =>
  dayNumberOf(to) - dayNumberOf(from);

export const compareReportDates = (a: ReportDate, b: ReportDate): number =>
  dayNumberOf(a) - dayNumberOf(b);

/** The calendar dates strictly between two bulletins — the candidate gap. */
export const datesInBetween = (from: ReportDate, to: ReportDate): readonly ReportDate[] => {
  const start = dayNumberOf(from);
  const end = dayNumberOf(to);
  const between: ReportDate[] = [];
  for (let day = start + 1; day < end; day += 1) between.push(format(fromDayNumber(day)));
  return between;
};
