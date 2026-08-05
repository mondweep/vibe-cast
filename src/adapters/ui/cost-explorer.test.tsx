/**
 * The Cost Explorer view.
 *
 * A chart can mislead in ways prose cannot, so these assert the specific
 * failures available to this screen: a combined total appearing because bars
 * stack, an interval collapsing to a point because a bar has one length, a
 * policy cost readable without its risk effect, and a compensation comparison
 * drawn without the denominators that explain it.
 *
 * The controls are asserted by their EFFECT on rendered figures rather than by
 * their existence — a radio that changes nothing is worse than no radio.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CostExplorer } from './cost-explorer';
import { askSeries } from './cost-explorer-data';
import { periodSummaryFixture } from './test-fixtures';

afterEach(cleanup);

const replacement = periodSummaryFixture.replacement;

const renderExplorer = () => render(<CostExplorer replacement={replacement} chartWidth={640} />);

describe('CostExplorer — the executive summary carries every heading', () => {
  it('states the scale of the model before any figure', () => {
    const { container } = renderExplorer();
    const exec = container.querySelector('[data-explorer-exec]') as HTMLElement;

    expect(exec).not.toBeNull();
    expect(exec.textContent).toContain(String(replacement.executive.publishedRateCount));
    expect(exec.textContent).toContain(String(replacement.executive.assumptionCount));
    expect(exec.textContent).toContain(`${replacement.judgementSharePercent}%`);
  });

  it('shows every headline data point as a stat', () => {
    // The set is the contract: dropping one silently is how a summary stops
    // summarising. Named individually rather than counted, so a rename fails
    // loudly instead of a count staying coincidentally correct.
    renderExplorer();

    for (const id of [
      'dwellings',
      'households',
      'per-dwelling',
      'plinth',
      'ask-dwellings',
      'ask-micro',
      'ask-macro',
      'benchmark',
      'concentration',
    ]) {
      expect(document.querySelector(`[data-stat="${id}"]`)).not.toBeNull();
    }
  });

  it('discloses that the household count rests on an assumed household size', () => {
    // Every household figure on the page divides by this one number.
    const { container } = renderExplorer();
    const stat = container.querySelector('[data-stat="households"]') as HTMLElement;

    expect(stat.textContent).toMatch(/assumed/);
    expect(stat.textContent).toContain(String(replacement.benchmark.householdSize));
  });

  it('says there is no total and why, on a page of charts', () => {
    // Charts invite stacking. The refusal has to be louder here than on the
    // document view, not quieter.
    const { container } = renderExplorer();
    const note = container.querySelector('[data-explorer-no-total]') as HTMLElement;

    expect(note.textContent).toMatch(/no total/i);
    expect(note.textContent).toMatch(/double-count/);
  });

  it('carries the three quoting caveats', () => {
    const { container } = renderExplorer();
    const caveats = container.querySelector('[data-explorer-caveats]') as HTMLElement;

    expect(caveats.textContent).toMatch(/no year anywhere/);
    expect(caveats.textContent).toMatch(/expired on 31 March 2026/);
    expect(caveats.textContent).toMatch(/Railways/);
  });
});

describe('CostExplorer — the charts actually draw', () => {
  it('renders real SVG geometry for every chart, not an empty container', () => {
    // Recharts renders nothing when it cannot measure its container. Without
    // this the whole view would still pass its other tests on the tables alone,
    // and ship a page of blank boxes.
    const { container } = renderExplorer();
    const charts = container.querySelectorAll('[data-chart]');

    expect(charts.length).toBeGreaterThanOrEqual(5);
    for (const chart of charts) {
      expect(chart.querySelector('svg')).not.toBeNull();
      expect(chart.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThan(0);
    }
    expect(container.querySelectorAll('[data-chart-empty]')).toHaveLength(0);
  });

  it('draws the central tick inside every band, not a bar rising from zero', () => {
    // The band shape draws a rect plus a vertical tick. A missing tick means
    // the reader sees a range with no indication of where the estimate sits;
    // a bar from zero would mean the geometry silently reverted to a point.
    const { container } = renderExplorer();
    const asks = container.querySelector('[data-chart="The three asks"]') as HTMLElement;

    const ticks = asks.querySelectorAll('.recharts-bar-rectangle line');
    expect(ticks.length).toBe(askSeries(replacement).length);
  });
});

describe('CostExplorer — intervals survive being drawn', () => {
  it('gives every charted line a low–high range, never a bare central', () => {
    const { container } = renderExplorer();
    const rows = container.querySelectorAll('[data-band-row]');

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // An en-dash between two rupee figures, and the central parenthesised —
      // the same shape the document view uses.
      expect(row.textContent).toMatch(/₹.*–.*₹/);
      expect(row.textContent).toMatch(/central/);
    }
  });

  it('charts the two tiers in separate panels', () => {
    // One chart holding both tiers would let a reader add them by eye, which
    // is the exact reading the model refuses to support.
    const { container } = renderExplorer();

    expect(container.querySelector('[data-explorer-tier="micro"]')).not.toBeNull();
    expect(container.querySelector('[data-explorer-tier="macro"]')).not.toBeNull();
  });

  it('states beneath the chart what was counted and not costed', () => {
    // A bar that is absent from a chart is invisible in a way an empty table
    // cell is not, so the omission has to be written out.
    const { container } = renderExplorer();
    const note = container.querySelector(
      '[data-explorer-uncosted="Bridges and culverts"]',
    ) as HTMLElement;

    expect(note).not.toBeNull();
    expect(note.textContent).toMatch(/Not on this chart/);
    expect(note.textContent).toMatch(/12 reported, no cost shown/);
  });

  it('draws no bridge band, since there is no figure to draw', () => {
    const { container } = renderExplorer();
    const bands = [...container.querySelectorAll('[data-band-row]')].map((r) =>
      r.getAttribute('data-band-row'),
    );

    expect(bands.some((label) => /bridge|culvert/i.test(label ?? ''))).toBe(false);
  });

  it('names what the public tier cannot see, beside the public tier', () => {
    const { container } = renderExplorer();
    const gap = container.querySelector('[data-explorer-macro-gap]');

    if (replacement.macro.notCovered !== '') {
      expect(gap?.textContent).toMatch(/Not in this total/);
    }
  });
});

describe('CostExplorer — a policy cost is never readable without its risk effect', () => {
  it('warns that the cheapest policy rebuilds the vulnerability', () => {
    const { container } = renderExplorer();
    const warning = container.querySelector('[data-explorer-policy-warning]') as HTMLElement;

    expect(warning.textContent).toMatch(/cheapest policy is the one that rebuilds/);
  });

  it('puts the risk effect in the policy table, not in a colour legend', () => {
    renderExplorer();
    const table = screen.getByLabelText('Reconstruction policies');

    for (const policy of replacement.policies) {
      if (policy.totalCentral === undefined) continue;
      const row = within(table).getByText(policy.label).closest('tr') as HTMLElement;
      expect(row.textContent).toContain(policy.riskEffect);
    }
  });
});

describe('CostExplorer — controls change the figures, not just the chrome', () => {
  it('re-expresses every cost when the denominator changes', () => {
    const { container } = renderExplorer();
    const before = container.querySelector('[data-band-row]')!.textContent;

    fireEvent.click(screen.getByLabelText('Per dwelling destroyed'));

    const after = container.querySelector('[data-band-row]')!.textContent;
    expect(after).not.toBe(before);
  });

  it('warns that normalising public infrastructure is a share-of-burden framing', () => {
    // Dividing money no household receives by a household count is a legitimate
    // way to express scale and an easy thing to misread as an entitlement.
    const { container } = renderExplorer();
    expect(container.querySelector('[data-explorer-normaliser-note]')).toBeNull();

    fireEvent.click(screen.getByLabelText('Per affected household'));

    const note = container.querySelector('[data-explorer-normaliser-note]') as HTMLElement;
    expect(note.textContent).toMatch(/share-of-burden/);
  });

  it('relabels the value column so a normalised figure cannot be read as a total', () => {
    renderExplorer();
    expect(screen.getAllByText('Cost range (central)').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Per dwelling destroyed'));

    expect(
      screen.getAllByText('Cost per dwelling destroyed (central)').length,
    ).toBeGreaterThan(0);
  });

  it('reorders the sensitivity chart when ranked by range width instead of money', () => {
    const { container } = renderExplorer();
    // Lift the top-N cap: truncated, the two rankings legitimately select
    // different assumptions, and this test is about ORDER not membership.
    fireEvent.click(screen.getByLabelText(`All ${replacement.assumptionRegister.length}`));
    const order = () =>
      [...container.querySelectorAll('[data-tornado-row]')].map((r) =>
        r.getAttribute('data-tornado-row'),
      );
    const bySwing = order();

    fireEvent.click(screen.getByLabelText('How wide its range is'));

    const bySpread = order();
    expect(bySpread).not.toEqual(bySwing);
    // Same assumptions, rearranged — not a different set.
    expect(new Set(bySpread)).toEqual(new Set(bySwing));
  });

  it('explains, on the page, why ranking by range width misleads', () => {
    const { container } = renderExplorer();

    fireEvent.click(screen.getByLabelText('How wide its range is'));

    const note = container.querySelector('[data-explorer-rank-note]') as HTMLElement;
    expect(note.textContent).toMatch(/misleading/);
    expect(note.textContent).toMatch(/only the .*order.* changes/i);
  });

  it('narrows the sensitivity chart to one figure when filtered', () => {
    const { container } = renderExplorer();
    // Lift the top-N cap first, so the comparison is against every assumption
    // rather than against a truncated eight that filtering might not shrink.
    fireEvent.click(screen.getByLabelText(`All ${replacement.assumptionRegister.length}`));
    const all = container.querySelectorAll('[data-tornado-row]').length;
    const target = replacement.assumptionRegister[0].affects;

    fireEvent.change(screen.getByLabelText('Assumptions feeding'), { target: { value: target } });

    const rows = [...container.querySelectorAll('[data-tornado-row]')];
    expect(rows.length).toBeLessThan(all);
    expect(rows.length).toBeGreaterThan(0);
    const table = screen.getByLabelText('Assumption sensitivity table');
    for (const row of within(table).getAllByRole('row').slice(1)) {
      expect(row.textContent).toContain(target);
    }
  });

  it('draws only the top few by default, and says how many it is hiding', () => {
    // Twenty bars is a three-thousand-pixel panel nobody reads to the bottom
    // of. Truncating is fine; truncating silently is not — an undisclosed cut
    // reads as a complete chart.
    const { container } = renderExplorer();
    const drawn = container.querySelectorAll('[data-tornado-row]').length;

    expect(drawn).toBeLessThan(replacement.assumptionRegister.length);

    const notice = container.querySelector('[data-explorer-truncation]') as HTMLElement;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain(String(replacement.assumptionRegister.length));
    expect(notice.textContent).toMatch(/not drawn/);
    expect(notice.textContent).toMatch(/truncates without saying so/);
  });

  it('drops the truncation notice once every assumption is drawn', () => {
    const { container } = renderExplorer();

    fireEvent.click(screen.getByLabelText(`All ${replacement.assumptionRegister.length}`));

    expect(container.querySelectorAll('[data-tornado-row]')).toHaveLength(
      replacement.assumptionRegister.length,
    );
    expect(container.querySelector('[data-explorer-truncation]')).toBeNull();
  });
});

describe('CostExplorer — the benchmark cannot be drawn without its denominators', () => {
  it('shows the household count each figure reaches', () => {
    renderExplorer();
    const table = screen.getByLabelText('Compensation benchmark table');

    expect(within(table).getByText('Households it reaches')).toBeTruthy();
    for (const cell of table.querySelectorAll('[data-benchmark-denominator]')) {
      expect(cell.textContent).not.toBe('—');
    }
  });

  it('keeps the caveat that the two answer different questions', () => {
    const { container } = renderExplorer();
    const caveat = container.querySelector('[data-explorer-benchmark-caveat]') as HTMLElement;

    expect(caveat.textContent).toMatch(/different questions/);
  });

  it('names the demand as a demand, never as an entitlement', () => {
    const { container } = renderExplorer();
    const source = container.querySelector('[data-explorer-benchmark-source]') as HTMLElement;

    expect(source.textContent).toMatch(/not an entitlement/);
  });
});
