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
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsoleApp, type ConsoleData } from '../adapters/ui/console-app';
import type {
  BulletinLoaderState,
  ScenarioLeversViewModel,
  SeverityWeights,
} from '../adapters/ui/view-models';
import type { FloodSituationReport } from '../domain/shared/flood-situation-report';
import { bulletinTimeline, emptyTimeline } from '../domain/timeline/bulletin-timeline';
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

export const App = ({ container, mappingDependencies }: AppProps) => {
  const [reports, setReports] = useState<readonly FloodSituationReport[]>([]);
  const [assumptions, setAssumptions] = useState<ConsoleAssumptions>(DEFAULT_ASSUMPTIONS);
  const [loaderState, setLoaderState] = useState<BulletinLoaderState>({ status: 'idle' });

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
        // starts empty and says so; loading a PDF still works.
      });
    return () => {
      cancelled = true;
    };
  }, [container]);

  const timeline = useMemo(
    () => (reports.length === 0 ? emptyTimeline() : bulletinTimeline(reports)),
    [reports],
  );

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
      onWeightsChange={onWeightsChange}
      onRationNormChange={onRationNormChange}
      onLeversChange={onLeversChange}
    />
  );
};
