/**
 * The pure half of the Assam district boundary generator.
 *
 * Kept separate from `generate-assam-districts.ts` — which writes to disk —
 * precisely so a test can import this and re-derive the boundaries from the
 * fixture without the import having the side effect of rewriting the committed
 * artefact. The artefact check
 * (`src/adapters/ui/assam-districts.test.ts`) depends on that separation:
 * it runs the same transform the generator ran and asserts the committed
 * module still equals it.
 *
 * Validation is not decoration here. `fixtures/assam-districts.geojson` is
 * third-party data (Census of India 2011 lineage, via DataMeet — see
 * `fixtures/README.md`), and a silently mis-shaped feature would surface as a
 * District quietly missing from the map, which is exactly the failure the
 * choropleth exists to prevent.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** A closed ring of `[longitude, latitude]` pairs, in WGS 84 degrees. */
export type BoundaryRing = readonly (readonly [number, number])[];

export type DistrictBoundarySource = {
  /** District name as published in the boundary dataset. */
  readonly district: string;
  /** Census 2011 district code, carried so the lineage stays checkable. */
  readonly dtCode: string;
  /**
   * Every ring of the District's geometry, outer rings and any holes alike,
   * flattened. Rendered with `fill-rule="evenodd"`, which draws holes as holes
   * without the renderer needing to know which ring is which.
   */
  readonly rings: readonly BoundaryRing[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${what} must be a non-empty string, got ${JSON.stringify(value)}.`);
  }
  return value.trim();
};

const toRing = (value: unknown, what: string): BoundaryRing => {
  if (!Array.isArray(value) || value.length < 4) {
    throw new Error(`${what} must be a ring of at least 4 positions.`);
  }
  const ring = value.map((position, index): readonly [number, number] => {
    if (!Array.isArray(position) || position.length < 2) {
      throw new Error(`${what} position ${String(index)} is not a [longitude, latitude] pair.`);
    }
    const [longitude, latitude] = position as unknown[];
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
      throw new Error(`${what} position ${String(index)} has a non-finite longitude.`);
    }
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) {
      throw new Error(`${what} position ${String(index)} has a non-finite latitude.`);
    }
    return [longitude, latitude];
  });

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error(`${what} is not closed — the last position must repeat the first.`);
  }
  return ring;
};

const ringsOf = (geometry: unknown, what: string): readonly BoundaryRing[] => {
  if (!isRecord(geometry)) throw new Error(`${what} has no geometry object.`);
  const { type, coordinates } = geometry;

  if (type === 'Polygon') {
    if (!Array.isArray(coordinates)) throw new Error(`${what} Polygon has no coordinates.`);
    return coordinates.map((ring, i) => toRing(ring, `${what} ring ${String(i)}`));
  }

  if (type === 'MultiPolygon') {
    if (!Array.isArray(coordinates)) throw new Error(`${what} MultiPolygon has no coordinates.`);
    return coordinates.flatMap((polygon: unknown, p: number) => {
      if (!Array.isArray(polygon)) {
        throw new Error(`${what} MultiPolygon part ${String(p)} is not a polygon.`);
      }
      return polygon.map((ring, i) =>
        toRing(ring, `${what} part ${String(p)} ring ${String(i)}`),
      );
    });
  }

  throw new Error(`${what} has unsupported geometry type ${JSON.stringify(type)}.`);
};

/**
 * GeoJSON FeatureCollection → boundary records, sorted by District name.
 *
 * Sorting is what makes the committed artefact stable: the fixture's feature
 * order is an accident of whatever produced it, and a re-export that shuffled
 * it would otherwise show up as a 3,500-line diff with no change in meaning.
 */
export const toBoundaries = (geojson: unknown): readonly DistrictBoundarySource[] => {
  if (!isRecord(geojson) || geojson.type !== 'FeatureCollection') {
    throw new Error('Expected a GeoJSON FeatureCollection.');
  }
  const { features } = geojson;
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error('The FeatureCollection carries no features.');
  }

  const boundaries = features.map((feature: unknown, index: number): DistrictBoundarySource => {
    const what = `feature ${String(index)}`;
    if (!isRecord(feature)) throw new Error(`${what} is not an object.`);
    const properties = feature.properties;
    if (!isRecord(properties)) throw new Error(`${what} has no properties.`);

    const district = requireString(properties.district, `${what} property "district"`);
    const dtCode = requireString(properties.dtCode, `${what} property "dtCode"`);
    return { district, dtCode, rings: ringsOf(feature.geometry, `${what} (${district})`) };
  });

  const names = boundaries.map((b) => b.district);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate District names in the boundary data: ${duplicates.join(', ')}.`);
  }

  return [...boundaries].sort((a, b) => a.district.localeCompare(b.district, 'en'));
};

export const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'fixtures',
  'assam-districts.geojson',
);

export const readBoundaryFixture = async (
  file: string = FIXTURE_PATH,
): Promise<readonly DistrictBoundarySource[]> =>
  toBoundaries(JSON.parse(await readFile(file, 'utf8')) as unknown);
