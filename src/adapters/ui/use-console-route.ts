/**
 * The active view, kept in the address bar.
 *
 * Two directions, both required for a link to be worth sharing:
 *   - opening `/trend` starts on the Trend view;
 *   - choosing Trend makes the address `/trend`, so the URL an officer copies
 *     is the view they are looking at.
 *
 * Back and forward work because navigation goes through `pushState` and
 * `popstate` rather than being invented in component state. Without the
 * listener the address would change while the view did not, which is worse
 * than no routing at all.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ConsoleViewKey } from './view-models';
import { DEFAULT_VIEW, pathForView, viewFromPath } from './console-route';

export type ConsoleRoute = {
  readonly activeView: ConsoleViewKey;
  readonly selectView: (view: ConsoleViewKey) => void;
};

export const useConsoleRoute = (): ConsoleRoute => {
  const [activeView, setActiveView] = useState<ConsoleViewKey>(() =>
    // Guarded so the console still renders if it is ever mounted without a DOM
    // location — a server render, or a test that stubs the environment away.
    typeof window === 'undefined' ? DEFAULT_VIEW : viewFromPath(window.location.pathname),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPopState = () => setActiveView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectView = useCallback((view: ConsoleViewKey) => {
    setActiveView(view);
    if (typeof window === 'undefined') return;
    const path = pathForView(view);
    // Re-selecting the current view must not stack duplicate history entries,
    // or Back stops meaning "the view before this one".
    if (window.location.pathname === path) return;
    window.history.pushState({ view }, '', path);
  }, []);

  return { activeView, selectView };
};
