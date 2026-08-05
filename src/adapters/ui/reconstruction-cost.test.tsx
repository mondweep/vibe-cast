/**
 * The Reconstruction Cost view.
 *
 * Every figure here is constructed, so these assert the controls that stop one
 * being read as published: the warning precedes the number, the range is never
 * collapsed, each derivation input declares whether it is published or assumed,
 * and no policy cost can be read without its effect on future risk.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ReconstructionCost } from './reconstruction-cost';
import { periodSummaryFixture } from './test-fixtures';

afterEach(cleanup);

const renderSummary = () =>
  render(<ReconstructionCost replacement={periodSummaryFixture.replacement} />);

describe('ReconstructionCost — a constructed figure must not read as a published one', () => {
  it('warns before the number, not after it', () => {
    // A reader who takes only the headline should have had to pass the warning
    // to reach it. Ordering is the control here, not wording.
    const { container } = renderSummary();

    const warning = container.querySelector('[data-constructed-warning]');
    const total = container.querySelector('[data-replacement-total]');
    expect(warning).not.toBeNull();
    expect(total).not.toBeNull();
    expect(warning!.compareDocumentPosition(total!) & Node.DOCUMENT_POSITION_FOLLOWING).
      toBeTruthy();
  });

  it('shows a range and never a bare central figure', () => {
    // ADR-0014 bans point estimates for constructed figures. The central value
    // may appear, but only alongside the bounds it sits between.
    const { container } = renderSummary();

    const total = container.querySelector('[data-replacement-total]') as HTMLElement;
    expect(total.textContent).toContain('₹29,70,91,326');
    expect(total.textContent).toContain('₹1,36,41,62,420');
    expect(total.textContent).toMatch(/central/);
  });

  it('says what share of the answer is judgement', () => {
    renderSummary();

    expect(screen.getByText(/169% of this answer is our judgement/)).toBeTruthy();
  });

  it('marks each input as published or assumed, and never leaves it ambiguous', () => {
    const { container } = renderSummary();

    const rows = container.querySelectorAll('[data-derivation-input]');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const published = row.querySelector('[data-input-kind="published"]');
      const assumed = row.querySelector('[data-input-kind="assumed"]');
      // Exactly one. An input that is neither has escaped ADR-0014 entirely.
      expect(Boolean(published) !== Boolean(assumed)).toBe(true);
    }
  });

  it('prints the range and the reason for every assumption', () => {
    const { container } = renderSummary();

    const row = container.querySelector(
      '[data-derivation-input="Floor area of a replaced dwelling"]',
    ) as HTMLElement;
    expect(row.textContent).toContain('20–45');
    expect(row.textContent).toMatch(/PMAY-G/);
  });

  it('renders the Kuccha refusal rather than leaving a blank', () => {
    const { container } = renderSummary();

    const notCosted = container.querySelector('[data-not-costed]') as HTMLElement;
    expect(notCosted.textContent).toMatch(/cannot be priced from this schedule/i);
    expect(notCosted.textContent).toMatch(/bamboo, timber and thatch/);
  });
});

describe('ReconstructionCost — what to rebuild', () => {
  it('shows all three policies, never one', () => {
    // A selector would let the cheapest be chosen without ever seeing what the
    // alternatives cost, or what they cost in future risk.
    const { container } = renderSummary();

    expect(container.querySelectorAll('[data-policy]')).toHaveLength(3);
    expect(container.querySelector('[data-policy="like-for-like"]')).not.toBeNull();
    expect(container.querySelector('[data-policy="build-back-better"]')).not.toBeNull();
  });

  it('never shows a policy cost without its effect on future risk', () => {
    // The load-bearing assertion in this panel. Money alone makes the cheapest
    // look best, and the cheapest is the one that rebuilds the vulnerability.
    const { container } = renderSummary();

    for (const row of container.querySelectorAll('[data-policy]')) {
      const key = row.getAttribute('data-policy');
      expect(row.querySelector(`[data-policy-total="${key}"]`)).not.toBeNull();
      expect(row.querySelector(`[data-policy-risk="${key}"]`)).not.toBeNull();
    }
  });

  it('says like-for-like would let the same flood destroy them again', () => {
    const { container } = renderSummary();

    const risk = container.querySelector('[data-policy-risk="like-for-like"]') as HTMLElement;
    expect(risk.textContent).toMatch(/destroy them again/);
  });

  it('marks a policy total as a floor when dwellings could not be priced', () => {
    const { container } = renderSummary();

    const floored = container.querySelector('[data-policy-total="protect-in-place"]') as HTMLElement;
    expect(floored.textContent).toMatch(/at least/);

    const complete = container.querySelector(
      '[data-policy-total="build-back-better"]',
    ) as HTMLElement;
    expect(complete.textContent).not.toMatch(/at least/);
  });

  it('leads with the Kuccha share, because it is why the choice matters', () => {
    renderSummary();

    expect(screen.getByText(/91% of the dwellings destroyed outright were/)).toBeTruthy();
  });

  it('does not let the fully-costable policy read as the best-evidenced one', () => {
    const { container } = renderSummary();

    const caveat = container.querySelector(
      '[data-policy-caveat="protect-in-place"]',
    ) as HTMLElement;
    expect(caveat.textContent).toMatch(/raised plinths beneath them ARE priced/);
  });
});
