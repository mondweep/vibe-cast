/**
 * Public surface of the UI driving adapter.
 *
 * The composition root imports from here and nowhere else inside `ui/`.
 */

export { AppShell, type AppShellProps } from './app-shell';
export { BulletinLoader, type BulletinLoaderProps } from './bulletin-loader';
export {
  BulletinReload,
  SDRF_DOWNLOAD_URL,
  type BulletinReloadProps,
} from './bulletin-reload';
export { Bootstrap, type BootstrapProps } from './bootstrap';
export { CasualtyPanel, type CasualtyPanelProps } from './casualty-panel';
export { ConsoleApp, type ConsoleAppProps, type ConsoleData } from './console-app';
export {
  DamageMap,
  clusterPoints,
  type DamageCluster,
  type DamageMapProps,
} from './damage-map';
export {
  buildChoropleth,
  boundaryFor,
  choroplethBands,
  districtKey,
  CHOROPLETH_MEASURES,
  type ChoroplethMeasureKey,
  type ChoroplethModel,
  type DistrictShading,
} from './choropleth-scale';
export { DerivedBadge, DerivedBadgeFor, type DerivedBadgeProps } from './derived-badge';
export { DistrictRanking, type DistrictRankingProps } from './district-ranking';
export { Provenance, formatPages, type ProvenanceProps } from './provenance';
export { ResponseCapacity, type ResponseCapacityProps } from './response-capacity';
export { ScenarioPlanner, type ScenarioPlannerProps } from './scenario-planner';
export { SeverityWeightsPanel, type SeverityWeightsProps } from './severity-weights';
export { SituationSummary, type SituationSummaryProps } from './situation-summary';
export { StalenessBanner, type StalenessBannerProps } from './staleness-banner';
export { TableScroll, type TableScrollProps } from './table-scroll';
export { TrendView, withExplicitGaps, type TrendViewProps } from './trend-view';
export * from './view-models';
