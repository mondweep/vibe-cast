import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useConsoleRoute } from './use-console-route';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

const at = (path: string) => window.history.replaceState({}, '', path);

describe('useConsoleRoute', () => {
  it('opens on the view named in the URL, so a shared link lands where it says', () => {
    at('/cumulative-and-peak');

    const { result } = renderHook(() => useConsoleRoute());

    expect(result.current.activeView).toBe('period');
  });

  it('puts the chosen view in the address bar, so the URL can be copied', () => {
    const { result } = renderHook(() => useConsoleRoute());

    act(() => result.current.selectView('trend'));

    expect(window.location.pathname).toBe('/trend');
    expect(result.current.activeView).toBe('trend');
  });

  it('returns the default view to the bare root', () => {
    at('/trend');
    const { result } = renderHook(() => useConsoleRoute());

    act(() => result.current.selectView('situation'));

    expect(window.location.pathname).toBe('/');
  });

  it('follows Back and Forward', () => {
    // Without the popstate listener the address would change while the view
    // did not — worse than having no routing at all.
    const { result } = renderHook(() => useConsoleRoute());

    act(() => result.current.selectView('trend'));
    act(() => result.current.selectView('period'));
    expect(result.current.activeView).toBe('period');

    act(() => {
      window.history.replaceState({}, '', '/trend');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.activeView).toBe('trend');
  });

  it('does not stack a history entry when the current view is re-selected', () => {
    // Otherwise Back stops meaning "the view before this one" and starts
    // meaning "however many times they tapped the same item".
    const { result } = renderHook(() => useConsoleRoute());
    act(() => result.current.selectView('trend'));
    const length = window.history.length;

    act(() => result.current.selectView('trend'));

    expect(window.history.length).toBe(length);
    expect(window.location.pathname).toBe('/trend');
  });

  it('lands on the default view for an unknown path rather than showing nothing', () => {
    at('/no-such-view');

    const { result } = renderHook(() => useConsoleRoute());

    expect(result.current.activeView).toBe('situation');
  });
});
