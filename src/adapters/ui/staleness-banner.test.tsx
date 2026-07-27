/**
 * The banner is the only thing standing between an officer and a four-month-old
 * bulletin that looks exactly as authoritative as this morning's. So it is
 * tested the way a safety control is tested: for what it says in words, not for
 * how it is styled.
 *
 * NFR-8 runs through every case — the level must be legible with the stylesheet
 * thrown away, which is what asserting on text rather than class names checks.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { StalenessBanner } from './staleness-banner';
import type { BulletinAgeViewModel } from './view-models';

afterEach(cleanup);

const anAge = (overrides: Partial<BulletinAgeViewModel> = {}): BulletinAgeViewModel => ({
  level: 'current',
  ageDays: 0,
  reportDate: '2026-07-27',
  asOf: '2026-07-27',
  datedInFuture: false,
  safeForCurrentDecisions: true,
  origin: 'loaded',
  ...overrides,
});

const banner = () => screen.getByTestId('staleness-banner');

describe('StalenessBanner', () => {
  describe('states the age in plain words', () => {
    it('says how many days old the bulletin is', () => {
      render(
        <StalenessBanner age={anAge({ level: 'stale', ageDays: 34, safeForCurrentDecisions: false })} />,
      );
      expect(within(banner()).getByText(/This bulletin is 34 days old/)).toBeTruthy();
    });

    it('says one day, not 1 days', () => {
      render(<StalenessBanner age={anAge({ level: 'current', ageDays: 1 })} />);
      expect(within(banner()).getByText(/This bulletin is 1 day old/)).toBeTruthy();
    });

    it('says today rather than "0 days old"', () => {
      render(<StalenessBanner age={anAge({ ageDays: 0 })} />);
      expect(within(banner()).getByText(/is today’s bulletin/)).toBeTruthy();
    });

    it('names the bulletin date in words an officer can match to the PDF', () => {
      render(<StalenessBanner age={anAge({ ageDays: 34, level: 'obsolete', safeForCurrentDecisions: false })} />);
      expect(within(banner()).getByText(/27 July 2026/)).toBeTruthy();
    });
  });

  describe('never colour alone (NFR-8)', () => {
    it('names the level in words at every level', () => {
      const levels: readonly [BulletinAgeViewModel['level'], string][] = [
        ['current', 'Current'],
        ['ageing', 'Ageing'],
        ['stale', 'Stale'],
        ['obsolete', 'Out of date'],
        ['unknown', 'Age not known'],
      ];
      for (const [level, label] of levels) {
        cleanup();
        render(<StalenessBanner age={anAge({ level, safeForCurrentDecisions: level === 'current' })} />);
        expect(within(banner()).getByTestId('staleness-level').textContent).toContain(label);
      }
    });

    it('pairs the level with a shape, and hides the shape from screen readers', () => {
      render(<StalenessBanner age={anAge({ level: 'stale', ageDays: 9, safeForCurrentDecisions: false })} />);
      const mark = within(banner()).getByTestId('staleness-mark');
      expect(mark.textContent?.length).toBeGreaterThan(0);
      expect(mark.getAttribute('aria-hidden')).toBe('true');
    });

    it('gives a different shape to each level, so greyscale still separates them', () => {
      const marks = new Set<string>();
      for (const level of ['current', 'ageing', 'stale', 'obsolete', 'unknown'] as const) {
        cleanup();
        render(<StalenessBanner age={anAge({ level })} />);
        marks.add(within(banner()).getByTestId('staleness-mark').textContent ?? '');
      }
      expect(marks.size).toBe(5);
    });

    it('carries the level as data, not only as a class name', () => {
      render(<StalenessBanner age={anAge({ level: 'obsolete', ageDays: 400, safeForCurrentDecisions: false })} />);
      expect(banner().getAttribute('data-level')).toBe('obsolete');
    });
  });

  describe('escalation', () => {
    it('does not tell an officer to stop using a current bulletin', () => {
      render(<StalenessBanner age={anAge({ level: 'current', ageDays: 1 })} />);
      expect(within(banner()).queryByText(/not.*current decisions/i)).toBeNull();
    });

    it('does not tell an officer to stop using an ageing bulletin, but says it has moved', () => {
      render(<StalenessBanner age={anAge({ level: 'ageing', ageDays: 3 })} />);
      expect(within(banner()).queryByText(/not.*current decisions/i)).toBeNull();
      expect(within(banner()).getByText(/Load the latest Daily Flood Report/)).toBeTruthy();
    });

    it('says plainly at stale that the figures must not drive a current decision', () => {
      render(
        <StalenessBanner age={anAge({ level: 'stale', ageDays: 9, safeForCurrentDecisions: false })} />,
      );
      expect(
        within(banner()).getByText(/Do not use these figures for current decisions/),
      ).toBeTruthy();
    });

    it('says the same at obsolete', () => {
      render(
        <StalenessBanner age={anAge({ level: 'obsolete', ageDays: 120, safeForCurrentDecisions: false })} />,
      );
      expect(
        within(banner()).getByText(/Do not use these figures for current decisions/),
      ).toBeTruthy();
    });

    it('is announced as an alert once the figures should not be used', () => {
      render(
        <StalenessBanner age={anAge({ level: 'stale', ageDays: 9, safeForCurrentDecisions: false })} />,
      );
      expect(banner().getAttribute('role')).toBe('alert');
    });

    it('is announced only as status while the bulletin is usable', () => {
      render(<StalenessBanner age={anAge({ level: 'ageing', ageDays: 2 })} />);
      expect(banner().getAttribute('role')).toBe('status');
    });
  });

  describe('the bundled sample reads differently from a bulletin the officer loaded', () => {
    const sample = (overrides: Partial<BulletinAgeViewModel> = {}) =>
      anAge({ origin: 'bundled-sample', ageDays: 34, level: 'obsolete', safeForCurrentDecisions: false, ...overrides });

    it('frames the bundled bulletin as a worked example', () => {
      render(<StalenessBanner age={sample()} />);
      expect(
        within(banner()).getByText(/so you can see the console working/),
      ).toBeTruthy();
      expect(within(banner()).getByText(/Load today’s bulletin for live figures/)).toBeTruthy();
    });

    it('does not claim the officer loaded it', () => {
      render(<StalenessBanner age={sample()} />);
      expect(within(banner()).queryByText(/You loaded/)).toBeNull();
      expect(banner().getAttribute('data-origin')).toBe('bundled-sample');
    });

    it('says a loaded bulletin was loaded, which is a different situation', () => {
      render(
        <StalenessBanner age={anAge({ origin: 'loaded', ageDays: 34, level: 'obsolete', safeForCurrentDecisions: false })} />,
      );
      expect(within(banner()).getByText(/You loaded this bulletin/)).toBeTruthy();
      expect(within(banner()).queryByText(/so you can see the console working/)).toBeNull();
      expect(banner().getAttribute('data-origin')).toBe('loaded');
    });

    it('still frames the sample as an example even on the day it was issued', () => {
      // Someone opening the console on 27 July 2026 must still be told these
      // are bundled figures, not a live feed. Freshness is not provenance.
      render(<StalenessBanner age={sample({ ageDays: 0, level: 'current', safeForCurrentDecisions: true })} />);
      expect(within(banner()).getByText(/so you can see the console working/)).toBeTruthy();
    });
  });

  describe('when the age is not knowable (ADR-0005)', () => {
    it('says the age is not known rather than showing zero days', () => {
      render(
        <StalenessBanner
          age={anAge({ level: 'unknown', ageDays: undefined, safeForCurrentDecisions: false })}
        />,
      );
      expect(within(banner()).getByText(/could not be established/)).toBeTruthy();
      expect(within(banner()).queryByText(/0 days old/)).toBeNull();
      expect(within(banner()).queryByText(/is today’s bulletin/)).toBeNull();
    });

    it('invents no date when the bulletin carries none', () => {
      render(
        <StalenessBanner
          age={anAge({
            level: 'unknown',
            ageDays: undefined,
            reportDate: undefined,
            asOf: undefined,
            safeForCurrentDecisions: false,
          })}
        />,
      );
      expect(within(banner()).getByText(/no readable date/)).toBeTruthy();
      expect(within(banner()).queryByText(/2026/)).toBeNull();
    });

    it('warns against using figures it cannot vouch for', () => {
      render(
        <StalenessBanner
          age={anAge({ level: 'unknown', ageDays: undefined, safeForCurrentDecisions: false })}
        />,
      );
      expect(
        within(banner()).getByText(/Do not use these figures for current decisions/),
      ).toBeTruthy();
    });
  });

  describe('a bulletin dated ahead of the clock', () => {
    it('says so rather than silently showing zero days', () => {
      render(<StalenessBanner age={anAge({ ageDays: 0, datedInFuture: true })} />);
      expect(within(banner()).getByText(/dated ahead of this computer’s clock/)).toBeTruthy();
    });

    it('says nothing of the sort when the dates agree', () => {
      render(<StalenessBanner age={anAge({ ageDays: 0, datedInFuture: false })} />);
      expect(within(banner()).queryByText(/dated ahead/)).toBeNull();
    });
  });
});
