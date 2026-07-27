import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CasualtyPanel } from './casualty-panel';
import { casualtiesFixture } from './test-fixtures';

afterEach(cleanup);

describe('CasualtyPanel', () => {
  it("uses ASDMA's wording for both kinds of confirmed death", () => {
    render(<CasualtyPanel casualties={casualtiesFixture} />);

    expect(screen.getByText('Flood Death')).toBeTruthy();
    expect(screen.getByText('General Drowning (Non Flood)')).toBeTruthy();
    expect(screen.getByText('Human Lives Lost — Missing')).toBeTruthy();
  });

  it('renders flood deaths and general drownings in separate cells', () => {
    const { container } = render(<CasualtyPanel casualties={casualtiesFixture} />);

    const floodDeaths = container.querySelector('[data-figure="flood-deaths"]');
    const drownings = container.querySelector('[data-figure="general-drownings"]');

    expect(floodDeaths?.textContent).toBe('3');
    expect(drownings?.textContent).toBe('2');
    // Physically separate blocks — nothing encloses both but the panel itself.
    expect(floodDeaths?.closest('.casualties__block')).not.toBe(
      drownings?.closest('.casualties__block'),
    );
  });

  it('never renders a combined casualty total', () => {
    const { container } = render(<CasualtyPanel casualties={casualtiesFixture} />);

    const figures = Array.from(container.querySelectorAll('[data-figure]')).map(
      (node) => node.textContent,
    );
    // 3 flood deaths, 2 general drownings, 1 missing — and nothing else.
    expect(figures).toEqual(['3', '2', '1']);

    // 3 + 2 = 5, 3 + 2 + 1 = 6: neither sum may appear anywhere in the panel.
    expect(screen.queryByText('5')).toBeNull();
    expect(screen.queryByText('6')).toBeNull();
    expect(container.textContent).not.toMatch(/total/i);
  });

  it('says plainly that the figures are not added together', () => {
    render(<CasualtyPanel casualties={casualtiesFixture} />);

    expect(screen.getByText(/never adds them together/i)).toBeTruthy();
  });
});
