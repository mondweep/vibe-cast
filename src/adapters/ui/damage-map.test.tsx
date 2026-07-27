import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DamageMap,
  clusterPoints,
  projectLatitude,
  projectLongitude,
} from './damage-map';
import { damagePointsFixture } from './test-fixtures';

afterEach(cleanup);

const markers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-cluster-size]'));

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
