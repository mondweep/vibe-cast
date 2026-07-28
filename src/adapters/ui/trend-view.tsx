/**
 * Trend across bulletins (FR-5.1, FR-5.2, FR-5.4).
 *
 * Yesterday's bulletin is a separate PDF, so trend — the difference between a
 * receding flood and a building one — otherwise requires manually diffing
 * documents.
 *
 * The hard rule here is that **gaps are gaps**. A missing bulletin becomes an
 * explicit null in the series, so the line breaks visibly, and it is named in
 * words underneath. Drawing a straight line from the 24th to the 27th would
 * invent two days of flood data, which is fabrication, not smoothing
 * (PRD §5.6, invariant 2).
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DerivedBadge } from './derived-badge';
import { TableScroll } from './table-scroll';
import {
  TREND_METRICS,
  formatNumber,
  type DeltaViewModel,
  type TimelineGapViewModel,
  type TrendMetricKey,
  type TrendObservation,
} from './view-models';

export type TrendChartDatum = {
  readonly date: string;
  /** `null` — not zero — on a date with no bulletin. Recharts breaks the line. */
  readonly value: number | null;
  readonly missing: boolean;
};

/**
 * Splice the missing dates into the series as explicit nulls.
 *
 * Pure and exported so the no-interpolation guarantee can be tested directly,
 * rather than inferred from pixels.
 */
export const withExplicitGaps = (
  observations: readonly TrendObservation[],
  gaps: readonly TimelineGapViewModel[],
): TrendChartDatum[] => {
  const reported = new Map<string, number | undefined>();
  for (const observation of observations) reported.set(observation.date, observation.value);

  const dates = new Set<string>(observations.map((observation) => observation.date));
  for (const gap of gaps) for (const date of gap.missingDates) dates.add(date);

  return Array.from(dates)
    .sort()
    .map((date) => {
      const held = reported.has(date);
      const value = reported.get(date);
      return {
        date,
        value: held && value !== undefined ? value : null,
        missing: !held,
      };
    });
};

export type TrendViewProps = {
  readonly metricKey: TrendMetricKey;
  readonly onMetricChange: (metric: TrendMetricKey) => void;
  readonly observations: readonly TrendObservation[];
  readonly gaps: readonly TimelineGapViewModel[];
  /** Day-over-day deltas. The host supplies only *adjacent* pairs. */
  readonly deltas: readonly DeltaViewModel[];
  readonly bulletinCount: number;
  /**
   * The date of the worked example shipped with the console, while it is still
   * one of the points on the chart. Disclosed rather than blended in: a point
   * the officer did not load must not read as one they did.
   */
  readonly bundledSampleDate?: string;
  readonly onRemoveBundledSample?: () => void;
  /** Explicit dimensions bypass ResponsiveContainer (used by tests). */
  readonly chartWidth?: number;
  readonly chartHeight?: number;
};

const DIRECTION_MARK: Record<DeltaViewModel['direction'], string> = {
  up: '▲ up',
  down: '▼ down',
  unchanged: '– unchanged',
  unknown: '? not reported',
};

