/**
 * The console assembled.
 *
 * Still a driving adapter: every figure arrives as `data`, and every action
 * that needs the domain leaves through a callback. What this component owns is
 * purely presentational state — which view is open, which District is
 * expanded, how the table is sorted — plus the *current value* of the user's
 * assumptions (severity weights, ration norm, scenario levers), which it
 * echoes upward so the composition root can recompute and hand back new data.
 */

import { useState } from 'react';
import { AppShell } from './app-shell';
import { useConsoleRoute } from './use-console-route';
import { BulletinLoader } from './bulletin-loader';
import { CostExplorer } from './cost-explorer';
import { DamageMap } from './damage-map';
import { DistrictRanking } from './district-ranking';
import { ResponseCapacity } from './response-capacity';
import { PeriodSummary } from './period-summary';
import { ReconstructionCost } from './reconstruction-cost';
import { ScenarioPlanner } from './scenario-planner';
import { SeverityWeightsPanel } from './severity-weights';
import { SituationSummary } from './situation-summary';
import { StalenessBanner } from './staleness-banner';
import { TrendView } from './trend-view';
import {
  DEFAULT_SEVERITY_WEIGHTS,
  type BulletinAgeViewModel,
  type BulletinLoaderState,
  type BundledArchiveViewModel,
  type DamagePointViewModel,
  type DeltaViewModel,
  type DistrictRowViewModel,
  type DistrictSortKey,
  type FirstFailurePointViewModel,
  type PeriodSummaryViewModel,
  type ProvenanceRef,
  type ResponseCapacityViewModel,
  type ScenarioComparisonRow,
  type ScenarioLeversViewModel,
  type SeverityWeights,
  type SituationSummaryViewModel,
  type SortDirection,
  type TimelineGapViewModel,
  type TrendMetricKey,
  type TrendObservation,
} from './view-models';

export type ConsoleData = {
  readonly summary: SituationSummaryViewModel;
  readonly districts: readonly DistrictRowViewModel[];
  readonly capacity: ResponseCapacityViewModel;
  readonly damagePoints: readonly DamagePointViewModel[];
  readonly scenarioComparisons: readonly ScenarioComparisonRow[];
  readonly firstFailure?: FirstFailurePointViewModel | null;
  readonly trend: {
    /**
     * Which series `observations` actually holds.
     *
     * Supplied by the composition root, which is the only layer that can read
     * the timeline. It is here so that the metric named on screen and the
     * metric plotted cannot drift apart: they come from the same object.
     */
    readonly metricKey: TrendMetricKey;
    readonly observations: readonly TrendObservation[];
    readonly gaps: readonly TimelineGapViewModel[];
    readonly deltas: readonly DeltaViewModel[];
    readonly bulletinCount: number;
  };
  /** Cumulative and peak figures across every bulletin held. */
  readonly period: PeriodSummaryViewModel;
};

export type ConsoleAppProps = {
  readonly loaderState: BulletinLoaderState;
  readonly onLoadBulletin: (file: File) => void;
  readonly data?: ConsoleData | null;
  /**
   * How old the bulletin on screen is, and whether it came out of the bundled
   * archive or was loaded by the officer.
   * Supplied by the composition root, which owns the `Clock` — this component
   * has no way to ask what day it is, and must not acquire one.
   */
  readonly bulletinAge?: BulletinAgeViewModel;
  readonly onWeightsChange?: (weights: SeverityWeights) => void;
  readonly onRationNormChange?: (norm: number) => void;
  readonly onLeversChange?: (levers: ScenarioLeversViewModel) => void;
  /**
   * Which series the Trend view should plot.
   *
   * Without this the console holds the choice and nothing else can see it, so
   * the chart draws Population Affected whatever the dropdown says. The
   * selection is echoed upward like every other assumption: this component
   * still owns the *current value*, the composition root owns the data.
   */
  readonly onTrendMetricChange?: (metric: TrendMetricKey) => void;
  /**
   * The bulletin archive the console ships with, and how much of it has
   * arrived. Passed to the two views it shows up in — Trend and Cumulative &
   * Peak — so each can disclose the bundled points it is drawing, and say so
   * plainly while the archive is still in flight.
   */
  readonly archive?: BundledArchiveViewModel;
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
};

const INITIAL_LEVERS: ScenarioLeversViewModel = {
  populationGrowthPercent: 30,
  campUptakePercent: 25,
  durationDays: 5,
  rationNormKgPerPersonPerDay: 0.6,
  additionalCampCapacity: 0,
};

