/**
 * The composition root's stateful shell.
 *
 * `ConsoleApp` is a driving adapter: it draws what it is given. This component
 * is what gives it — it holds the things that actually change (the bulletins
 * the officer has loaded, the bundled archive, and their assumptions),
 * recomputes `ConsoleData` whenever any of them moves, and hands the result
 * down with the callbacks that move them.
 *
 * The timeline accumulates across loads (FR-1.7): dropping a second PDF adds a
 * bulletin, it does not replace the first. Deduplication and same-day
 * supersession are the `BulletinTimeline` aggregate's job, not this
 * component's — it simply hands each report to the timeline and asks for the
 * ordered result back.
 *
 * ---------------------------------------------------------------------------
 * The console opens on real history
 * ---------------------------------------------------------------------------
 *
 * It ships with **eight consecutive real ASDMA Daily Flood Reports**, 20 to 27
 * July 2026, parsed at build time. Not a mock, not a demonstration dataset: the
 * same PDFs DRIMS published, read by the same parser that reads the officer's.
 * So a link to this console opens on a working seven-day trend, a real
 * cumulative death toll and a real peak — no fetch, no pdf.js, no empty state
 * the recipient has to populate before the product does anything (NFR-3,
 * NFR-5, NFR-6).
 *
 * They arrive in two pieces, and the split is a first-paint decision (NFR-4):
 *
 *  - the **newest** bulletin is eager, in the entry chunk, so the console
 *    renders with figures immediately;
 *  - the **seven older** ones are behind the `import()` in
 *    `generated/bundled-bulletins`, so they cost first paint nothing and arrive
 *    a moment later.
 *
 * That gap is a state, not a detail to be smoothed over. Between paint and
 * arrival the console genuinely holds one bulletin and is about to hold eight,
 * and it says so — `archiveStatus: 'loading'` reaches the Trend and Cumulative
 * & Peak views, which announce the wait rather than reporting a bulletin count
 * they are about to change under the reader. A console that silently corrects
 * its own account of what it holds has taught the officer not to trust that
 * account.
 *
 * ---------------------------------------------------------------------------
 * What the bundled archive is, and is not
 * ---------------------------------------------------------------------------
 *
 * It is history that came with the console. Four rules follow from that, and
 * they are the whole of the policy below:
 *
 *  1. **The officer's own copy always wins.** Load a bulletin for a day the
 *     archive covers and theirs supersedes it — exactly what the
 *     `BulletinTimeline` aggregate specifies for a re-issued day. No special
 *     case here; the aggregate is simply given the bundled bulletins first.
 *  2. **The headline views follow the newest bulletin held**, whether it came
 *     out of the archive or out of a PDF they dropped in. Staleness is measured
 *     against that same bulletin, so bundled history can never make a stale
 *     console look current — and never reports as stale a console that is
 *     holding something newer.
 *  3. **It is disclosed wherever it contributes.** Every view that draws a
 *     bundled point says how many of its points are bundled, and over what
 *     dates.
 *  4. **It is theirs to clear.** An officer who wants only their own bulletins
 *     says so once and the archive goes, leaving their record untouched. The
 *     control appears only once they hold a bulletin of their own: clearing to
 *     an empty console is not an improvement on real history.
 *
 * And one guarantee that holds throughout: the bundled archive is **never
 * written to the officer's store.** It is not their record. `reports` below
 * holds their bulletins and only ever theirs, so there is nothing to pick back
 * out of IndexedDB later.
 *
 * Its **age is stated, prominently and in words.** Nothing on a screen ages by
 * itself; `domain/timeline/staleness` and the banner it feeds are what stop a
 * four-month-old archive reading as this morning's situation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleApp, type ConsoleData } from '../adapters/ui/console-app';
import type {
  BulletinAgeLevel,
  BulletinAgeViewModel,
  BulletinLoaderState,
  BundledArchiveStatus,
  BundledArchiveViewModel,
  ScenarioLeversViewModel,
  SeverityWeights,
  TrendMetricKey,
} from '../adapters/ui/view-models';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { bulletinTimeline } from '../domain/timeline/bulletin-timeline';
import {
  assessStaleness,
  isTooOldForDecisions,
  type StalenessLevel,
} from '../domain/timeline/staleness';
import {
  ARCHIVE_DATES,
  BUNDLED_RANGE,
  NEWEST_BUNDLED_BULLETIN,
  loadArchivedBulletins,
} from '../generated/bundled-bulletins';
import { DEFAULT_ASSUMPTIONS, type ConsoleAssumptions } from './assumptions';
import type { Container } from './container';
import { reportToConsoleData, type MappingDependencies } from './report-to-console-data';
import { SECTION_LABELS, sectionConfidences } from './section-labels';

export type AppProps = {
  readonly container: Container;
  /** Overridden only by tests, which assert which domain services were asked. */
  readonly mappingDependencies?: MappingDependencies;
  /**
   * Fetches the seven historical bulletins. Injected so a test can hold the
   * console in its loading state, or fail the load, without a real chunk
   * fetch — both are states an officer can be in and neither may be guessed at.
   */
  readonly loadArchive?: () => Promise<readonly FloodSituationReport[]>;
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The Temporal Comparison context's bands, restated in the console's own
 * vocabulary (ADR-0001: the UI owns its view models and does not reach into a
 * bounded context). Exhaustive by construction — add a band to the domain and
 * this stops compiling, rather than rendering a level the banner cannot draw.
 */
