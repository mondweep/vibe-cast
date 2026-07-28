/**
 * Which view the URL is pointing at.
 *
 * Officers share links. "Look at the Trend view" is a worse instruction than a
 * URL that opens on it, and a console whose address never changes cannot be
 * pointed at anything.
 *
 * Path-based rather than hash-based: `netlify.toml` already serves
 * `/index.html` for every path (ADR-0007), so a deep link is a real URL an
 * officer can paste into a message, and it is the one a browser will show in
 * the address bar. Hand-rolled over the History API rather than pulling in a
 * router — seven static routes and no nesting do not justify a dependency, and
 * ADR-0008's reasoning against adding one for the map applies here too.
 *
 * Slugs are written for a human reading the URL, not derived from the internal
 * keys: `/cumulative-and-peak` says what it is where `/period` does not. That
 * makes them a published contract — a slug that ships is a link somebody may
 * have sent to a colleague, so change one only with a redirect for the old.
 */

import { CONSOLE_VIEWS, type ConsoleViewKey } from './view-models';

export const ROUTE_SLUGS: Readonly<Record<ConsoleViewKey, string>> = {
  situation: 'situation',
  ranking: 'district-ranking',
  capacity: 'response-capacity',
  map: 'damage-map',
  scenario: 'scenario-planner',
  trend: 'trend',
  period: 'cumulative-and-peak',
};

/** The view shown at `/`, and where an unrecognised path lands. */
export const DEFAULT_VIEW: ConsoleViewKey = 'situation';

const BY_SLUG: ReadonlyMap<string, ConsoleViewKey> = new Map(
  (Object.entries(ROUTE_SLUGS) as [ConsoleViewKey, string][]).map(([key, slug]) => [slug, key]),
);

/** `/damage-map` → `'map'`. An unknown or empty path falls back to the default. */
export const viewFromPath = (pathname: string): ConsoleViewKey => {
  const slug = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  return BY_SLUG.get(slug) ?? DEFAULT_VIEW;
};

/**
 * `'map'` → `/damage-map`.
 *
 * The default view keeps the bare root: an officer who has navigated nowhere
 * should be able to share the address they were given, not `/situation`.
 */
export const pathForView = (view: ConsoleViewKey): string =>
  view === DEFAULT_VIEW ? '/' : `/${ROUTE_SLUGS[view]}`;

/** Every route, for tests and for anyone documenting the deep links. */
export const ALL_ROUTES: readonly { readonly view: ConsoleViewKey; readonly path: string }[] =
  CONSOLE_VIEWS.map((view) => ({ view: view.key, path: pathForView(view.key) }));
