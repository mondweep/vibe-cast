import { describe, expect, it } from 'vitest';

import type { SectionKind } from '../../domain/shared/flood-situation-report';
import {
  createSectionRecogniser,
  matchSectionKind,
  normaliseLabel,
  reassembleLabel,
  SECTION_LABELS,
  type LabelFragment,
} from './section-recogniser';

describe('reassembleLabel', () => {
  it('reassembles a label the gutter broke mid-word', () => {
    expect(reassembleLabel(['Infrastruct', 'ure', 'Damaged - ', 'Road'])).toBe(
      'Infrastructure Damaged - Road',
    );
  });

  it('reassembles the worst case in the bulletin: two mid-word breaks in one label', () => {
    expect(reassembleLabel(['Non Camp', 'Inmates in', 'Relief', 'Distributio', 'n Centers'])).toBe(
      'Non Camp Inmates in Relief Distribution Centers',
    );
  });

  it('reassembles a label whose hyphen is its own run', () => {
    expect(reassembleLabel(['Human', 'Lives Lost', '-', 'Confirmed'])).toBe(
      'Human Lives Lost - Confirmed',
    );
    expect(reassembleLabel(['Infrastruct', 'ure', 'Damaged', '-', 'Embankme', 'nt Affected'])).toBe(
      'Infrastructure Damaged - Embankment Affected',
    );
  });

  it('reassembles the nine-fragment rivers label', () => {
    expect(
      reassembleLabel([
        'Rivers',
        'flowing',
        'above',
        'Danger',
        'Level (as',
        'per CWC',
        'bulletin',
        'issued at 8',
        'AM)',
      ]),
    ).toBe(SECTION_LABELS['rivers-above-danger-level']);
  });

  it('joins fragments it does not recognise rather than dropping them', () => {
    expect(reassembleLabel(['Wildlife', 'affected', 'under', 'p', 'rotected'])).toBe(
      'Wildlife affected under p rotected',
    );
  });

  it('is empty for no fragments', () => {
    expect(reassembleLabel([])).toBe('');
  });
});

describe('normaliseLabel', () => {
  it('folds case and removes whitespace, so a mid-word break cannot hide a match', () => {
    expect(normaliseLabel('Infrastruct ure  Damaged - Road')).toBe('infrastructuredamaged-road');
  });

  it('normalises the en-dash DRIMS sometimes uses for a hyphen', () => {
    expect(normaliseLabel('Human Lives Lost – Missing')).toBe(normaliseLabel('Human Lives Lost - Missing'));
  });
});

describe('matchSectionKind — all 22 kinds', () => {
  const kinds = Object.keys(SECTION_LABELS) as SectionKind[];

  it('covers every kind in the published language', () => {
    expect(kinds).toHaveLength(23); // 22 sections + the trailing Remarks block
  });

  it.each(kinds)('matches the canonical label for %s', (kind) => {
    expect(matchSectionKind(SECTION_LABELS[kind])).toBe(kind);
  });

  it.each(kinds)('matches %s with its whitespace destroyed', (kind) => {
    expect(matchSectionKind(SECTION_LABELS[kind].replace(/\s+/g, ''))).toBe(kind);
  });

  it.each(kinds)('matches %s case-folded', (kind) => {
    expect(matchSectionKind(SECTION_LABELS[kind].toUpperCase())).toBe(kind);
  });

  it('maps ASDMA’s alternative label for the revenue circle count onto the same kind', () => {
    expect(matchSectionKind('No. Of Revenue Circles Affected')).toBe('revenue-circles-affected');
    expect(matchSectionKind('Name Of Revenue Circle Affected')).toBe('revenue-circles-affected');
  });

  it('accepts the British spelling of Centres for the non-camp section', () => {
    expect(matchSectionKind('Non Camp Inmates in Relief Distribution Centres')).toBe(
      'non-camp-inmates',
    );
  });

  it('returns undefined — it does not throw — for a label it does not know', () => {
    expect(matchSectionKind('Wildlife affected under protected areas description')).toBeUndefined();
    expect(matchSectionKind('Particulars')).toBeUndefined();
    expect(matchSectionKind('')).toBeUndefined();
  });

  it('does not confuse a label with the longer label it prefixes', () => {
    expect(matchSectionKind('Houses Damaged')).toBe('houses-damaged');
    expect(matchSectionKind('Houses Damaged Others')).toBe('houses-damaged-others');
    expect(matchSectionKind('Relief Distributed')).toBe('relief-distributed');
    expect(matchSectionKind('Relief Distributed - Others')).toBe('relief-distributed-others');
    expect(matchSectionKind('Infrastructure Damaged - Embankment Breached')).toBe(
      'infrastructure-embankment-breached',
    );
    expect(matchSectionKind('Infrastructure Damaged - Embankment Affected')).toBe(
      'infrastructure-embankment-affected',
    );
  });
});

