import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DamageMap,
  clusterPoints,
  projectLatitude,
  projectLongitude,
} from './damage-map';
import { damagePointsFixture, districtRowsFixture } from './test-fixtures';

afterEach(cleanup);

const markers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-cluster-size]'));

const districtPaths = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-district]'));

const shadingOf = (container: HTMLElement, district: string): string | null =>
  container.querySelector(`[data-district="${district}"]`)?.getAttribute('data-shading') ??
  null;

describe('projection', () => {
  it("maps Assam's bounding box corners to opposite corners of the canvas", () => {
    expect(projectLongitude(89.7)).toBeLessThan(projectLongitude(96));
    // Latitude is inverted: north is up.
    expect(projectLatitude(28.2)).toBeLessThan(projectLatitude(24.1));
  });
});

describe('clusterPoints', () => {
  it('merges overlapping sites of the same class into one marker', () => {
    const clusters = clusterPoints(damagePointsFixture);
    const roads = clusters.filter((cluster) => cluster.damageClass === 'road');

    expect(roads).toHaveLength(1);
    expect(roads[0].members.map((member) => member.id)).toEqual(['road-1', 'road-2']);
  });

  it('never merges an approximate coordinate into a precise cluster', () => {
    const clusters = clusterPoints(damagePointsFixture);

    for (const cluster of clusters) {
      const kinds = new Set(cluster.members.map((member) => member.coordinate.kind));
      expect(kinds.size).toBe(1);
    }
  });

  it('keeps damage classes in separate markers so the shape stays truthful', () => {
    const clusters = clusterPoints(damagePointsFixture);

    for (const cluster of clusters) {
      const classes = new Set(cluster.members.map((member) => member.damageClass));
      expect(classes.size).toBe(1);
    }
  });
});

