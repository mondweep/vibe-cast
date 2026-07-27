import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SituationSummary } from './situation-summary';
import { populationProvenance, summaryFixture } from './test-fixtures';

afterEach(cleanup);

describe('SituationSummary — the headline gap', () => {
  it('renders the derived gap with the same visual weight as the reported total', () => {
    const { container } = render(<SituationSummary summary={summaryFixture} />);

    const reported = container.querySelector('[data-headline="reported"]');
    const gap = container.querySelector('[data-headline="derived-gap"]');

    expect(reported?.textContent).toBe('445,495');
    expect(gap?.textContent).toBe('365,023');

    // Same class, therefore same type size and treatment; and siblings in the
    // same grid, therefore the same tile — the gap is not a sub-figure.
    expect(gap?.className).toBe(reported?.className);
    expect(reported?.closest('.headline__tile')?.parentElement).toBe(
      gap?.closest('.headline__tile')?.parentElement,
    );
    // ...and nothing inline shrinks or fades it. The only difference the
    // stylesheet is allowed to make is colour.
    expect(gap?.getAttribute('style')).toBeNull();
    expect(reported?.getAttribute('style')).toBeNull();
    expect(
      (gap as HTMLElement).tagName === (reported as HTMLElement).tagName,
    ).toBe(true);
  });

  it('keeps the two tiles interchangeable when the band stacks on a phone', () => {
    // Below 1100px `.headline` becomes one column and 365,023 sits *under*
    // 445,495 rather than beside it. Stacking is the moment "the second one"
    // starts looking like a footnote, so the markup must give the stylesheet
    // no way to treat them differently: same element, same classes, same
    // depth, same order of children.
    const { container } = render(<SituationSummary summary={summaryFixture} />);

    const tiles = [...container.querySelectorAll('.headline__tile')];
    expect(tiles).toHaveLength(2);

    const [reportedTile, gapTile] = tiles as [HTMLElement, HTMLElement];
    expect(reportedTile.tagName).toBe(gapTile.tagName);
    expect(reportedTile.getAttribute('style')).toBeNull();
    expect(gapTile.getAttribute('style')).toBeNull();

    // The only class either tile has that the other lacks is its own modifier.
    const shared = ['headline__tile'];
    expect([...reportedTile.classList].filter((c) => !c.endsWith('--reported'))).toEqual(shared);
    expect([...gapTile.classList].filter((c) => !c.endsWith('--gap'))).toEqual(shared);

    // Same skeleton in the same order: heading, figure, caption, meta. Neither
    // tile is a reduced version of the other.
    const skeleton = (tile: HTMLElement) =>
      [...tile.children].map((child) => `${child.tagName}.${child.className}`);
    expect(skeleton(gapTile)).toEqual(skeleton(reportedTile));

    // And the figure itself is the same element with the same class in both,
    // which is what makes --fs-hero apply to 365,023 exactly as it does to
    // 445,495 at every viewport (FR-2.1).
    const value = (tile: HTMLElement) =>
      tile.querySelector('.headline__value') as HTMLElement | null;
    expect(value(gapTile)?.tagName).toBe(value(reportedTile)?.tagName);
    expect(value(gapTile)?.className).toBe(value(reportedTile)?.className);
    expect(value(gapTile)?.parentElement?.className).toBe(
      value(reportedTile)?.parentElement?.className.replace('--reported', '--gap'),
    );
  });

  it('puts the gap in the first screenful, not below the fold', () => {
    const { container } = render(<SituationSummary summary={summaryFixture} />);

    // The headline band is the first thing in the content well, and both
    // tiles are in it — a District Commissioner does not scroll to find 365,023.
    const first = container.firstElementChild?.firstElementChild;
    expect(first?.getAttribute('aria-label')).toBe('Headline figures');
    expect(first?.querySelectorAll('[data-headline]')).toHaveLength(2);
  });

  it('states the gap as a share of the affected population', () => {
    render(<SituationSummary summary={summaryFixture} />);

    expect(screen.getByText('81.9%')).toBeTruthy();
  });

  it("names the gap in ASDMA's vocabulary, not a softened paraphrase", () => {
    render(<SituationSummary summary={summaryFixture} />);

    expect(
      screen.getByRole('heading', {
        name: 'Not in any Relief Camp or Relief Distribution Centre',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /365,023 people affected but not in any Relief Camp or Relief Distribution Centre/,
      ),
    ).toBeTruthy();
  });

  it('shows the gap as derived, with its formula, so it cannot be read as ASDMA reporting', async () => {
    const user = userEvent.setup();
    const { container } = render(<SituationSummary summary={summaryFixture} />);

    const gapTile = container.querySelector('.headline__tile--gap') as HTMLElement;
    const badge = within(gapTile).getByRole('button', { name: /Derived — not an ASDMA figure/ });

    await user.click(badge);

    const detail = document.getElementById(badge.getAttribute('aria-describedby') ?? '');
    expect(detail?.textContent).toContain('Affected Population − Inmates − Non-Camp Inmates');
    expect(detail?.textContent).toContain('445,495 − 28,695 − 51,777 = 365,023');
  });
});

describe('SituationSummary — the rest of the picture', () => {
  it('splits the affected population across camps, distribution centres and the gap', () => {
    const { container } = render(<SituationSummary summary={summaryFixture} />);

    const bar = container.querySelector('.split-bar') as HTMLElement;
    const segments = Array.from(bar.querySelectorAll('[data-segment]'));

    expect(segments.map((node) => node.getAttribute('data-segment'))).toEqual([
      'camp-inmates',
      'non-camp-inmates',
      'unsheltered',
    ]);
    // Proportion is carried by width, but the accessible name carries the
    // numbers too — the bar is never the only channel (NFR-8).
    expect(bar.getAttribute('aria-label')).toContain('Unsheltered Affected: 365,023, 81.9%');
  });

  it("renders ASDMA's reported figures with their own units", () => {
    render(<SituationSummary summary={summaryFixture} />);

    expect(screen.getByText('631')).toBeTruthy();
    expect(screen.getByText('37,139.52 Hect.')).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();
    expect(screen.getByText('94')).toBeTruthy();
  });

  it('lists the derived decision metrics separately from reported ones', () => {
    render(<SituationSummary summary={summaryFixture} />);

    const panel = screen
      .getByRole('heading', { name: /Derived decision metrics/ })
      .closest('section') as HTMLElement;

    expect(within(panel).getByText('6.4 %')).toBeTruthy();
    expect(within(panel).getByText('6.9 days')).toBeTruthy();
    expect(within(panel).getByText('319 per Relief Camp')).toBeTruthy();
  });

  it('attributes river status to CWC rather than restating it as ours', () => {
    render(<SituationSummary summary={summaryFixture} />);

    expect(screen.getByText('CWC bulletin issued 08:00')).toBeTruthy();
    expect(screen.getByText('Dhansiri (S) at Numaligarh')).toBeTruthy();
    // Above HFL is Nil on 2026-07-27 — reported as Nil, not omitted.
    expect(screen.getByText('Nil')).toBeTruthy();
  });

  it('surfaces reconciliation warnings and unreadable sections without hiding the data', () => {
    render(<SituationSummary summary={summaryFixture} />);

    expect(screen.getByText(/1 reconciliation warning/)).toBeTruthy();
    expect(screen.getByText(/256,334/)).toBeTruthy();
    expect(screen.getByText(/256,004/)).toBeTruthy();
    expect(screen.getByText(/shown as not reported, never as zero/)).toBeTruthy();
  });

  it('walks back to the source page through the injected handler', async () => {
    const onOpenPage = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <SituationSummary summary={summaryFixture} onOpenPage={onOpenPage} />,
    );

    const tile = container.querySelector('.headline__tile--reported') as HTMLElement;
    await user.click(within(tile).getByRole('button', { name: /Population and Crop Area/ }));

    expect(onOpenPage).toHaveBeenCalledWith(1, populationProvenance);
  });
});
