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
 * pdf.js, no loading state (NFR-3, NFR-5, NFR-6). Two rules keep that honest,
 * and both are enforced below:
 *
 *  1. The bundled bulletin is a **worked example, not the officer's record.**
 *     It is not written to the repository — an example the officer did not
 *     choose has no business in their stored history — and the first bulletin
 *     they actually load replaces it outright, so it never appears in their
 *     Trend view or their day-over-day deltas. A bulletin loaded for the same
 *     date therefore supersedes it exactly as the `BulletinTimeline` aggregate
 *     specifies, because it is the aggregate that produces the result.
 *  2. Its **age is stated, prominently and in words.** Nothing on a screen
 *     ages by itself; `domain/timeline/staleness` and the banner it feeds are
 *     what stop a four-month-old example reading as this morning's situation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleApp, type ConsoleData } from '../adapters/ui/console-app';
import type {
  BulletinAgeLevel,
  BulletinAgeViewModel,
  BulletinLoaderState,
  ScenarioLeversViewModel,
  SeverityWeights,
} from '../adapters/ui/view-models';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { bulletinTimeline } from '../domain/timeline/bulletin-timeline';
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

export const App = ({ container, mappingDependencies }: AppProps) => {
  const [reports, setReports] = useState<readonly FloodSituationReport[]>([]);
  const [assumptions, setAssumptions] = useState<ConsoleAssumptions>(DEFAULT_ASSUMPTIONS);
  const [loaderState, setLoaderState] = useState<BulletinLoaderState>({ status: 'idle' });
  const [now, setNow] = useState<Date>(() => container.clock.now());

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

  /** True while nothing but the shipped example is on screen. */
  const showingBundledSample = reports.length === 0;

  const timeline = useMemo(
    () => bulletinTimeline(showingBundledSample ? [DEFAULT_BULLETIN] : reports),
    [reports, showingBundledSample],
  );

  const bulletinAge: BulletinAgeViewModel | undefined = useMemo(() => {
    const latest = timeline.latest;
    if (latest === undefined) return undefined;
    const assessment = assessStaleness(latest.reportDate, now);
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
  }, [timeline, now, showingBundledSample]);

  const data: ConsoleData | null = useMemo(() => {
    const latest = timeline.latest;
    if (latest === undefined) return null;
    return reportToConsoleData({ report: latest, timeline, assumptions }, mappingDependencies);
  }, [timeline, assumptions, mappingDependencies]);

  const onLoadBulletin = useCallback(
    (file: File) => {
      setLoaderState({ status: 'parsing', fileName: file.name });
      container.loadBulletin
        .execute(file)
        .then((report) => {
          // Accumulate. The aggregate dedupes by content hash and supersedes a
          // re-issued bulletin for a day already held.
          //
          // `held` deliberately excludes the bundled example: once the officer
          // has a bulletin of their own, the demonstration is gone. For a
          // bulletin dated 27 July that is supersession; for any other date it
          // is the same judgement — a worked example is not part of the
          // officer's timeline and must not turn up in their deltas.
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
    />
  );
};