describe('SectionRecogniser.recognise', () => {
  const recogniser = createSectionRecogniser();

  it('names the section and echoes its canonical label', () => {
    expect(recogniser.recognise(['Infrastruct', 'ure', 'Damaged - ', 'Road'])).toEqual({
      kind: 'infrastructure-road',
      label: 'Infrastructure Damaged - Road',
      rowIndex: 0,
    });
  });

  it('is undefined for an unrecognised label', () => {
    expect(recogniser.recognise(['Wildlife', 'affected'])).toBeUndefined();
  });
});

describe('SectionRecogniser.findBoundaries', () => {
  const recogniser = createSectionRecogniser();
  const fragments = (...pairs: readonly (readonly [string, number])[]): LabelFragment[] =>
    pairs.map(([text, rowIndex]) => ({ text, rowIndex }));

  it('finds each section at the row where its label begins', () => {
    const found = recogniser.findBoundaries(
      fragments(['Animals', 10], ['Affected', 11], ['Animals', 20], ['Washed', 21], ['Away', 22]),
    );
    expect(found).toEqual([
      { kind: 'animals-affected', label: 'Animals Affected', rowIndex: 10 },
      { kind: 'animals-washed-away', label: 'Animals Washed Away', rowIndex: 20 },
    ]);
  });

  it('separates two labels that are only 11pt apart on page 1, where a gap rule cannot', () => {
    // `AM)` ends the rivers label; `District` starts the next one on the very
    // next line. Only the catalogue distinguishes them.
    const found = recogniser.findBoundaries(
      fragments(
        ['Particulars', 0],
        ['Rivers', 1],
        ['flowing', 2],
        ['above', 3],
        ['Danger', 4],
        ['Level (as', 5],
        ['per CWC', 6],
        ['bulletin', 7],
        ['issued at 8', 8],
        ['AM)', 9],
        ['District', 10],
        ['Affected', 11],
        ['No. Of', 12],
        ['Revenue', 13],
        ['Circles', 14],
        ['Affected', 15],
      ),
    );
    expect(found.map((b) => [b.kind, b.rowIndex])).toEqual([
      ['rivers-above-danger-level', 1],
      ['districts-affected', 10],
      ['revenue-circles-affected', 12],
    ]);
  });

  it('prefers the longer label when a shorter one is its prefix', () => {
    const found = recogniser.findBoundaries(
      fragments(['Houses', 0], ['Damaged', 1], ['Others', 2]),
    );
    expect(found).toEqual([
      { kind: 'houses-damaged-others', label: 'Houses Damaged Others', rowIndex: 0 },
    ]);
  });

  it('still finds the short label when the longer one does not follow', () => {
    const found = recogniser.findBoundaries(
      fragments(['Houses', 0], ['Damaged', 1], ['Rescue', 2], ['Operation', 3]),
    );
    expect(found.map((b) => b.kind)).toEqual(['houses-damaged', 'rescue-operation']);
  });

  it('skips fragments it cannot place and keeps going — one bad block is not fatal', () => {
    const found = recogniser.findBoundaries(
      fragments(
        ['Wildlife', 0],
        ['affected', 1],
        ['under', 2],
        ['p', 3],
        ['rotected', 3],
        ['areas', 4],
        ['description', 5],
        ['Remarks', 6],
      ),
    );
    expect(found).toEqual([{ kind: 'remarks', label: 'Remarks', rowIndex: 6 }]);
  });

  it('finds nothing in an empty stream', () => {
    expect(recogniser.findBoundaries([])).toEqual([]);
  });
});
