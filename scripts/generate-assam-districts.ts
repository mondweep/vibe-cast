/**
 * Generates `src/generated/assam-districts.ts` from
 * `fixtures/assam-districts.geojson`.
 *
 * Why a generated TypeScript artefact rather than a JSON import or a fetch?
 *
 * The same reasoning as `generate-default-bulletin.ts`. The console works
 * offline and its CSP sets `connect-src 'self'` (ADR-0004, ADR-0007), so the
 * boundaries have to ship in the bundle. Emitting TypeScript rather than
 * importing the `.geojson` keeps the shape under the type checker — a District
 * that lost its rings would be a compile error — and keeps the raw fixture,
 * with its GeoJSON envelope and per-feature `properties`, out of the bundle.
 *
 * Run it with:
 *
 *     npm run generate:assam-districts
 *
 * which is `vite-node scripts/generate-assam-districts.ts`.
 *
 * The committed output is guaranteed honest by
 * `src/adapters/ui/assam-districts.test.ts`, which re-derives the boundaries
 * from the fixture on every test run and asserts they equal what this script
 * emitted. Hand-edit the generated file and that test fails.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readBoundaryFixture, type DistrictBoundarySource } from './assam-districts-source';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'src', 'generated', 'assam-districts.ts');

const HEADER = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Produced by \`scripts/generate-assam-districts.ts\` from
 * \`fixtures/assam-districts.geojson\`. Regenerate with:
 *
 *     npm run generate:assam-districts
 *
 * District boundaries for Assam — the administrative level at which the ASDMA
 * bulletin reports, and the finest level available as open data. Census of
 * India 2011 lineage, simplified to roughly 200 m, published by the DataMeet
 * India community under CC BY 4.0. Provenance and the attribution requirement
 * are recorded in \`fixtures/README.md\`; the attribution itself is rendered
 * beside the map (ADR-0009).
 *
 * Coordinates are WGS 84 degrees, \`[longitude, latitude]\`, unprojected. The
 * projection is applied at render time in \`src/adapters/ui/map-projection.ts\`
 * so it stays one decision in one place.
 *
 * **Revenue Circle boundaries are not here and were not obtainable.** The
 * bulletin reports to Revenue Circle; this map can only shade to District. The
 * UI says so rather than letting an unshaded Circle read as good news.
 *
 * Any edit made here will be reported as a failure by
 * \`src/adapters/ui/assam-districts.test.ts\`.
 */
`;

/**
 * One ring per line, positions unspaced.
 *
 * Formatting is deliberate: a diff on this file should show which District's
 * geometry moved, not reflow 3,500 lines. `String(number)` round-trips an IEEE
 * double exactly, so the artefact test can compare by value.
 */
const ringSource = (ring: DistrictBoundarySource['rings'][number]): string =>
  `[${ring.map(([lon, lat]) => `[${String(lon)},${String(lat)}]`).join(',')}]`;

const boundarySource = (boundary: DistrictBoundarySource): string =>
  [
    '  {',
    `    district: ${JSON.stringify(boundary.district)},`,
    `    dtCode: ${JSON.stringify(boundary.dtCode)},`,
    '    rings: [',
    ...boundary.rings.map((ring) => `      ${ringSource(ring)},`),
    '    ],',
    '  },',
  ].join('\n');

const main = async (): Promise<void> => {
  const boundaries = await readBoundaryFixture();

  const body = `${HEADER}
export type BoundaryRing = readonly (readonly [number, number])[];

export type DistrictBoundary = {
  /** District name as published in the boundary dataset. */
  readonly district: string;
  /** Census 2011 district code. */
  readonly dtCode: string;
  /** Outer rings and holes alike; drawn with \`fill-rule="evenodd"\`. */
  readonly rings: readonly BoundaryRing[];
};

export const ASSAM_DISTRICT_BOUNDARIES: readonly DistrictBoundary[] = [
${boundaries.map(boundarySource).join('\n')}
];
`;

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, body, 'utf8');

  const positions = boundaries.reduce(
    (sum, b) => sum + b.rings.reduce((n, ring) => n + ring.length, 0),
    0,
  );

  process.stdout.write(
    `Wrote ${path.relative(ROOT, OUTPUT)} — ` +
      `${String(boundaries.length)} Districts, ` +
      `${String(boundaries.reduce((n, b) => n + b.rings.length, 0))} rings, ` +
      `${String(positions)} positions, ` +
      `${String(body.length)} bytes of TypeScript.\n`,
  );
};

await main();
