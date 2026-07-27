/**
 * Damage map (FR-2.6).
 *
 * Geography is latent in the bulletin: infrastructure rows carry longitude and
 * latitude, but the PDF renders them as text columns, so a reader cannot see
 * that damage clusters along one road corridor. This plots them.
 *
 * Deliberately an inline SVG scatter over Assam's bounding box rather than a
 * mapping library: no tile server to reach (NFR-5/NFR-6, the console must work
 * offline in a control room), no dependency, no bundle cost.
 *
 * Two distinctions are structural rather than decorative:
 *  - Damage class is carried by *shape*, so the map survives greyscale and
 *    colour blindness (NFR-8).
 *  - Approximate coordinates — the bare `94, 27` in the Charaideo fisheries
 *    rows — are drawn hollow and dashed, because two significant figures
 *    locate a District, not a site. Plotting them as if they were precise is
 *    exactly the mistake the risk register calls out (PRD §9).
 */

import { ASSAM_BOUNDS } from '../../domain/shared/administrative-unit';
import type { DamageClass } from '../../domain/shared/flood-situation-report';
import { DAMAGE_CLASS_LABELS, type DamagePointViewModel } from './view-models';

const VIEW_WIDTH = 1000;
/** ~630 km east–west against ~455 km north–south at this latitude. */
const VIEW_HEIGHT = 720;
const PAD = 28;
/** Points within this many user units of each other are drawn as one marker. */
const CLUSTER_CELL = 18;

type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'cross';

const DAMAGE_SHAPE: Record<DamageClass, Shape> = {
  road: 'circle',
  bridge: 'square',
  'embankment-breached': 'triangle',
  'embankment-affected': 'diamond',
  'school-elementary': 'pentagon',
  'school-secondary': 'hexagon',
  anganwadi: 'star',
  other: 'cross',
};

const DAMAGE_COLOUR: Record<DamageClass, string> = {
  road: 'var(--c-damage-road)',
  bridge: 'var(--c-damage-bridge)',
  'embankment-breached': 'var(--c-damage-breach)',
  'embankment-affected': 'var(--c-damage-embankment)',
  'school-elementary': 'var(--c-damage-school)',
  'school-secondary': 'var(--c-damage-school)',
  anganwadi: 'var(--c-damage-anganwadi)',
  other: 'var(--c-damage-other)',
};

const polygon = (x: number, y: number, r: number, sides: number, rotation: number): string => {
  const points: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    points.push(`${(x + r * Math.cos(angle)).toFixed(2)},${(y + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
};

export const shapePath = (shape: Shape, x: number, y: number, r: number): string => {
  switch (shape) {
    case 'circle':
      return `M${x - r},${y}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;
    case 'square':
      return `M${x - r},${y - r}h${r * 2}v${r * 2}h${-r * 2}Z`;
    case 'triangle':
      return polygon(x, y, r * 1.15, 3, -Math.PI / 2);
    case 'diamond':
      return polygon(x, y, r * 1.2, 4, -Math.PI / 2);
    case 'pentagon':
      return polygon(x, y, r * 1.1, 5, -Math.PI / 2);
    case 'hexagon':
      return polygon(x, y, r * 1.1, 6, -Math.PI / 2);
    case 'star': {
      const points: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? r * 1.3 : r * 0.55;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push(
          `${(x + radius * Math.cos(angle)).toFixed(2)},${(y + radius * Math.sin(angle)).toFixed(2)}`,
        );
      }
      return `M${points.join('L')}Z`;
    }
    case 'cross': {
      const a = r * 0.42;
      return `M${x - a},${y - r}h${a * 2}v${r - a}h${r - a}v${a * 2}h${-(r - a)}v${r - a}h${-a * 2}v${-(r - a)}h${-(r - a)}v${-a * 2}h${r - a}Z`;
    }
  }
};

export const projectLongitude = (longitude: number): number =>
  PAD +
  ((longitude - ASSAM_BOUNDS.minLongitude) /
    (ASSAM_BOUNDS.maxLongitude - ASSAM_BOUNDS.minLongitude)) *
    (VIEW_WIDTH - PAD * 2);

