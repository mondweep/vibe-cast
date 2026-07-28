import { describe, expect, it } from 'vitest';
import {
  ALL_ROUTES,
  DEFAULT_VIEW,
  ROUTE_SLUGS,
  pathForView,
  viewFromPath,
} from './console-route';
import { CONSOLE_VIEWS } from './view-models';

describe('console routes', () => {
  it('gives every view a URL, so any of them can be linked to', () => {
    // The point of the feature: a colleague can be sent straight to the view
    // being discussed. A view with no route is one that cannot be shared.
    for (const view of CONSOLE_VIEWS) {
      expect(ROUTE_SLUGS[view.key]).toBeTruthy();
    }
    expect(ALL_ROUTES).toHaveLength(CONSOLE_VIEWS.length);
  });

  it('round-trips every view through its path', () => {
    for (const view of CONSOLE_VIEWS) {
      expect(viewFromPath(pathForView(view.key))).toBe(view.key);
    }
  });

  it('uses slugs a human can read, not the internal keys', () => {
    // '/period' tells a reader nothing; '/cumulative-and-peak' tells them what
    // they will land on before they click.
    expect(pathForView('period')).toBe('/cumulative-and-peak');
    expect(pathForView('map')).toBe('/damage-map');
    expect(pathForView('scenario')).toBe('/scenario-planner');
    expect(pathForView('trend')).toBe('/trend');
  });

  it('keeps the bare root for the default view', () => {
    // Someone who has navigated nowhere should be able to share the address
    // they were given, rather than a redundant '/situation'.
    expect(pathForView(DEFAULT_VIEW)).toBe('/');
    expect(viewFromPath('/')).toBe(DEFAULT_VIEW);
    expect(viewFromPath('')).toBe(DEFAULT_VIEW);
  });

  it('tolerates the ways a URL actually arrives — trailing slash, case, no slash', () => {
    expect(viewFromPath('/trend/')).toBe('trend');
    expect(viewFromPath('trend')).toBe('trend');
    expect(viewFromPath('/TREND')).toBe('trend');
    expect(viewFromPath('/Damage-Map')).toBe('map');
  });

  it('falls back to the default rather than a blank screen on an unknown path', () => {
    // Netlify serves index.html for every path, so a typo or a stale link
    // reaches the app. It must land somewhere useful.
    expect(viewFromPath('/nonsense')).toBe(DEFAULT_VIEW);
    expect(viewFromPath('/trends')).toBe(DEFAULT_VIEW);
  });

  it('has no duplicate slugs', () => {
    const slugs = Object.values(ROUTE_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