const AGE_LEVELS: Record<StalenessLevel, BulletinAgeLevel> = {
  current: 'current',
  ageing: 'ageing',
  stale: 'stale',
  obsolete: 'obsolete',
  unknown: 'unknown',
};

/**
 * How often the console re-reads the clock.
 *
 * The bands are day-granular, so this only has to be fine enough to notice a
 * midnight rollover before it matters. It exists because a control-room console
 * is left open for days at a time, and a banner that was accurate when the tab
 * was opened is not a safety control.
 */
const AGE_RECHECK_MS = 60 * 60 * 1000;

/** How the fetch of the historical archive is going. */
type ArchiveLoad = 'loading' | 'ready' | 'unavailable';

export const App = ({ container, mappingDependencies, loadArchive }: AppProps) => {
  const [reports, setReports] = useState<readonly FloodSituationReport[]>([]);
  const [archived, setArchived] = useState<readonly FloodSituationReport[]>([]);
  const [archiveLoad, setArchiveLoad] = useState<ArchiveLoad>('loading');
  const [archiveCleared, setArchiveCleared] = useState(false);
  const [assumptions, setAssumptions] = useState<ConsoleAssumptions>(DEFAULT_ASSUMPTIONS);
  const [loaderState, setLoaderState] = useState<BulletinLoaderState>({ status: 'idle' });
  const [now, setNow] = useState<Date>(() => container.clock.now());
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey>('affectedPopulation');

  // Bulletins kept from a previous session are part of the timeline the officer
  // left behind; not restoring them would quietly lose their history.
  useEffect(() => {
    let cancelled = false;
    container.listBulletins
      .execute()
      .then((stored) => {
        if (!cancelled && stored.length > 0) setReports(stored);
      })
      .catch(() => {
        // A store we cannot read is not a reason to refuse to open. The console
        // falls back to the bundled archive; loading a PDF still works.
      });
    return () => {
      cancelled = true;
    };
  }, [container]);

  /**
   * Fetch the historical archive, once, straight after first paint.
   *
   * A failure is a state the console reports, not one it hides: `unavailable`
   * reaches the views, which say the history could not be loaded rather than
   * quietly showing a one-bulletin console that looks like a design choice.
   */
  useEffect(() => {
    let cancelled = false;
    const fetchArchive = loadArchive ?? loadArchivedBulletins;
    fetchArchive().then(
      (bulletins) => {
        if (cancelled) return;
        setArchived(bulletins);
        setArchiveLoad('ready');
      },
      () => {
        if (!cancelled) setArchiveLoad('unavailable');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadArchive]);

  useEffect(() => {
    const tick = setInterval(() => setNow(container.clock.now()), AGE_RECHECK_MS);
    return () => clearInterval(tick);
  }, [container]);

  /**
   * The bulletins that came with the console: the eager newest one, plus the
   * archive once it has arrived. Empty once the officer has cleared it.
   */
  const bundled = useMemo<readonly FloodSituationReport[]>(
    () => (archiveCleared ? [] : [...archived, NEWEST_BUNDLED_BULLETIN]),
    [archived, archiveCleared],
  );

  /**
   * Bundled first, the officer's second.
   *
   * That order is the entire supersession rule. `BulletinTimeline.add` drops a
   * day it already holds when a new bulletin arrives for it, so anything the
   * officer loads for a bundled day replaces the bundled one — and an identical
   * copy of a bundled PDF hashes to the same `BulletinId` and is a no-op.
   */
  const timeline = useMemo(
    () => bulletinTimeline([...bundled, ...reports]),
    [bundled, reports],
  );

  /** The content hashes of the officer's own bulletins. */
  const ownIds = useMemo(
    () => new Set(reports.map((report) => report.bulletinId)),
    [reports],
  );

  /**
   * The bulletin the single-bulletin views speak for, and the one staleness is
   * judged against: the newest held, whichever it is.
   */
  const anchor = timeline.latest;

  /** How many of the bulletins on the timeline came with the console. */
  const bundledContributing = useMemo(
    () => timeline.reports.filter((report) => !ownIds.has(report.bulletinId)).length,
    [timeline, ownIds],
  );

  const onClearArchive = useCallback(() => setArchiveCleared(true), []);

  const archiveStatus: BundledArchiveStatus = archiveCleared ? 'cleared' : archiveLoad;

  const archive: BundledArchiveViewModel = useMemo(
    () => ({
      status: archiveStatus,
      fromDate: String(BUNDLED_RANGE.from),
      toDate: String(BUNDLED_RANGE.to),
      bundledCount: BUNDLED_RANGE.count,
      pendingCount: archiveStatus === 'loading' ? ARCHIVE_DATES.length : 0,
      contributingCount: bundledContributing,
      // Offered only once they have something of their own to fall back on.
      onClear: reports.length > 0 && !archiveCleared ? onClearArchive : undefined,
    }),
    [archiveStatus, bundledContributing, reports.length, archiveCleared, onClearArchive],
  );

  const bulletinAge: BulletinAgeViewModel | undefined = useMemo(() => {
    if (anchor === undefined) return undefined;
    const assessment = assessStaleness(anchor.reportDate, now);
    return {
      level: AGE_LEVELS[assessment.level],
      // Stays `undefined` when unknowable. Never defaulted to 0, which would
      // render as "today's bulletin" (ADR-0005).
      ageDays: assessment.ageDays,
      reportDate: assessment.reportDate,
      asOf: assessment.asOf,
      datedInFuture: assessment.datedInFuture,
      safeForCurrentDecisions: !isTooOldForDecisions(assessment.level),
      origin: ownIds.has(anchor.bulletinId) ? 'loaded' : 'bundled-archive',
    };
  }, [anchor, now, ownIds]);

  const data: ConsoleData | null = useMemo(() => {
    if (anchor === undefined) return null;
    return reportToConsoleData(
      { report: anchor, timeline, assumptions, trendMetric },
      mappingDependencies,
    );
  }, [anchor, timeline, assumptions, trendMetric, mappingDependencies]);

  const onLoadBulletin = useCallback(
    (file: File) => {
      setLoaderState({ status: 'parsing', fileName: file.name });
      container.loadBulletin
        .execute(file)
        .then((report) => {
          // Accumulate. The aggregate dedupes by content hash and supersedes a
          // re-issued bulletin for a day already held.
          //
          // `held` is the officer's own record and only ever that — the bundled
          // archive is never folded into it, so it can never be written to
          // their store and never has to be picked back out again. Whether a
          // bundled bulletin still appears alongside their record is decided on
          // every render, from the record itself.
          setReports((held) => bulletinTimeline([...held, report]).reports);
          setLoaderState({
            status: 'loaded',
            fileName: file.name,
            reportDate: String(report.reportDate),
            sections: sectionConfidences(report),
            reconciliationWarnings: report.reconciliationFailures.map((failure) => ({
              sectionLabel: SECTION_LABELS[failure.section],
              column: failure.column,
              statedTotal: failure.statedTotal,
              computedTotal: failure.computedTotal,
            })),
          });
        })
        .catch((error: unknown) => {
          setLoaderState({
            status: 'error',
            fileName: file.name,
            message: messageOf(error),
          });
        });
    },
    [container],
  );

  const onWeightsChange = useCallback((severityWeights: SeverityWeights) => {
    setAssumptions((current) => ({ ...current, severityWeights }));
  }, []);

  const onRationNormChange = useCallback((norm: number) => {
    setAssumptions((current) => ({ ...current, rationNormKgPerPersonPerDay: norm }));
  }, []);

  const onLeversChange = useCallback((levers: ScenarioLeversViewModel) => {
    setAssumptions((current) => ({ ...current, levers }));
  }, []);

  return (
    <ConsoleApp
      loaderState={loaderState}
      onLoadBulletin={onLoadBulletin}
      data={data}
      bulletinAge={bulletinAge}
      onWeightsChange={onWeightsChange}
      onRationNormChange={onRationNormChange}
      onLeversChange={onLeversChange}
      onTrendMetricChange={setTrendMetric}
      archive={archive}
    />
  );
};
