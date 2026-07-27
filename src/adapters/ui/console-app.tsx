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
import { BulletinLoader } from './bulletin-loader';
import { DamageMap } from './damage-map';
import { DistrictRanking } from './district-ranking';
import { ResponseCapacity } from './response-capacity';
import { ScenarioPlanner } from './scenario-planner';
import { SeverityWeightsPanel } from './severity-weights';
import { SituationSummary } from './situation-summary';
import { StalenessBanner } from './staleness-banner';
import { TrendView } from './trend-view';
import {
  DEFAULT_SEVERITY_WEIGHTS,
  type BulletinAgeViewModel,
  type BulletinLoaderState,
  type ConsoleViewKey,
  type DamagePointViewModel,
  type DeltaViewModel,
  type DistrictRowViewModel,
  type DistrictSortKey,
  type FirstFailurePointViewModel,
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
    readonly observations: readonly TrendObservation[];
    readonly gaps: readonly TimelineGapViewModel[];
    readonly deltas: readonly DeltaViewModel[];
    readonly bulletinCount: number;
  };
};

export type ConsoleAppProps = {
  readonly loaderState: BulletinLoaderState;
  readonly onLoadBulletin: (file: File) => void;
  readonly data?: ConsoleData | null;
  /**
   * How old the bulletin on screen is, and whether it is the bundled example.
   * Supplied by the composition root, which owns the `Clock` — this component
   * has no way to ask what day it is, and must not acquire one.
   */
  readonly bulletinAge?: BulletinAgeViewModel;
  readonly onWeightsChange?: (weights: SeverityWeights) => void;
  readonly onRationNormChange?: (norm: number) => void;
  readonly onLeversChange?: (levers: ScenarioLeversViewModel) => void;
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
  onOpenPage,
}: ConsoleAppProps) => {
  const [activeView, setActiveView] = useState<ConsoleViewKey>('situation');
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
        return <DamageMap points={data.damagePoints} />;
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
            onMetricChange={setMetricKey}
            observations={data.trend.observations}
            gaps={data.trend.gaps}
            deltas={data.trend.deltas}
            bulletinCount={data.trend.bulletinCount}
          />
        );
    }
  };

  return (
    <AppShell
      activeView={activeView}
      onSelectView={setActiveView}
      reportDate={data?.summary.reportDate}
      generatedAt={data?.summary.generatedAt}
      bannerSlot={bulletinAge ? <StalenessBanner age={bulletinAge} /> : null}
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