export const projectLatitude = (latitude: number): number =>
  PAD +
  ((ASSAM_BOUNDS.maxLatitude - latitude) /
    (ASSAM_BOUNDS.maxLatitude - ASSAM_BOUNDS.minLatitude)) *
    (VIEW_HEIGHT - PAD * 2);

export type DamageCluster = {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly damageClass: DamageClass;
  readonly precision: 'precise' | 'approximate';
  readonly members: readonly DamagePointViewModel[];
};

/**
 * Group markers that would overlap.
 *
 * Precise and approximate points never share a cluster — merging them would
 * quietly launder a 100 km guess into a located site. Damage classes never
 * share a cluster either, because the marker's shape is what identifies it.
 */
export const clusterPoints = (points: readonly DamagePointViewModel[]): DamageCluster[] => {
  const buckets = new Map<string, DamagePointViewModel[]>();

  for (const point of points) {
    const x = projectLongitude(point.coordinate.longitude);
    const y = projectLatitude(point.coordinate.latitude);
    const key = [
      point.coordinate.kind,
      point.damageClass,
      Math.round(x / CLUSTER_CELL),
      Math.round(y / CLUSTER_CELL),
    ].join('|');
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }

  return Array.from(buckets.entries()).map(([key, members]) => {
    const x =
      members.reduce((sum, p) => sum + projectLongitude(p.coordinate.longitude), 0) /
      members.length;
    const y =
      members.reduce((sum, p) => sum + projectLatitude(p.coordinate.latitude), 0) /
      members.length;
    return {
      key,
      x,
      y,
      damageClass: members[0].damageClass,
      precision: members[0].coordinate.kind,
      members,
    };
  });
};

export type DamageMapProps = {
  readonly points: readonly DamagePointViewModel[];
  /** When omitted, every class is shown. */
  readonly selectedClasses?: readonly DamageClass[];
  readonly onToggleClass?: (damageClass: DamageClass) => void;
  readonly onSelectCluster?: (cluster: DamageCluster) => void;
};