describe('DamageMap', () => {
  it('plots one marker per cluster and labels the multi-site ones with a count', () => {
    const { container } = render(<DamageMap points={damagePointsFixture} />);

    // 6 sites → road x2 clustered, breach, bridge, fisheries x2 clustered = 4 markers.
    expect(markers(container)).toHaveLength(4);

    const road = container.querySelector('[data-damage-class="road"]');
    expect(road?.getAttribute('data-cluster-size')).toBe('2');
    expect(road?.querySelector('.map__cluster-count')?.textContent).toBe('2');
  });

  it('renders approximate coordinates distinctly from precise ones', () => {
    const { container } = render(<DamageMap points={damagePointsFixture} />);

    const approximate = container.querySelector(
      'path[data-precision="approximate"]',
    ) as SVGPathElement;
    const precise = container.querySelector(
      'path[data-precision="precise"]',
    ) as SVGPathElement;

    // Hollow and dashed vs filled and solid — a difference in shape and
    // stroke, not only in colour (NFR-8).
    expect(approximate.getAttribute('fill')).toBe('none');
    expect(approximate.getAttribute('stroke-dasharray')).toBe('3 2');
    expect(precise.getAttribute('fill')).not.toBe('none');
    expect(precise.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('explains in words why the approximate markers look different', () => {
    render(<DamageMap points={damagePointsFixture} />);

    expect(screen.getByText(/Approximate — hollow and dashed/)).toBeTruthy();
    expect(
      screen.getByText(/fewer than three decimal places, which locates a District rather than a site/),
    ).toBeTruthy();
    expect(screen.getByText(/2 with approximate coordinates/)).toBeTruthy();
  });

  it('gives each damage class its own shape as well as its own colour', () => {
    const { container } = render(<DamageMap points={damagePointsFixture} />);

    const paths = Array.from(container.querySelectorAll('g[data-damage-class] path')).map(
      (path) => path.getAttribute('d'),
    );
    // Four markers, four distinct outlines.
    expect(new Set(paths).size).toBe(paths.length);
    expect(screen.getByText('Embankment Breached (1)')).toBeTruthy();
    expect(screen.getByText('Road (2)')).toBeTruthy();
  });

  it('filters to the classes the host selected', () => {
    const { container } = render(
      <DamageMap points={damagePointsFixture} selectedClasses={['road']} />,
    );

    expect(markers(container)).toHaveLength(1);
    expect(container.querySelector('[data-damage-class="road"]')).not.toBeNull();
  });

  it('reports a class toggle rather than filtering itself', async () => {
    const onToggleClass = vi.fn();
    const user = userEvent.setup();
    render(
      <DamageMap
        points={damagePointsFixture}
        selectedClasses={['road', 'bridge', 'embankment-breached', 'other']}
        onToggleClass={onToggleClass}
      />,
    );

    await user.click(screen.getByLabelText('Bridge (1)'));

    expect(onToggleClass).toHaveBeenCalledWith('bridge');
  });

  it('describes every plotted site for a screen reader', () => {
    render(<DamageMap points={damagePointsFixture} />);

    expect(
      screen.getByText(
        /Sonari Fishery Pond, Other, Charaideo District, Sonari Revenue Circle, approximate coordinate/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Demow Dyke, Embankment Breached, Sivasagar District, Demow Revenue Circle, precise coordinate/,
      ),
    ).toBeTruthy();
  });
});

describe('the Assam base layer', () => {
  it('draws all 33 Districts beneath the markers', () => {
    // The user's complaint about the first version, as a test: "the damage map
    // doesn't show the map of Assam — only dots".
    const { container } = render(<DamageMap points={damagePointsFixture} />);

    expect(districtPaths(container)).toHaveLength(33);
    for (const path of districtPaths(container)) {
      expect(path.getAttribute('d')?.startsWith('M')).toBe(true);
    }
  });

  it('paints the geography before the damage, so the markers stay on top', () => {
    const { container } = render(<DamageMap points={damagePointsFixture} />);
    const canvas = container.querySelector('[data-testid="damage-map-canvas"]');
    const nodes = Array.from(canvas?.querySelectorAll('[data-district], [data-cluster-size]') ?? []);

    const lastDistrict = nodes.findLastIndex((node) => node.hasAttribute('data-district'));
    const firstMarker = nodes.findIndex((node) => node.hasAttribute('data-cluster-size'));

    expect(lastDistrict).toBeLessThan(firstMarker);
  });

  it('offers no shading legend when no District figures were supplied', () => {
    // Absence of data supplied to the component is not the same claim as
    // "no District reported", so it does not get the choropleth's vocabulary.
    const { container } = render(<DamageMap points={damagePointsFixture} />);

    expect(container.querySelector('[data-testid="choropleth-off"]')).not.toBeNull();
    expect(screen.queryByLabelText('Shade Districts by')).toBeNull();
  });
});

describe('the District choropleth (FR-2.7)', () => {
  const renderMap = () =>
    render(<DamageMap points={damagePointsFixture} districts={districtRowsFixture} />);

  it('shades the worst District darkest, so the ranking is readable at a glance', () => {
    const { container } = renderMap();

    expect(container.querySelector('[data-district="Sivasagar"]')?.getAttribute('data-band')).toBe(
      '5',
    );
    expect(container.querySelector('[data-district="Golaghat"]')?.getAttribute('data-band')).toBe(
      '3',
    );
  });

  it('keeps reported-nil, absent and shaded visually apart', () => {
    // The distinction the whole layer exists to protect (ADR-0005). Dhemaji
    // reported zero; Barpeta was never heard from; Sivasagar reported 144,461.
    const { container } = renderMap();

    expect(shadingOf(container, 'Dhemaji')).toBe('reported-nil');
    expect(shadingOf(container, 'Barpeta')).toBe('absent');
    expect(shadingOf(container, 'Sivasagar')).toBe('reported');

    const fills = ['Dhemaji', 'Barpeta', 'Sivasagar'].map((district) =>
      container.querySelector(`[data-district="${district}"]`)?.getAttribute('fill'),
    );
    expect(new Set(fills).size).toBe(3);
    // Absent and unknown are textures, not colours, so they survive greyscale.
    expect(fills[1]).toBe('url(#map-dots-absent)');
  });

  it('never lets a District that reported nothing look like one that reported nil', () => {
    const { container } = renderMap();

    const nil = container.querySelector('[data-district="Dhemaji"]');
    const absent = container.querySelector('[data-district="Barpeta"]');

    expect(nil?.getAttribute('fill')).not.toBe(absent?.getAttribute('fill'));
    // And neither is left blank — a blank District is what "fine" looks like.
    expect(absent?.getAttribute('fill')).not.toBe('none');
    expect(nil?.getAttribute('fill')).not.toBe('none');
  });

  it('makes every District’s figure reachable as text, not only as colour', () => {
    const { container } = renderMap();

    expect(
      container.querySelector('[data-district="Sivasagar"] title')?.textContent,
    ).toBe(
      'Sivasagar District: Population Affected 144,461 people (band 5 of 5, 120,000 – 150,000).',
    );
    expect(container.querySelector('[data-district="Dhemaji"] title')?.textContent).toBe(
      'Dhemaji District: Population Affected reported as nil.',
    );
    // Reachable twice over: in the path's own title, and in the hidden list.
    expect(
      screen.getAllByText('Barpeta District: no report in this bulletin.').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('prints the numeric bands in the legend (NFR-8)', () => {
    renderMap();

    expect(screen.getByText(/above 0 – 30,000/)).toBeTruthy();
    expect(screen.getAllByText(/120,000 – 150,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reported nil — the District reported, and the figure is zero/))
      .toBeTruthy();
    expect(screen.getByText(/No report in this bulletin — nobody has reported from here/))
      .toBeTruthy();
  });

  it('re-shades when the officer picks a different measure', async () => {
    const user = userEvent.setup();
    const { container } = renderMap();

    await user.selectOptions(screen.getByLabelText('Shade Districts by'), 'campInmates');

    expect(
      container.querySelector('[data-testid="damage-map-canvas"]')?.getAttribute('data-choropleth'),
    ).toBe('campInmates');
    expect(container.querySelector('[data-district="Sivasagar"] title')?.textContent).toContain(
      'Inmates in Relief Camps 11,204',
    );
  });

  it('says the shading stops at District, so an unshaded Revenue Circle means nothing', () => {
    renderMap();

    expect(
      screen.getByText(/Revenue Circle boundaries are not published as open data/),
    ).toBeTruthy();
  });

  it('does not draw rivers and says so rather than approximating one', () => {
    renderMap();

    expect(screen.getByText(/No rivers are drawn/)).toBeTruthy();
    expect(screen.getByText(/the Brahmaputra is absent rather than approximated/)).toBeTruthy();
  });

  it('attributes the boundary data beside the map', () => {
    const { container } = renderMap();

    expect(
      container.querySelector('[data-testid="boundary-attribution"]')?.textContent,
    ).toMatch(/Census of India 2011.*DataMeet.*CC BY 4\.0/s);
  });

  it('names a reporting District it cannot place rather than dropping it', () => {
    const rows = [
      ...districtRowsFixture,
      { ...districtRowsFixture[0], district: 'Bajali', rank: 5 },
    ];
    const { container } = render(<DamageMap points={damagePointsFixture} districts={rows} />);

    expect(
      container.querySelector('[data-testid="districts-without-boundary"]')?.textContent,
    ).toContain('Bajali');
  });
});
