import { describe, expect, it } from 'vitest';

import {
  breakdownCircles,
  compoundField,
  parseInlineBreakdown,
  simpleBreakdown,
} from './inline-breakdown';

const value = (n: number) => ({ kind: 'value' as const, value: n });

describe('parseInlineBreakdown — simple dialect', () => {
  it('parses the Villages Affected cell for Sivasagar', () => {
    expect(parseInlineBreakdown('(Nazira | 41), (Demow | 24), (Sivsagar | 114)')).toEqual([
      { kind: 'simple', circle: 'Nazira', value: value(41) },
      { kind: 'simple', circle: 'Demow', value: value(24) },
      { kind: 'simple', circle: 'Sivsagar', value: value(114) },
    ]);
  });

  it('keeps circle names that contain spaces intact', () => {
    expect(parseInlineBreakdown('(Sonari RC part | 7)')).toEqual([
      { kind: 'simple', circle: 'Sonari RC part', value: value(7) },
    ]);
  });

  it('tolerates a newline inside the parentheses', () => {
    expect(parseInlineBreakdown('(Nagaon | 0), (Samaguri | 0), (Kampur\n| 0)')).toEqual([
      { kind: 'simple', circle: 'Nagaon', value: value(0) },
      { kind: 'simple', circle: 'Samaguri', value: value(0) },
      { kind: 'simple', circle: 'Kampur', value: value(0) },
    ]);
  });

  it('tolerates a newline splitting the circle name itself', () => {
    expect(parseInlineBreakdown('(Sonari RC\npart | 6507)')).toEqual([
      { kind: 'simple', circle: 'Sonari RC part', value: value(6507) },
    ]);
  });

  it('keeps a Nil value as zero and an SNR value as unknown', () => {
    expect(parseInlineBreakdown('(Sapekhati | Nil), (Mahmora | SNR)')).toEqual([
      { kind: 'simple', circle: 'Sapekhati', value: { kind: 'zero' } },
      { kind: 'simple', circle: 'Mahmora', value: { kind: 'unknown' } },
    ]);
  });
});

describe('parseInlineBreakdown — compound dialect', () => {
  it('parses a single compound expression', () => {
    expect(
      parseInlineBreakdown('(Mahmora | Population Affected: 67128 | Crop Area Submerged: 7340)'),
    ).toEqual([
      {
        kind: 'compound',
        circle: 'Mahmora',
        fields: { 'Population Affected': value(67128), 'Crop Area Submerged': value(7340) },
      },
    ]);
  });

  it("reassembles Charaideo's population row, which wraps across four lines", () => {
    // Verbatim from the 2026-07-27 bulletin, page 1, including the line breaks
    // the renderer inserted mid-expression and mid-word.
    const cell = [
      '(Mahmora | Population Affected: 67128 | Crop Area',
      'Submerged: 7340), (Sonari | Population Affected: 121276 |',
      'Crop Area Submerged: 8512), (Sapekhati | Population',
      'Affected: 0 | Crop Area Submerged: 1797)',
    ].join('\n');

    expect(parseInlineBreakdown(cell)).toEqual([
      {
        kind: 'compound',
        circle: 'Mahmora',
        fields: { 'Population Affected': value(67128), 'Crop Area Submerged': value(7340) },
      },
      {
        kind: 'compound',
        circle: 'Sonari',
        fields: { 'Population Affected': value(121276), 'Crop Area Submerged': value(8512) },
      },
      {
        kind: 'compound',
        circle: 'Sapekhati',
        fields: { 'Population Affected': value(0), 'Crop Area Submerged': value(1797) },
      },
    ]);
  });

  it('recognises a field label that the renderer split mid-word', () => {
    expect(parseInlineBreakdown('(Sonari | Populati on Affected: 121276)')).toEqual([
      {
        kind: 'compound',
        circle: 'Sonari',
        fields: { 'Population Affected': value(121276) },
      },
    ]);
  });

  it('preserves DRIMS float noise in a compound field', () => {
    const parsed = parseInlineBreakdown(
      '(Jorhat West | Population Affected: 41931 | Crop Area Submerged: 2025.9200000000003)',
    );
    expect(parsed[0]).toEqual({
      kind: 'compound',
      circle: 'Jorhat West',
      fields: {
        'Population Affected': value(41931),
        'Crop Area Submerged': value(2025.9200000000003),
      },
    });
  });

  it('keeps an unrecognised field label, collapsed but otherwise verbatim', () => {
    expect(parseInlineBreakdown('(Teok | Boats  Deployed: 4)')).toEqual([
      { kind: 'compound', circle: 'Teok', fields: { 'Boats Deployed': value(4) } },
    ]);
  });
});

describe('parseInlineBreakdown — things that are not breakdowns', () => {
  it('produces nothing for an empty cell', () => {
    expect(parseInlineBreakdown('')).toEqual([]);
  });

  it('produces nothing for a "Nil" cell — no entity is invented', () => {
    expect(parseInlineBreakdown('Nil')).toEqual([]);
  });

  it('skips parenthesised prose that carries no pipe', () => {
    expect(parseInlineBreakdown('(as per CWC bulletin issued at 8 AM)')).toEqual([]);
  });

  it('skips an unbalanced trailing parenthesis rather than guessing', () => {
    expect(parseInlineBreakdown('(Nazira | 41), (Demow | 24')).toEqual([
      { kind: 'simple', circle: 'Nazira', value: value(41) },
    ]);
  });

  it('survives a non-string', () => {
    expect(parseInlineBreakdown(undefined as unknown as string)).toEqual([]);
  });
});

describe('projections over a parsed breakdown', () => {
  const villages = '(Golaghat | 28), (Khumtai | 16), (Bokakhat | 22), (Dergaon | 45)';

  it('simpleBreakdown indexes the simple dialect by circle', () => {
    expect([...simpleBreakdown(villages)]).toEqual([
      ['Golaghat', value(28)],
      ['Khumtai', value(16)],
      ['Bokakhat', value(22)],
      ['Dergaon', value(45)],
    ]);
  });

  it('compoundField picks one field out of the compound dialect', () => {
    const cell =
      '(Golaghat | Population Affected: 13386 | Crop Area Submerged: 923), ' +
      '(Khumtai | Population Affected: 5004 | Crop Area Submerged: 880.55)';
    expect([...compoundField(cell, 'Crop Area Submerged')]).toEqual([
      ['Golaghat', value(923)],
      ['Khumtai', value(880.55)],
    ]);
  });

  it('breakdownCircles lists circles in document order without repeats', () => {
    expect(breakdownCircles(villages)).toEqual(['Golaghat', 'Khumtai', 'Bokakhat', 'Dergaon']);
    expect(breakdownCircles('(Teok | 1), (Teok | 2)')).toEqual(['Teok']);
  });

  it('breakdownCircles produces no circle for a Nil cell', () => {
    expect(breakdownCircles('Nil')).toEqual([]);
  });
});
