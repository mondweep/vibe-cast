/**
 * Cost Explorer — the chart geometry.
 *
 * ---------------------------------------------------------------------------
 * Why a floating band and not a bar with whiskers
 * ---------------------------------------------------------------------------
 *
 * The obvious geometry for an interval is a bar drawn to the central value with
 * error whiskers either side. It is wrong for this data. A bar rising from zero
 * to a number reads as *the* number, and the whiskers read as tolerance on a
 * measurement — which is exactly the impression ADR-0014 exists to prevent. The
 * central value here is not a measurement with error bars; it is one point
 * inside a range the assumptions produce.
 *
 * So the primary mark is a **floating band from low to high**, with the central
 * value drawn as a tick inside it. There is no bar from zero, so there is no
 * single length for the eye to read off as the answer. The band is the answer.
 *
 * ---------------------------------------------------------------------------
 * Every chart ships with its table
 * ---------------------------------------------------------------------------
 *
 * NFR-11 puts this console on a 1366×768 projector under a washed-out lamp, and
 * NFR-8 says colour is never the only channel. A chart that fails either is
 * decoration. So each chart here is paired with the same data as a table —
 * which is also what a screen reader gets, and what survives a print.
 */

import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TableScroll } from './table-scroll';
import type { Band, BenchmarkBar, TornadoBar } from './cost-explorer-data';

/**
 * Fill the panel, unless a caller pinned the width.
 *
 * jsdom reports every element as zero-sized, so `ResponsiveContainer` renders
 * nothing under test — which is why the tests pass an explicit width and why
 * that path must stay. Same arrangement as the Trend view.
 */
const Sized = ({
  chart,
  width,
  height,
}: {
  readonly chart: ReactElement;
  readonly width: number | undefined;
  readonly height: number;
}) =>
  width === undefined ? (
    <ResponsiveContainer width="100%" height={height}>
      {chart}
    </ResponsiveContainer>
  ) : (
    chart
  );

/**
 * Rupees for an axis tick.
 *
 * The unit is chosen from the tick's own magnitude, because this axis spans
 * five orders of magnitude depending on the normaliser: ₹200 crore for a
 * statewide total, a few thousand rupees for the same figure per household.
 *
 * A single fixed unit fails at one end or the other, and it failed visibly:
 * pinned to lakh, a per-household axis rendered as `₹0.0 L, ₹0.1 L, ₹0.1 L,
 * ₹0.1 L` — three identical ticks on a four-tick axis, an axis carrying no
 * information at all. Below a lakh the ticks are therefore plain rupees, where
 * ₹5,000 and ₹10,000 stay distinguishable.
 */
