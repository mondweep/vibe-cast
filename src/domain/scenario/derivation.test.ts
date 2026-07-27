import { describe, expect, it } from 'vitest';

import {
  days,
  formatDecimal,
  formatInteger,
  formatPercent,
  isProjected,
  personsPerCamp,
  projected,
  rate,
  statedDerivation,
  unknownDays,
} from './derivation';

describe('number formatting for plain-language derivations (FR-4.6)', () => {
  it('groups thousands the way the bulletin summary does', () => {
    expect(formatInteger(579_143)).toBe('579,143');
    expect(formatInteger(144_785)).toBe('144,785');
    expect(formatInteger(90)).toBe('90');
    expect(formatInteger(0)).toBe('0');
  });

  it('rounds to whole units before grouping, because people are whole', () => {
    expect(formatInteger(1_608.7222)).toBe('1,609');
    expect(formatInteger(119_109.20000000001)).toBe('119,109');
  });

  it('renders negatives with a sign rather than dropping it', () => {
    expect(formatInteger(-4_765)).toBe('-4,765');
  });

  it('drops trailing zeros so 25% never reads as 25.0%', () => {
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(0.06441149732320228)).toBe('6.4%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('shows a decimal only where it carries information', () => {
    expect(formatDecimal(1.371104281060423, 1)).toBe('1.4');
    expect(formatDecimal(1_191.092, 2)).toBe('1,191.09');
    expect(formatDecimal(5, 1)).toBe('5');
  });

  it('says so plainly when a figure is not known', () => {
    expect(formatInteger(undefined)).toBe('not reported');
    expect(formatPercent(undefined)).toBe('not reported');
    expect(formatDecimal(undefined, 1)).toBe('not reported');
  });
});

describe('projected figures are tagged so the UI can set them apart (FR-4.7)', () => {
  const derivation = statedDerivation('projected inmates', 'Because the scenario says so.', [
    { label: 'Reported inmates', value: '28,695', source: 'reported' },
  ]);

  it('carries a projected provenance tag alongside the value', () => {
    const figure = projected(days(1.4), derivation);

    expect(figure.provenance).toBe('projected');
    expect(figure.value).toEqual({ kind: 'known', unit: 'days', value: 1.4 });
    expect(figure.derivation).toBe(derivation);
  });

  it('recognises a projected figure, and refuses a bare reported quantity', () => {
    expect(isProjected(projected(personsPerCamp(319), derivation))).toBe(true);
    expect(isProjected({ kind: 'known', unit: 'count', value: 28_695 })).toBe(false);
    expect(isProjected(undefined)).toBe(false);
    expect(isProjected(null)).toBe(false);
  });

  it('keeps unknown quantities unknown rather than defaulting them to zero', () => {
    const figure = projected(unknownDays(), derivation);

    expect(figure.value).toEqual({ kind: 'unknown', unit: 'days' });
  });

  it('records every input with where it came from, so a reader can argue with it', () => {
    const d = statedDerivation('ration coverage', 'Rice runs out in 1.4 days.', [
      { label: 'Rice in stock', value: '119,109 kg', source: 'reported' },
      { label: 'Ration norm', value: '0.6 kg/person/day', source: 'assumption' },
      { label: 'Camp uptake', value: '25%', source: 'lever' },
      { label: 'Projected inmates', value: '144,785', source: 'derived' },
    ]);

    expect(d.metric).toBe('ration coverage');
    expect(d.inputs.map((i) => i.source)).toEqual(['reported', 'assumption', 'lever', 'derived']);
  });
});

describe('projection quantity constructors', () => {
  it('build known and unknown quantities in projection-specific units', () => {
    expect(rate(0.25)).toEqual({ kind: 'known', unit: 'rate', value: 0.25 });
    expect(personsPerCamp(1_609)).toEqual({ kind: 'known', unit: 'per-camp', value: 1_609 });
    expect(days(5)).toEqual({ kind: 'known', unit: 'days', value: 5 });
  });
});
