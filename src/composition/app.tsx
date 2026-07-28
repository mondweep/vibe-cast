/**
 * The composition root's stateful shell.
 *
 * `ConsoleApp` is a driving adapter: it draws what it is given. This component
 * is what gives it — it holds the two things that actually change (the bulletins
 * loaded, and the user's assumptions), recomputes `ConsoleData` whenever either
 * moves, and hands the result down with the callbacks that move them.
 *
 * The timeline accumulates across loads (FR-1.7): dropping a second PDF adds a
 * bulletin, it does not replace the first. Deduplication and same-day
 * supersession are the `BulletinTimeline` aggregate's job, not this
 * component's — it simply hands each report to the timeline and asks for the
 * ordered result back.
 *
 * **The console never opens empty.** With no bulletins held it shows
 * `DEFAULT_BULLETIN`, the real 27 July 2026 report parsed at build time, so an
 * officer sees the product working the instant the page paints — no fetch, no
 * pdf.js, no loading state (NFR-3, NFR-5, NFR-6).
 *
 * ---------------------------------------------------------------------------
 * What happens to the example once the officer loads something
 * ---------------------------------------------------------------------------
 *
 * The example used to be discarded the moment any bulletin arrived. The
 * reasoning was sound — an example the officer did not choose is not their
 * record — but the behaviour was not: loading one bulletin took the console
 * from one bulletin to one bulletin, so the officer had to find and load a
 * *second* PDF before the product would show them a trend at all. The commonest
 * first action a user takes produced no visible change. That is the defect this
 * rule replaces.
 *
 * The correction starts from something the old reasoning missed: the bundled
 * bulletin is **real ASDMA data**, not a mock. A gap between it and a bulletin
 * the officer loads is a real gap between two real bulletins, and saying so
 * fabricates nothing. What it must never be is *mistaken* for the officer's own
 * record. So it is kept, disclosed, and retired on a rule the officer can
 * predict — retained only while all four of these hold:
 *
 *  1. **They have not removed it.** The Trend view offers a one-click removal;
 *     their timeline is theirs.
 *  2. **They hold no bulletin for 27 July 2026.** Their own copy supersedes it,
 *     exactly as the `BulletinTimeline` aggregate specifies for a re-issued day.
 *  3. **Their own record cannot yet show a trend.** The example's job in the
 *     timeline is to make a comparison possible at all; once they hold two
 *     bulletins of their own, that job is done and it bows out.
 *  4. **It is dated later than their latest bulletin,** so it extends their
 *     record forward. This is what stops an officer who loads a November
 *     bulletin being shown a 98-day hole back to a July example.
 *
 * Two guarantees are unchanged and hold throughout:
 *
 *  - It is **never written to the officer's store.** Whatever it does on
 *    screen, it does not enter their history.
 *  - The **headline views always follow the officer's own latest bulletin**
 *    once they have one. The example can appear in the timeline as a comparison
 *    point; it cannot take over the Situation Summary from a bulletin they just
 *    loaded.
 *
 * And its **age is stated, prominently and in words.** Nothing on a screen ages
 * by itself; `domain/timeline/staleness` and the banner it feeds are what stop
 * a four-month-old example reading as this morning's situation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleApp, type ConsoleData } from '../adapters/ui/console-app';
import type {
  BulletinAgeLevel,
  BulletinAgeViewModel,
  BulletinLoaderState,
  ScenarioLeversViewModel,
  SeverityWeights,
  TrendMetricKey,
} from '../adapters/ui/view-models';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { bulletinTimeline } from '../domain/timeline/bulletin-timeline';
import { compareReportDates } from '../domain/timeline/report-date';
import {
  assessStaleness,
  isTooOldForDecisions,
  type StalenessLevel,
} from '../domain/timeline/staleness';
import { DEFAULT_BULLETIN } from '../generated/default-bulletin';
import { DEFAULT_ASSUMPTIONS, type ConsoleAssumptions } from './assumptions';
import type { Container } from './container';
import { reportToConsoleData, type MappingDependencies } from './report-to-console-data';
import { SECTION_LABELS, sectionConfidences } from './section-labels';

export type AppProps = {
  readonly container: Container;
  /** Overridden only by tests, which assert which domain services were asked. */
  readonly mappingDependencies?: MappingDependencies;
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

