/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * What the console knows about its bundled bulletins before the archive has
 * loaded, and the one dynamic import that loads it.
 *
 * Produced by `scripts/generate-bundled-bulletins.ts` from
 * `fixtures/Daily_Flood_Report_2026072{0,…,7}.pdf`. Regenerate with:
 *
 *     npm run generate:bundled-bulletins
 *
 * Any edit made here will be reported as a failure by
 * `src/adapters/pdf/bundled-bulletins.test.ts`, which reparses the fixture
 * PDFs and compares.
 */

import type {
  FloodSituationReport,
  ReportDate,
} from '../domain/shared/flood-situation-report';

export { NEWEST_BUNDLED_BULLETIN } from './newest-bulletin';

/** Every day the bundle covers, oldest first. */
export const BUNDLED_DATES: readonly ReportDate[] = [
  '2026-07-20' as ReportDate,
  '2026-07-21' as ReportDate,
  '2026-07-22' as ReportDate,
  '2026-07-23' as ReportDate,
  '2026-07-24' as ReportDate,
  '2026-07-25' as ReportDate,
  '2026-07-26' as ReportDate,
  '2026-07-27' as ReportDate,
  '2026-07-28' as ReportDate,
  '2026-07-29' as ReportDate,
  '2026-07-30' as ReportDate,
  '2026-07-31' as ReportDate,
  '2026-08-01' as ReportDate,
  '2026-08-02' as ReportDate,
  '2026-08-03' as ReportDate,
  '2026-08-04' as ReportDate,
];

/** The days held in the lazily-loaded archive — every bundled day but the newest. */
export const ARCHIVE_DATES: readonly ReportDate[] = [
  '2026-07-20' as ReportDate,
  '2026-07-21' as ReportDate,
  '2026-07-22' as ReportDate,
  '2026-07-23' as ReportDate,
  '2026-07-24' as ReportDate,
  '2026-07-25' as ReportDate,
  '2026-07-26' as ReportDate,
  '2026-07-27' as ReportDate,
  '2026-07-28' as ReportDate,
  '2026-07-29' as ReportDate,
  '2026-07-30' as ReportDate,
  '2026-07-31' as ReportDate,
  '2026-08-01' as ReportDate,
  '2026-08-02' as ReportDate,
  '2026-08-03' as ReportDate,
];

/** First and last day of the bundle, for copy that must not outrun the data. */
export const BUNDLED_RANGE = {
  from: '2026-07-20' as ReportDate,
  to: '2026-08-04' as ReportDate,
  count: 16,
} as const;

/**
 * Fetch the historical archive.
 *
 * This `import()` is load-bearing: it is the *only* reference to
 * `bulletin-archive` in the source tree, and it is what makes the archive its
 * own build chunk rather than ~65 kB gzipped added to first paint. Turning it
 * into a static import would silently spend the NFR-4 budget, so
 * `npm run verify:lazy-archive` asserts against the built output that no
 * eagerly-loaded chunk imports it statically.
 *
 * Memoised on the promise, not the value, so two callers cannot start two
 * fetches. A rejection clears the memo — a failed load may be retried.
 */
let pending: Promise<readonly FloodSituationReport[]> | undefined;

export const loadArchivedBulletins = (): Promise<readonly FloodSituationReport[]> => {
  pending ??= import('./bulletin-archive')
    .then((module) => module.ARCHIVED_BULLETINS)
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
};