export const croreTick = (value: number): string => {
  const magnitude = Math.abs(value);
  if (magnitude === 0) return '0';
  if (magnitude >= 100_00_00_000) return `₹${Math.round(value / 1_00_00_000).toLocaleString('en-IN')} cr`;
  if (magnitude >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} cr`;
  if (magnitude >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

/** Rupees inside a label or a table cell, where exactness is affordable. */
export const rupees = (value: number): string => {
  const rounded = Math.round(value);
  if (Math.abs(rounded) < 1_00_00_000) return `₹${rounded.toLocaleString('en-IN')}`;
  return `₹${(rounded / 1_00_00_000).toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} cr`;
};

type ShapeProps = {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly payload?: Band;
  readonly fill?: string;
};

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * The band rectangle, with the central value ticked inside it.
 *
 * The tick's position is interpolated from the datum rather than read off an
 * axis scale, because a custom shape has no access to the scale. Since the rect
 * spans exactly low→high, the arithmetic is exact rather than approximate.
 *
 * Typed as `unknown` because recharts types `shape` that way and then hands it
 * a bag of internal props. The narrowing is done here rather than asserted, so
 * a recharts change that alters the shape contract produces a missing tick
 * (which the tests catch) instead of a crash on a control-room screen.
 */
const BandShape = (raw: unknown) => {
  const props = (raw ?? {}) as ShapeProps;
  const x = num(props.x, 0);
  const y = num(props.y, 0);
  const width = num(props.width, 0);
  const height = num(props.height, 0);
  const payload = props.payload;
  if (payload === undefined) return <g />;

  const span = payload.high - payload.low;
  const fraction = span === 0 ? 0.5 : (payload.central - payload.low) / span;
  const tickX = x + width * Math.min(1, Math.max(0, fraction));

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={props.fill} rx={2} />
      {/* The central tick. A line, not a dot: it must not read as a data point. */}
      <line
        x1={tickX}
        x2={tickX}
        y1={y - 2}
        y2={y + height + 2}
        stroke="var(--c-ink)"
        strokeWidth={2}
      />
    </g>
  );
};

export type BandChartProps = {
  readonly bands: readonly Band[];
  readonly fills: readonly string[];
  readonly tableLabel: string;
  readonly valueHeading: string;
  readonly noteHeading: string;
  readonly width?: number;
  readonly height?: number;
};

/**
 * Horizontal floating bands — the workhorse of this view.
 *
 * `fills` is indexed by row rather than keyed by label so a caller can give the
 * household tier and the public tier visibly different palettes. It is never
 * the only distinction: the table below carries the same rows in words.
 */
export const BandChart = ({
  bands,
  fills,
  tableLabel,
  valueHeading,
  noteHeading,
  width,
  height,
}: BandChartProps) => {
  if (bands.length === 0) {
    return (
      <p className="text-small text-muted" data-chart-empty={tableLabel}>
        No figure to chart: the caseload this would be divided by was not reported. Unknown is
        not zero, so nothing is drawn.
      </p>
    );
  }

  const chartHeight = height ?? Math.max(140, bands.length * 52 + 48);

  const chart = (
        <BarChart
          layout="vertical"
          data={[...bands]}
          width={width}
          height={chartHeight}
          margin={{ top: 8, right: 150, bottom: 8, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke="var(--c-rule)" strokeDasharray="2 2" horizontal={false} />
          <XAxis type="number" tickFormatter={croreTick} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={210}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip
            formatter={(value: number, name: string) => [rupees(value), name]}
            labelFormatter={(label: string) => label}
          />
          {/* The offset to `low`. Invisible: it is scaffolding, not a quantity. */}
          <Bar dataKey="bandBase" stackId="band" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="bandSpan"
            stackId="band"
            shape={BandShape}
            isAnimationActive={false}
            name="low to high"
          >
            {bands.map((b, i) => (
              <Cell key={b.label} fill={fills[i % fills.length]} />
            ))}
            {/*
              Labelled "central", not bare. Sitting to the right of a band, a
              lone figure reads as the value at the band's END — which is the
              high bound, not the central one. The word is the whole fix.
            */}
            <LabelList
              dataKey="central"
              position="right"
              formatter={(v: number) => `central ${rupees(v)}`}
              style={{ fontSize: 11, fill: 'var(--c-ink-muted)' }}
            />
          </Bar>
        </BarChart>
  );

  return (
    <>
      <div className="chart" data-chart={tableLabel}>
        <Sized chart={chart} width={width} height={chartHeight} />
      </div>

      <TableScroll label={tableLabel}>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col" className="numeric">
                {valueHeading}
              </th>
              <th scope="col">{noteHeading}</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.label} data-band-row={b.label}>
                <th scope="row">{b.label}</th>
                <td className="numeric">
                  {rupees(b.low)} – {rupees(b.high)}
                  <span className="text-small text-muted"> (central {rupees(b.central)})</span>
                </td>
                <td className="text-small text-muted">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  );
};

export type TornadoChartProps = {
  readonly bars: readonly TornadoBar[];
  readonly width?: number;
  readonly height?: number;
};

/**
 * The sensitivity chart.
 *
 * Bar length is ALWAYS the rupee swing, in both ranking modes. Only the order
 * changes when the reader switches to ranking by range width — so the bars stay
 * comparable and visibly rearrange, which is what makes the disagreement
 * between the two measures legible rather than merely stated.
 */
export const TornadoChart = ({ bars, width, height }: TornadoChartProps) => {
  if (bars.length === 0) {
    return (
      <p className="text-small text-muted" data-chart-empty="sensitivity">
        No assumptions match this filter.
      </p>
    );
  }

  const chartHeight = height ?? Math.max(160, bars.length * 34 + 48);
  const chart = (
        <BarChart
          layout="vertical"
          data={[...bars]}
          width={width}
          height={chartHeight}
          margin={{ top: 8, right: 110, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke="var(--c-rule)" strokeDasharray="2 2" horizontal={false} />
          <XAxis type="number" tickFormatter={croreTick} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="chartLabel"
            width={260}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip formatter={(value: number) => [rupees(value), 'moves the answer by']} />
          <Bar dataKey="swing" fill="var(--c-derived)" isAnimationActive={false}>
            <LabelList
              dataKey="swing"
              position="right"
              formatter={(v: number) => rupees(v)}
              style={{ fontSize: 11, fill: 'var(--c-ink-muted)' }}
            />
          </Bar>
        </BarChart>
  );

  return (
    <>
      <div className="chart" data-chart="sensitivity">
        <Sized chart={chart} width={width} height={chartHeight} />
      </div>

      <TableScroll label="Assumption sensitivity table">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col">Feeds</th>
              <th scope="col" className="numeric">
                Used [range]
              </th>
              <th scope="col" className="numeric">
                Moves the answer by
              </th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={`${b.affects}:${b.label}`} data-tornado-row={b.label}>
                <th scope="row">
                  {b.label}
                  <span className="text-small text-muted"> — {b.reason}</span>
                </th>
                <td className="text-small">{b.affects}</td>
                <td className="numeric">
                  {b.value.toLocaleString('en-IN')} {b.unit}
                  <span className="text-small text-muted">
                    {' '}
                    [{b.low.toLocaleString('en-IN')}–{b.high.toLocaleString('en-IN')}]
                  </span>
                </td>
                <td className="numeric" data-tornado-swing={b.label}>
                  {rupees(b.swing)}
                  <span className="text-small text-muted">
                    {' '}
                    ({Number.isFinite(b.spread) ? `${b.spread.toFixed(1)}× range` : 'open range'})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  );
};

export type BenchmarkChartProps = {
  readonly bars: readonly BenchmarkBar[];
  readonly width?: number;
  readonly height?: number;
};

/**
 * The compensation demand beside reconstruction.
 *
 * The household count is rendered on the bar itself, not only in the table. A
 * reader who takes nothing but the picture must still leave knowing that the
 * tall bar is tall because it reaches forty times as many households, not
 * because the rate is forty times larger.
 */
export const BenchmarkChart = ({ bars, width, height }: BenchmarkChartProps) => {
  if (bars.length === 0) {
    return (
      <p className="text-small text-muted" data-chart-empty="benchmark">
        No comparison to draw: the affected population or the destroyed-dwelling count was not
        reported.
      </p>
    );
  }

  const chartHeight = height ?? Math.max(160, bars.length * 56 + 48);
  const chart = (
        <BarChart
          layout="vertical"
          data={[...bars]}
          width={width}
          height={chartHeight}
          margin={{ top: 8, right: 160, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke="var(--c-rule)" strokeDasharray="2 2" horizontal={false} />
          <XAxis type="number" tickFormatter={croreTick} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={250}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip formatter={(value: number) => [rupees(value), 'total']} />
          <Bar dataKey="value" isAnimationActive={false}>
            {bars.map((b) => (
              <Cell
                key={b.label}
                fill={b.kind === 'demand' ? 'var(--c-gap)' : 'var(--c-derived)'}
              />
            ))}
            <LabelList
              dataKey="households"
              position="right"
              formatter={(v: number) =>
                v === undefined ? '' : `${Math.round(v).toLocaleString('en-IN')} households`
              }
              style={{ fontSize: 11, fill: 'var(--c-ink-muted)' }}
            />
          </Bar>
        </BarChart>
  );

  return (
    <>
      <div className="chart" data-chart="benchmark">
        <Sized chart={chart} width={width} height={chartHeight} />
      </div>

      <TableScroll label="Compensation benchmark table">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Figure</th>
              <th scope="col" className="numeric">
                Households it reaches
              </th>
              <th scope="col" className="numeric">
                Total
              </th>
              <th scope="col">What it is</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.label} data-benchmark-bar={b.label}>
                <th scope="row">{b.label}</th>
                <td className="numeric" data-benchmark-denominator={b.label}>
                  {b.households === undefined
                    ? '—'
                    : Math.round(b.households).toLocaleString('en-IN')}
                </td>
                <td className="numeric">{rupees(b.value)}</td>
                <td className="text-small text-muted">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  );
};