/** The day the shipped worked example reports on. */
const SAMPLE_DATE = DEFAULT_BULLETIN.reportDate;

export const App = ({ container, mappingDependencies }: AppProps) => {
  const [reports, setReports] = useState<readonly FloodSituationReport[]>([]);
  const [assumptions, setAssumptions] = useState<ConsoleAssumptions>(DEFAULT_ASSUMPTIONS);
  const [loaderState, setLoaderState] = useState<BulletinLoaderState>({ status: 'idle' });
  const [now, setNow] = useState<Date>(() => container.clock.now());
  const [sampleRemoved, setSampleRemoved] = useState(false);
  const [trendMetric, setTrendMetric] = useState<TrendMetricKey>('affectedPopulation');

  // Bulletins kept from a previous session are part of the timeline the officer
  // left behind; not restoring them would quietly lose their history — and they
  // displace the bundled example, because the officer's own record outranks it.
  useEffect(() => {
    let cancelled = false;
    container.listBulletins
      .execute()
      .then((stored) => {
        if (!cancelled && stored.length > 0) setReports(stored);
      })
      .catch(() => {
        // A store we cannot read is not a reason to refuse to open. The console
        // falls back to the bundled example; loading a PDF still works.
      });
    return () => {
      cancelled = true;
    };
  }, [container]);

  useEffect(() => {
    const tick = setInterval(() => setNow(container.clock.now()), AGE_RECHECK_MS);
    return () => clearInterval(tick);
  }, [container]);

  /** The officer's own record, and nothing else. Ordered by the aggregate. */
  const ownTimeline = useMemo(() => bulletinTimeline(reports), [reports]);

  /**
   * Whether the shipped example still belongs on the chart — the four
   * conditions set out at the top of this file, in the same order.
   */
  const sampleRetained = useMemo(() => {
    if (sampleRemoved) return false;
    const own = ownTimeline.reports;
    if (own.some((held) => held.reportDate === SAMPLE_DATE)) return false;
    if (own.length >= 2) return false;
    const latest = ownTimeline.latest;
    return latest === undefined || compareReportDates(SAMPLE_DATE, latest.reportDate) > 0;
  }, [ownTimeline, sampleRemoved]);

  /** What the Trend and Cumulative views read: the officer's record, plus the example if retained. */
  const timeline = useMemo(
    () => (sampleRetained ? ownTimeline.add(DEFAULT_BULLETIN) : ownTimeline),
    [ownTimeline, sampleRetained],
  );

  /**
   * The bulletin the single-bulletin views speak for.
   *
   * The officer's own latest, always, once they have one — a bulletin they just
   * dropped in must be the one on screen. The example anchors only the
   * first-run console, before they have loaded anything.
   */
  const anchor = ownTimeline.latest ?? (sampleRetained ? DEFAULT_BULLETIN : undefined);

  /** True while the example, and not one of the officer's bulletins, is the anchor. */
  const showingBundledSample = ownTimeline.latest === undefined;

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
      origin: showingBundledSample ? 'bundled-sample' : 'loaded',
    };
  }, [anchor, now, showingBundledSample]);

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
          // example is never folded into it, so it can never be written to
          // their store and never has to be picked back out again. Whether the
          // example still appears alongside their record is decided on every
          // render by `sampleRetained`, from the record itself.
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

  const onRemoveBundledSample = useCallback(() => setSampleRemoved(true), []);

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
      // Disclosed only while it is genuinely one of the points being drawn, and
      // removable only once the officer has a bulletin of their own to fall
      // back on — an empty console is not an improvement on an example.
      bundledSampleDate={sampleRetained ? String(SAMPLE_DATE) : undefined}
      onRemoveBundledSample={reports.length > 0 ? onRemoveBundledSample : undefined}
    />
  );
};