export const DamageMap = ({
  points,
  selectedClasses,
  onToggleClass,
  onSelectCluster,
}: DamageMapProps) => {
  const visible = selectedClasses
    ? points.filter((point) => selectedClasses.includes(point.damageClass))
    : points;
  const clusters = clusterPoints(visible);
  const approximateCount = visible.filter(
    (point) => point.coordinate.kind === 'approximate',
  ).length;

  const classesPresent = Array.from(new Set(points.map((point) => point.damageClass)));

  return (
    <section className="panel" aria-labelledby="map-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="map-heading">
          Infrastructure damage map
        </h2>
        <span className="panel__note">
          {visible.length} damage site{visible.length === 1 ? '' : 's'} plotted across Assam ·{' '}
          {approximateCount} with approximate coordinates
        </span>
      </div>

      <div className="map">
        <svg
          className="map__canvas"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
          aria-label={`Infrastructure damage across Assam: ${visible.length} sites in ${clusters.length} map markers.`}
          data-testid="damage-map-canvas"
        >
          <rect
            x={PAD}
            y={PAD}
            width={VIEW_WIDTH - PAD * 2}
            height={VIEW_HEIGHT - PAD * 2}
            fill="none"
            stroke="var(--c-rule-strong)"
          />
          {[90, 91, 92, 93, 94, 95, 96].map((longitude) => (
            <line
              key={`lon-${longitude}`}
              className="map__graticule"
              x1={projectLongitude(longitude)}
              y1={PAD}
              x2={projectLongitude(longitude)}
              y2={VIEW_HEIGHT - PAD}
            />
          ))}
          {[25, 26, 27, 28].map((latitude) => (
            <line
              key={`lat-${latitude}`}
              className="map__graticule"
              x1={PAD}
              y1={projectLatitude(latitude)}
              x2={VIEW_WIDTH - PAD}
              y2={projectLatitude(latitude)}
            />
          ))}
          <text className="map__frame-label" x={PAD} y={PAD - 8}>
            89.7°E
          </text>
          <text className="map__frame-label" x={VIEW_WIDTH - PAD} y={PAD - 8} textAnchor="end">
            96.0°E
          </text>
          <text className="map__frame-label" x={PAD} y={VIEW_HEIGHT - PAD + 16}>
            24.1°N
          </text>
          <text className="map__frame-label" x={PAD} y={PAD - 20}>
            28.2°N
          </text>

          {clusters.map((cluster) => {
            const size = cluster.members.length;
            const radius = 6 + Math.min(7, Math.sqrt(size - 1) * 3.5);
            const approximate = cluster.precision === 'approximate';
            const colour = DAMAGE_COLOUR[cluster.damageClass];
            const label = `${DAMAGE_CLASS_LABELS[cluster.damageClass]}: ${
              size === 1 ? cluster.members[0].name : `${size} sites`
            }, ${cluster.members[0].district} — ${cluster.members[0].circle}${
              approximate ? ' (approximate coordinate)' : ''
            }`;

            return (
              <g
                key={cluster.key}
                data-cluster-size={size}
                data-precision={cluster.precision}
                data-damage-class={cluster.damageClass}
                onClick={onSelectCluster ? () => onSelectCluster(cluster) : undefined}
              >
                <title>{label}</title>
                <path
                  className="map__point"
                  d={shapePath(DAMAGE_SHAPE[cluster.damageClass], cluster.x, cluster.y, radius)}
                  data-precision={cluster.precision}
                  fill={approximate ? 'none' : colour}
                  stroke={colour}
                  strokeDasharray={approximate ? '3 2' : undefined}
                />
                {size > 1 ? (
                  <text
                    className="map__cluster-count"
                    x={cluster.x}
                    y={cluster.y + 3}
                    textAnchor="middle"
                  >
                    {size}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div>
          <h3>Damage class</h3>
          <ul>
            {classesPresent.map((damageClass) => {
              const count = points.filter(
                (point) => point.damageClass === damageClass,
              ).length;
              const checked = selectedClasses ? selectedClasses.includes(damageClass) : true;
              return (
                <li className="map__legend-item" key={damageClass}>
                  {onToggleClass ? (
                    <input
                      type="checkbox"
                      id={`damage-class-${damageClass}`}
                      checked={checked}
                      onChange={() => onToggleClass(damageClass)}
                    />
                  ) : null}
                  <svg
                    className="map__legend-swatch"
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d={shapePath(DAMAGE_SHAPE[damageClass], 9, 9, 6)}
                      fill={DAMAGE_COLOUR[damageClass]}
                      stroke={DAMAGE_COLOUR[damageClass]}
                    />
                  </svg>
                  <label htmlFor={`damage-class-${damageClass}`}>
                    {DAMAGE_CLASS_LABELS[damageClass]} ({count})
                  </label>
                </li>
              );
            })}
          </ul>

          <h3 style={{ marginTop: 'var(--s-3)' }}>Coordinate precision</h3>
          <ul>
            <li className="map__legend-item">
              <svg className="map__legend-swatch" viewBox="0 0 18 18" aria-hidden="true">
                <path d={shapePath('circle', 9, 9, 6)} fill="var(--c-ink)" stroke="var(--c-ink)" />
              </svg>
              <span>Precise — plotted where reported</span>
            </li>
            <li className="map__legend-item">
              <svg className="map__legend-swatch" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d={shapePath('circle', 9, 9, 6)}
                  fill="none"
                  stroke="var(--c-ink)"
                  strokeDasharray="3 2"
                />
              </svg>
              <span>Approximate — hollow and dashed</span>
            </li>
          </ul>
          <p className="text-small text-muted" style={{ marginTop: 'var(--s-2)' }}>
            Hollow, dashed markers are approximate: ASDMA reported these coordinates to fewer
            than three decimal places, which locates a District rather than a site — roughly
            100 km of uncertainty. They are drawn distinctly so they are never read as a
            surveyed position.
          </p>
          <p className="text-small text-muted">
            Overlapping sites of the same damage class are drawn as one marker carrying the
            count. Embankment Breached and Embankment Affected are never merged.
          </p>
        </div>
      </div>

      <ul className="visually-hidden">
        {visible.map((point) => (
          <li key={point.id}>
            {point.name}, {DAMAGE_CLASS_LABELS[point.damageClass]}, {point.district} District,{' '}
            {point.circle} Revenue Circle,{' '}
            {point.coordinate.kind === 'approximate'
              ? 'approximate coordinate'
              : 'precise coordinate'}{' '}
            {point.coordinate.longitude}°E {point.coordinate.latitude}°N.
          </li>
        ))}
      </ul>
    </section>
  );
};