export const TrendView = ({
  metricKey,
  onMetricChange,
  observations,
  gaps,
  deltas,
  bulletinCount,
  bundledSampleDate,
  onRemoveBundledSample,
  chartWidth,
  chartHeight = 280,
}: TrendViewProps) => {
  const metric = TREND_METRICS.find((candidate) => candidate.key === metricKey);
  const precision = metric?.precision ?? 0;
  const metricLabel = metric?.label ?? 'this measure';
  const data = withExplicitGaps(observations, gaps);

  /*
   * Dates we hold a bulletin for, where this particular measure came back
   * unreported. `withExplicitGaps` already distinguishes the two causes of a
   * null via `missing`; until now nothing surfaced the distinction, so both
   * rendered as an identical unexplained break.
   */
  const unreportedDates = data
    .filter((datum) => !datum.missing && datum.value === null)
    .map((datum) => datum.date);

  const chart = (
    <LineChart
      data={data}
      width={chartWidth}
      height={chartHeight}
      margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
    >
      <CartesianGrid stroke="var(--c-rule)" strokeDasharray="2 2" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis
        tickFormatter={(value: number) => formatNumber(value, precision)}
        tick={{ fontSize: 11 }}
      />
      <Tooltip formatter={(value: number) => formatNumber(value, precision)} />
      {gaps.map((gap) => (
        <ReferenceArea
          key={`${gap.afterDate}-${gap.beforeDate}`}
          x1={gap.missingDates[0]}
          x2={gap.missingDates[gap.missingDates.length - 1]}
          strokeOpacity={0}
          fill="var(--c-rule)"
          fillOpacity={0.55}
          label={{ value: 'no bulletin', fontSize: 10 }}
        />
      ))}
      <Line
        type="linear"
        dataKey="value"
        name={metric?.label ?? metricKey}
        stroke="var(--c-damage-road)"
        strokeWidth={2}
        dot={{ r: 3 }}
        connectNulls={false}
        isAnimationActive={false}
      />
    </LineChart>
  );

  return (
    <div className="panel-stack">
      <section className="panel" aria-labelledby="trend-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="trend-heading">
            Trend across loaded bulletins
          </h2>
          <div className="assumption">
            <label htmlFor="trend-metric">Metric</label>
            <select
              id="trend-metric"
              value={metricKey}
              onChange={(event) => onMetricChange(event.target.value as TrendMetricKey)}
            >
              {TREND_METRICS.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.label}
                  {candidate.derived ? ' (derived)' : ''}
                </option>
              ))}
            </select>
            {metric?.derived ? (
              <DerivedBadge
                formula={metric.formula ?? metric.label}
                workings={metric.workings ?? 'Computed per bulletin, then plotted.'}
              />
            ) : null}
          </div>
        </div>

        {bulletinCount < 2 ? (
          <p className="text-small text-muted">
            {bulletinCount} bulletin loaded. A single bulletin is a valid timeline and yields no
            deltas — load an earlier DRIMS PDF to compare.
          </p>
        ) : null}

        {bundledSampleDate !== undefined ? (
          <p className="trend__sample-note text-small" data-testid="trend-sample-note">
            One point on this chart —{' '}
            <span className="figure">{bundledSampleDate}</span> — is the worked example
            shipped with this console, not a bulletin you loaded. It is a real ASDMA
            bulletin, so the comparison is genuine, and it leaves the timeline as soon as
            your own record covers that day.{' '}
            {onRemoveBundledSample ? (
              <button
                type="button"
                className="trend__sample-remove"
                onClick={onRemoveBundledSample}
              >
                Remove the example
              </button>
            ) : null}
          </p>
        ) : null}

        <div className="trend__chart" data-testid="trend-chart">
          {chartWidth === undefined ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              {chart}
            </ResponsiveContainer>
          ) : (
            chart
          )}
        </div>
      </section>

      <section
        className={gaps.length > 0 ? 'callout callout--warning' : 'panel'}
        aria-labelledby="gaps-heading"
      >
        <p className="callout__title" id="gaps-heading">
          Timeline gaps
        </p>
        {/*
          * A break in the line has two quite different causes, and conflating
          * them is what made this view baffling: a reader saw the line stop
          * while this panel said "No gaps".
          *
          *   - no bulletin for that date        -> a timeline gap, listed below
          *   - bulletin held, measure unreported -> listed here, by date
          *
          * The second is not a gap in the record and must not be reported as
          * one; it is a hole in this particular series, and it moves when the
          * officer changes the metric. Saying so is the only way the chart and
          * this panel stop contradicting each other.
          */}
        {unreportedDates.length > 0 ? (
          <p className="trend__gap-note">
            <strong className="figure">{unreportedDates.join(', ')}</strong> —{' '}
            {unreportedDates.length === 1 ? 'this bulletin was' : 'these bulletins were'} loaded
            and read, but {unreportedDates.length === 1 ? 'does' : 'do'} not report{' '}
            <strong>{metricLabel}</strong>. The point is left empty rather than drawn as zero,
            because not reported is not the same as none. Another metric may well plot for{' '}
            {unreportedDates.length === 1 ? 'that date' : 'those dates'}.
          </p>
        ) : null}
        {gaps.length === 0 ? (
          <p className="trend__gap-note text-muted">
            No gaps: every date between the first and last loaded bulletin has a bulletin.
          </p>
        ) : (
          <ul className="callout__list">
            {gaps.map((gap) => (
              <li key={`${gap.afterDate}-${gap.beforeDate}`} data-gap={gap.afterDate}>
                No bulletin for{' '}
                <strong className="figure">{gap.missingDates.join(', ')}</strong> — between{' '}
                <span className="figure">{gap.afterDate}</span> and{' '}
                <span className="figure">{gap.beforeDate}</span>. The line is broken across
                this gap and no delta is computed over it. Interpolating flood data would be
                fabrication.
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="deltas-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="deltas-heading">
            Day-over-day change
          </h2>
          <span className="panel__note">Computed only between adjacent bulletin dates.</span>
        </div>
        {deltas.length === 0 ? (
          <p className="text-small text-muted">
            No adjacent pair of bulletins is loaded, so there is nothing to compare.
          </p>
        ) : (
          <TableScroll label="Day-over-day change table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col" className="numeric">
                    Change
                  </th>
                  <th scope="col">Direction</th>
                </tr>
              </thead>
              <tbody>
                {deltas.map((delta) => (
                  <tr
                    key={`${delta.metricLabel}-${delta.fromDate}-${delta.toDate}`}
                    data-delta={`${delta.fromDate}→${delta.toDate}`}
                  >
                    <th scope="row">
                      {delta.metricLabel}
                      {delta.derived ? ' (derived)' : ''}
                    </th>
                    <td className="figure">
                      {delta.fromDate}{' '}
                      {delta.from === undefined ? '—' : `(${formatNumber(delta.from)})`}
                    </td>
                    <td className="figure">
                      {delta.toDate} {delta.to === undefined ? '—' : `(${formatNumber(delta.to)})`}
                    </td>
                    <td className={`numeric delta delta--${delta.direction}`}>
                      {delta.delta === undefined
                        ? '—'
                        : `${delta.delta > 0 ? '+' : ''}${formatNumber(delta.delta)}`}
                    </td>
                    <td>
                      <span className={`delta__direction delta--${delta.direction}`}>
                        {DIRECTION_MARK[delta.direction]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </section>
    </div>
  );
};