export const ConsoleApp = ({
  loaderState,
  onLoadBulletin,
  data,
  bulletinAge,
  onWeightsChange,
  onRationNormChange,
  onLeversChange,
  onTrendMetricChange,
  archive,
  onOpenPage,
}: ConsoleAppProps) => {
  // Held in the URL, not in component state, so a view can be linked to.
  const { activeView, selectView } = useConsoleRoute();
  const [sortKey, setSortKey] = useState<DistrictSortKey>('severityIndex');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [weights, setWeights] = useState<SeverityWeights>(DEFAULT_SEVERITY_WEIGHTS);
  const [rationNorm, setRationNorm] = useState(0.6);
  const [levers, setLevers] = useState<ScenarioLeversViewModel>(INITIAL_LEVERS);
  const [metricKey, setMetricKey] = useState<TrendMetricKey>('affectedPopulation');

  const applyWeights = (next: SeverityWeights) => {
    setWeights(next);
    onWeightsChange?.(next);
  };

  const applyLevers = (patch: Partial<ScenarioLeversViewModel>) => {
    const next = { ...levers, ...patch };
    setLevers(next);
    onLeversChange?.(next);
  };

  const applyRationNorm = (norm: number) => {
    setRationNorm(norm);
    onRationNormChange?.(norm);
  };

  const applyTrendMetric = (metric: TrendMetricKey) => {
    setMetricKey(metric);
    onTrendMetricChange?.(metric);
  };

  const onSort = (key: DistrictSortKey) => {
    if (key === sortKey) setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const body = () => {
    if (!data) {
      return (
        <div className="console__empty">
          <BulletinLoader state={loaderState} onLoad={onLoadBulletin} />
        </div>
      );
    }

    switch (activeView) {
      case 'situation':
        return <SituationSummary summary={data.summary} onOpenPage={onOpenPage} />;
      case 'ranking':
        return (
          <div className="panel-stack">
            <SeverityWeightsPanel
              weights={weights}
              onChange={applyWeights}
              onReset={() => applyWeights(DEFAULT_SEVERITY_WEIGHTS)}
            />
            <DistrictRanking
              rows={data.districts}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              expandedDistrict={expandedDistrict}
              onToggleDistrict={(district) =>
                setExpandedDistrict(expandedDistrict === district ? null : district)
              }
              onOpenPage={onOpenPage}
            />
          </div>
        );
      case 'capacity':
        return (
          <ResponseCapacity
            capacity={data.capacity}
            rationNorm={rationNorm}
            onRationNormChange={applyRationNorm}
          />
        );
      case 'map':
        // The District rows drive the choropleth as well as the ranking table:
        // one set of figures, two readings of it (FR-2.7).
        return <DamageMap points={data.damagePoints} districts={data.districts} />;
      case 'scenario':
        return (
          <ScenarioPlanner
            levers={levers}
            onLeverChange={applyLevers}
            comparisons={data.scenarioComparisons}
            baselineLabel={`Assam Flood Report as on ${data.summary.reportDate}`}
            firstFailure={data.firstFailure}
          />
        );
      case 'trend':
        return (
          <TrendView
            metricKey={metricKey}
            onMetricChange={applyTrendMetric}
            observations={data.trend.observations}
            gaps={data.trend.gaps}
            deltas={data.trend.deltas}
            bulletinCount={data.trend.bulletinCount}
            archive={archive}
          />
        );
      case 'period':
        return <PeriodSummary summary={data.period} archive={archive} />;
      case 'reconstruction':
        return <ReconstructionCost replacement={data.period.replacement} />;
      case 'explorer':
        return <CostExplorer replacement={data.period.replacement} />;
    }
  };

  return (
    <AppShell
      activeView={activeView}
      onSelectView={selectView}
      reportDate={data?.summary.reportDate}
      generatedAt={data?.summary.generatedAt}
      bannerSlot={
        bulletinAge ? (
          // The banner is the one element guaranteed to be on screen at every
          // viewport — it is the first thing in the content well, and unlike
          // the rail it is never behind a toggle. So it is where the "load a
          // newer bulletin" affordance belongs on a phone.
          <StalenessBanner age={bulletinAge} onLoadBulletin={onLoadBulletin} />
        ) : null
      }
      headerSlot={
        data ? (
          <BulletinLoader state={loaderState} onLoad={onLoadBulletin} compact />
        ) : null
      }
    >
      {body()}
    </AppShell>
  );
};
