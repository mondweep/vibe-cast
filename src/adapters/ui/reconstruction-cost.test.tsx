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
    // Crore at this magnitude: see `money`. Thirteen digits of implied
    // precision on a constructed figure is false precision, not rigour.
    expect(total.textContent).toContain('₹29.7 cr');
    expect(total.textContent).toContain('₹136.4 cr');
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

describe('ReconstructionCost — compared with the compensation demand', () => {
  it('leads with the denominators, before either total', () => {
    // The load-bearing control on this panel. Two totals and no household
    // counts reads as "the demand is extravagant", when almost all of the
    // difference is that it reaches far more households than lost a house.
    const { container } = renderSummary();

    const denominators = container.querySelector('[data-benchmark-denominators]');
    const firstTotal = container.querySelector('[data-benchmark-row="demand-affected"]');
    expect(denominators).not.toBeNull();
    expect(
      denominators!.compareDocumentPosition(firstTotal!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says what share of the demand’s households did not lose a dwelling', () => {
    renderSummary();

    expect(screen.getByText(/did not lose their dwelling/)).toBeTruthy();
  });

  it('offers the demand at a common denominator, not only the headline total', () => {
    // Without this row the only available comparison is 147,000 households
    // against 3,494, which is not a comparison at all.
    const { container } = renderSummary();

    expect(container.querySelector('[data-benchmark-row="demand-destroyed"]')).not.toBeNull();
    expect(container.querySelector('[data-benchmark-row="reconstruction"]')).not.toBeNull();
  });

  it('states the per-household multiple as the fair single number', () => {
    const { container } = renderSummary();

    const multiple = container.querySelector('[data-benchmark-multiple]') as HTMLElement;
    expect(multiple.textContent).toMatch(/4\.4×/);
    expect(multiple.textContent).toMatch(/what rebuilding it costs/);
  });

  it('does not conclude the demand is too high', () => {
    // The console prices bricks. It has no standing to rule on what a household
    // should receive, and must not imply one by arithmetic.
    renderSummary();

    expect(screen.getByText(/not a finding that the demand is too high/)).toBeTruthy();
  });

  it('records the demand as a demand, never as a norm', () => {
    const { container } = renderSummary();

    const source = container.querySelector('[data-benchmark-source]') as HTMLElement;
    expect(source.textContent).toMatch(/not a published norm and not an entitlement/);
  });
});

describe('ReconstructionCost — how money is scaled', () => {
  it('keeps a per-dwelling figure exact to the rupee', () => {
    const { container } = renderSummary();

    const perUnit = container.querySelector('section[aria-labelledby="replacement-heading"]');
    expect(perUnit?.textContent).toContain('₹85,029');
  });

  it('shows an aggregate in crore rather than thirteen unreadable digits', () => {
    // ₹1,33,52,29,62,963 implies precision to the rupee on a figure derived
    // from an assumed household size. Crore is the honest unit at this scale.
    const { container } = renderSummary();

    const row = container.querySelector('[data-benchmark-row="demand-affected"]') as HTMLElement;
    expect(row.textContent).toMatch(/₹13,352 cr/);
    expect(row.textContent).not.toMatch(/₹1,33,52,29,62,963/);
  });

  it('keeps one decimal, so nearby crore figures stay distinguishable', () => {
    const { container } = renderSummary();

    const row = container.querySelector('[data-benchmark-row="reconstruction"]') as HTMLElement;
    expect(row.textContent).toMatch(/₹45\.5 cr/);
    expect(row.textContent).toMatch(/₹186\.7 cr/);
  });
});

describe('ReconstructionCost — the two recovery tiers', () => {
  it('renders household and public assets as separate tiers', () => {
    const { container } = renderSummary();

    expect(container.querySelector('[data-tier="micro"]')).not.toBeNull();
    expect(container.querySelector('[data-tier="macro"]')).not.toBeNull();
  });

  it('never renders a combined total across the two tiers', () => {
    // The load-bearing property. Each tier has its own subtotal and there is
    // no element carrying their sum, because a figure in which a road and a
    // family's home are interchangeable answers no question.
    const { container } = renderSummary();

    expect(container.querySelector('[data-tier-subtotal="micro"]')).not.toBeNull();
    expect(container.querySelector('[data-tier-subtotal="macro"]')).not.toBeNull();
    expect(container.querySelector('[data-combined-total]')).toBeNull();

    const combined = 485_000_000 + 518_000_000;
    expect(container.textContent).not.toContain(String(combined));
    expect(container.textContent).not.toContain('₹100.3 cr');
  });

  it('says in words why they are never one number', () => {
    const { container } = renderSummary();

    const note = container.querySelector('[data-tiers-never-summed]') as HTMLElement;
    expect(note.textContent).toMatch(/no combined total anywhere in this console/i);
    expect(note.textContent).toMatch(/interchangeable/);
  });

  it('says silt clearance is a precondition, not just another line', () => {
    renderSummary();

    expect(screen.getByText(/funded work that cannot start/)).toBeTruthy();
  });

  it('warns that the public rates buy restoration, not reconstruction', () => {
    const { container } = renderSummary();

    const scope = container.querySelector('[data-tier-scope="macro"]') as HTMLElement;
    expect(scope.textContent).toMatch(/RESTORATION figures, not reconstruction/);
  });

  it('declares the railway gap on the public tier', () => {
    const { container } = renderSummary();

    const gap = container.querySelector('[data-tier-not-covered="macro"]') as HTMLElement;
    expect(gap.textContent).toMatch(/four mention a railway/);
  });

  it('shows each line’s assumptions with their range and reason', () => {
    const { container } = renderSummary();

    const row = container.querySelector(
      '[data-tier-line="Agricultural land de-silting"]',
    ) as HTMLElement;
    expect(row.textContent).toMatch(/SUBMERGED IS NOT SILTED/);
    expect(row.textContent).toMatch(/\[0\.08–0\.4\]/);
  });
});

describe('ReconstructionCost — the executive summary', () => {
  it('comes before every detail panel', () => {
    // The whole point: a reader who stops after the first screen should still
    // have the scale, the method and the caveats.
    const { container } = renderSummary();

    const exec = container.querySelector('[data-executive]');
    const firstDetail = container.querySelector('section[aria-labelledby="replacement-heading"]');
    expect(exec).not.toBeNull();
    expect(
      exec!.compareDocumentPosition(firstDetail!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('states the method: published rates combined under our assumptions', () => {
    renderSummary();

    expect(screen.getByText(/9 published rates/)).toBeTruthy();
    expect(screen.getByText(/15 assumptions of ours/)).toBeTruthy();
  });

  it('gives the three asks with scale and range, never a bare figure', () => {
    const { container } = renderSummary();

    for (const row of ['dwellings', 'micro', 'macro']) {
      const el = container.querySelector(`[data-exec-row="${row}"]`) as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.textContent).toMatch(/₹.+–.+₹/);
    }
  });

  it('explains why there is no total row, rather than just omitting one', () => {
    // An absent total that is not explained reads as an oversight, and the
    // reader supplies the addition themselves.
    const { container } = renderSummary();

    const note = container.querySelector('[data-exec-no-total]') as HTMLElement;
    expect(note.textContent).toMatch(/deliberately no total row/i);
    expect(note.textContent).toMatch(/double-count/);
  });

  it('carries the three disqualifying caveats above the fold', () => {
    const { container } = renderSummary();

    const caveats = container.querySelector('[data-exec-caveats]') as HTMLElement;
    expect(caveats.textContent).toMatch(/states no year anywhere/);
    expect(caveats.textContent).toMatch(/expired on 31 March 2026/);
    expect(caveats.textContent).toMatch(/railways and National Highways are absent/i);
  });
});

describe('ReconstructionCost — the assumptions register', () => {
  it('ranks by rupee swing, not by how wide the range is', () => {
    // The correction that matters. Floor area has the NARROWEST range of the
    // three in the fixture (2.25x) and the largest effect (₹52.6 cr); road
    // length has the widest range (7.5x) and the smallest effect (₹5.1 cr).
    // Ranking by range would put them in exactly the wrong order and send a
    // reader to argue about the wrong number.
    const { container } = renderSummary();

    const rows = [...container.querySelectorAll('[data-assumption]')];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.getAttribute('data-assumption')).toMatch(/Floor area/);
    expect(rows[rows.length - 1]?.getAttribute('data-assumption')).toMatch(/damaged length/);
  });

  it('shows what each assumption is worth in rupees', () => {
    const { container } = renderSummary();

    const swing = container.querySelector(
      '[data-assumption-swing="Floor area of a replaced dwelling"]',
    ) as HTMLElement;
    expect(swing.textContent).toMatch(/₹52\.6 cr/);
  });

  it('explains that the two columns measure different things', () => {
    // A reader who sees "7.5x" with no explanation cannot use it, and a reader
    // who assumes it means rupees is misled.
    const { container } = renderSummary();

    const note = container.querySelector('[data-register-metrics]') as HTMLElement;
    expect(note.textContent).toMatch(/how unsure we are/);
    expect(note.textContent).toMatch(/what that uncertainty is actually worth/);
  });

  it('shows the range and the spread multiple for each', () => {
    const { container } = renderSummary();

    const row = container.querySelector(
      '[data-assumption="Average damaged length per reported road"]',
    ) as HTMLElement;
    expect(row.textContent).toMatch(/0\.2–1\.5/);
    expect(row.textContent).toMatch(/7\.5×/);
  });

  it('names which figure each assumption feeds', () => {
    const { container } = renderSummary();

    const row = container.querySelector(
      '[data-assumption="Share of submerged land carrying a clearable deposit"]',
    ) as HTMLElement;
    expect(row.textContent).toMatch(/Agricultural land de-silting/);
  });

  it('says the register is walked, not maintained by hand', () => {
    renderSummary();

    expect(screen.getByText(/an incomplete register is worse than none/)).toBeTruthy();
  });
});
