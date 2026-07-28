/**
 * The geography under the damage markers: District polygons, the choropleth
 * that shades them, and the legend that says what the shades mean.
 *
 * Split out of `damage-map.tsx` so the map component stays about the damage.
 * Nothing here holds state; the whole layer is a function of the choropleth
 * model built in `choropleth-scale.ts`.
 *
 * **Ground, not figure.** The fills top out at a mid-tone and the District
 * boundaries are drawn at hairline weight in the rule colour. That is a
 * deliberate ceiling: an officer's eye must land on the damage markers first,
 * and a saturated choropleth would take it. The ramp is single-hue and
 * monotonic in lightness, so it survives a greyscale print and every form of
 * colour vision deficiency — and it is never the only channel, because every
 * District carries its figure as text in its `<title>` and again in the hidden
 * list below the map (NFR-8).
 */

import {
  BAND_COUNT,
  CHOROPLETH_MEASURES,
  describeDistrict,
  shadingLabel,
  type ChoroplethMeasureKey,
  type ChoroplethModel,
  type DistrictShading,
} from './choropleth-scale';
import { MAP_PAD, VIEW_HEIGHT, VIEW_WIDTH } from './map-projection';

/** Patterns for the two states that are marked by texture rather than fill. */
export const MapPatternDefs = () => (
  <defs>
    {/*
     * The map frame, as a clip. Assam's easternmost District edge sits about
     * 0.015° beyond the shared kernel's 96.0°E bound — 1.5 km, invisible at
     * this scale — and clipping it at the frame is what a map frame is for.
     */}
    <clipPath id="map-frame">
      <rect
        x={MAP_PAD}
        y={MAP_PAD}
        width={VIEW_WIDTH - MAP_PAD * 2}
        height={VIEW_HEIGHT - MAP_PAD * 2}
      />
    </clipPath>
    {/*
     * Diagonal hatch — the long-standing cartographic mark for "no data".
     * Used where the District *is* in the bulletin but this measure is not
     * reported for it.
     */}
    <pattern
      id="map-hatch-unknown"
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="6" height="6" fill="var(--c-surface)" />
      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--c-ink-faint)" strokeWidth="1.1" />
    </pattern>
    {/*
     * Stipple — a District with no row in the bulletin at all. Textured rather
     * than left blank on purpose: blank is what "fine" looks like, and a
     * District nobody has heard from is not fine (ADR-0005).
     */}
    <pattern id="map-dots-absent" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="5" fill="var(--c-surface)" />
      <circle cx="1.5" cy="1.5" r="0.75" fill="var(--c-rule-strong)" />
    </pattern>
  </defs>
);

/** The fill for a shading state. Bands resolve to a CSS custom property. */
export const shadingFill = (shading: DistrictShading): string => {
  switch (shading.kind) {
    case 'reported':
      return `var(--c-choropleth-${String(shading.band.rank)})`;
    case 'reported-nil':
      return 'var(--c-choropleth-nil)';
    case 'unknown':
      return 'url(#map-hatch-unknown)';
    case 'absent':
      return 'url(#map-dots-absent)';
  }
};

export type DistrictLayerProps = {
  readonly model: ChoroplethModel;
};

export const DistrictLayer = ({ model }: DistrictLayerProps) => (
  <g className="map__districts" data-testid="district-layer" clipPath="url(#map-frame)">
    {model.districts.map((shaded) => (
      <path
        key={shaded.district}
        className="map__district"
        d={shaded.path}
        fillRule="evenodd"
        fill={shadingFill(shaded.shading)}
        data-district={shaded.district}
        data-shading={shaded.shading.kind}
        data-band={
          shaded.shading.kind === 'reported' ? String(shaded.shading.band.rank) : undefined
        }
      >
        <title>{describeDistrict(shaded, model.measure)}</title>
      </path>
    ))}
  </g>
);

const swatch = (shading: DistrictShading) => (
  <svg className="map__legend-swatch" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <rect
      x="1"
      y="1"
      width="16"
      height="16"
      fill={shadingFill(shading)}
      stroke="var(--c-rule-strong)"
      strokeWidth="1"
    />
  </svg>
);

export type ChoroplethLegendProps = {
  readonly model: ChoroplethModel;
  readonly measureKey: ChoroplethMeasureKey;
  readonly onMeasureChange: (measure: ChoroplethMeasureKey) => void;
};

export const ChoroplethLegend = ({
  model,
  measureKey,
  onMeasureChange,
}: ChoroplethLegendProps) => (
  <div className="map__choropleth-legend">
    <h3>District shading</h3>

    <div className="map__measure">
      <label htmlFor="choropleth-measure">Shade Districts by</label>
      <select
        id="choropleth-measure"
        value={measureKey}
        onChange={(event) => onMeasureChange(event.target.value as ChoroplethMeasureKey)}
      >
        {CHOROPLETH_MEASURES.map((measure) => (
          <option key={measure.key} value={measure.key}>
            {measure.label}
          </option>
        ))}
      </select>
    </div>

    <ul>
      {model.bands.map((band) => (
        <li className="map__legend-item" key={band.rank}>
          {swatch({ kind: 'reported', value: band.to, band })}
          <span>
            {band.label}
            {model.measure.unitSuffix}
          </span>
        </li>
      ))}
      {model.bands.length === 0 ? (
        <li className="map__legend-item">
          <span className="text-muted">
            No District reports a figure above nil for {model.measure.label}, so there is
            nothing to band.
          </span>
        </li>
      ) : null}
      <li className="map__legend-item" data-legend="reported-nil">
        {swatch({ kind: 'reported-nil' })}
        <span>
          {shadingLabel('reported-nil')} — the District reported, and the figure is zero
        </span>
      </li>
      <li className="map__legend-item" data-legend="unknown">
        {swatch({ kind: 'unknown' })}
        <span>{shadingLabel('unknown')}</span>
      </li>
      <li className="map__legend-item" data-legend="absent">
        {swatch({ kind: 'absent' })}
        <span>{shadingLabel('absent')} — nobody has reported from here</span>
      </li>
    </ul>

    <p className="text-small text-muted">
      Bands are equal intervals up to a rounded maximum and are upper-inclusive. A stippled
      District is not a quiet one: {String(model.counts.absent)} of{' '}
      {String(model.districts.length)} Districts have no row in this bulletin, and that is an
      absence of information, not an absence of flooding (ADR-0005).
    </p>

    {model.withoutBoundary.length > 0 ? (
      <p className="text-small" data-testid="districts-without-boundary">
        Reported in this bulletin but not shaded, because the bundled Census 2011 boundary
        data has no polygon for them: {model.withoutBoundary.join(', ')}. Their figures are
        in the District ranking; only the map cannot place them.
      </p>
    ) : null}

    <p className="text-small text-muted">
      Shading is by District only. The bulletin reports to Revenue Circle, and Revenue Circle
      boundaries are not published as open data — so an unshaded part of a shaded District
      means nothing at all. Read the Revenue Circle rows in the District ranking for that.
    </p>

    <p className="text-small text-muted">
      No rivers are drawn. The bulletin carries river names and gauge readings but no channel
      geometry, and there is none in the boundary data, so the Brahmaputra is absent rather
      than approximated. Do not read the space between Districts as water.
    </p>

    <p className="text-small text-muted" data-testid="boundary-attribution">
      District boundaries: Census of India 2011 administrative boundaries, published by the
      DataMeet India community under CC BY 4.0, simplified to roughly 200 m for this console.
    </p>
  </div>
);

export const CHOROPLETH_BAND_COUNT = BAND_COUNT;
