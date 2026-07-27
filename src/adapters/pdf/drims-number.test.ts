import { describe, expect, it } from 'vitest';

import {
  cellToCount,
  numericValue,
  parseDrimsNumber,
  parseWrappedDrimsNumber,
  toCount,
} from './drims-number';

describe('parseDrimsNumber', () => {
  describe('the sentinels ASDMA prints instead of numbers', () => {
    it('reads "Nil" as an affirmative zero', () => {
      expect(parseDrimsNumber('Nil')).toEqual({ kind: 'zero' });
    });

    it('reads "Nil" case-insensitively and with stray whitespace', () => {
      expect(parseDrimsNumber('  nil ')).toEqual({ kind: 'zero' });
      expect(parseDrimsNumber('NIL')).toEqual({ kind: 'zero' });
    });

    it('reads "SNR" (Status Not Reported) as unknown, never as zero', () => {
      expect(parseDrimsNumber('SNR')).toEqual({ kind: 'unknown' });
      expect(parseDrimsNumber('snr')).toEqual({ kind: 'unknown' });
    });

    it('reads an empty cell as unknown', () => {
      expect(parseDrimsNumber('')).toEqual({ kind: 'unknown' });
    });

    it('reads a whitespace-only cell as unknown', () => {
      expect(parseDrimsNumber('   ')).toEqual({ kind: 'unknown' });
      expect(parseDrimsNumber('\n \t')).toEqual({ kind: 'unknown' });
    });
  });

  describe('numbers', () => {
    it('reads a plain integer', () => {
      expect(parseDrimsNumber('445495')).toEqual({ kind: 'value', value: 445495 });
    });

    it('reads a printed zero as a value, distinct from the Nil sentinel', () => {
      expect(parseDrimsNumber('0')).toEqual({ kind: 'value', value: 0 });
    });

    it('reads a comma-grouped integer', () => {
      expect(parseDrimsNumber('1,234')).toEqual({ kind: 'value', value: 1234 });
      expect(parseDrimsNumber('2,56,334')).toEqual({ kind: 'value', value: 256334 });
    });

    it('reads a decimal', () => {
      expect(parseDrimsNumber('102.936')).toEqual({ kind: 'value', value: 102.936 });
    });

    it('preserves DRIMS float noise to the last bit — it does NOT round', () => {
      const parsed = parseDrimsNumber('2025.9200000000003');
      expect(parsed).toEqual({ kind: 'value', value: 2025.9200000000003 });
      // The distinction that makes reconciliation trustworthy: our stored value
      // is byte-for-byte what ASDMA published, not a tidied-up version of it.
      if (parsed.kind !== 'value') throw new Error('unreachable');
      expect(parsed.value).not.toBe(2025.92);
    });

    it('reads a negative number', () => {
      expect(parseDrimsNumber('-5')).toEqual({ kind: 'value', value: -5 });
    });

    it('tolerates surrounding whitespace and newlines from wrapped cells', () => {
      expect(parseDrimsNumber(' \n37139.52 ')).toEqual({ kind: 'value', value: 37139.52 });
    });
  });

  describe('anything else is unknown, never a guess', () => {
    it.each([
      ['Nil (see remarks)'],
      ['12 nos'],
      ['1.2.3'],
      ['--'],
      ['-'],
      ['N/A'],
      ['0-Kg'],
      ['abc'],
      ['1e5'],
      ['Infinity'],
      ['NaN'],
      ['94.107469 / 27.0'],
    ])('reads %j as unknown', (raw) => {
      expect(parseDrimsNumber(raw)).toEqual({ kind: 'unknown' });
    });

    it('never returns a bare number for any input', () => {
      const inputs = ['Nil', 'SNR', '', '1,234', '2025.9200000000003', 'garbage'];
      for (const raw of inputs) {
        const parsed: unknown = parseDrimsNumber(raw);
        expect(typeof parsed).toBe('object');
        expect(parsed).toHaveProperty('kind');
      }
    });

    it('survives a non-string sneaking past the type system', () => {
      expect(parseDrimsNumber(undefined as unknown as string)).toEqual({ kind: 'unknown' });
    });
  });
});

describe('parseWrappedDrimsNumber', () => {
  it('rejoins a longitude the renderer split inside its fraction', () => {
    expect(parseWrappedDrimsNumber('95.0325\n43')).toEqual({ kind: 'value', value: 95.032543 });
    expect(parseWrappedDrimsNumber('94.1074 69')).toEqual({ kind: 'value', value: 94.107469 });
  });

  it('rejoins a latitude split just before its decimal point', () => {
    expect(parseWrappedDrimsNumber('27 .015787')).toEqual({ kind: 'value', value: 27.015787 });
  });

  it('leaves an already-parseable cell alone', () => {
    expect(parseWrappedDrimsNumber('94.8591')).toEqual({ kind: 'value', value: 94.8591 });
    expect(parseWrappedDrimsNumber('Nil')).toEqual({ kind: 'zero' });
    expect(parseWrappedDrimsNumber('SNR')).toEqual({ kind: 'unknown' });
  });

  it('refuses to glue two whole numbers together — that is a column failure, not a wrap', () => {
    expect(parseWrappedDrimsNumber('0 0')).toEqual({ kind: 'unknown' });
    expect(parseWrappedDrimsNumber('18\n4')).toEqual({ kind: 'unknown' });
  });

  it('survives a non-string', () => {
    expect(parseWrappedDrimsNumber(undefined as unknown as string)).toEqual({ kind: 'unknown' });
  });
});

describe('numericValue', () => {
  it('gives 0 for the Nil sentinel', () => {
    expect(numericValue({ kind: 'zero' })).toBe(0);
  });

  it('gives undefined — not 0 — for unknown', () => {
    expect(numericValue({ kind: 'unknown' })).toBeUndefined();
  });

  it('gives the value for a value', () => {
    expect(numericValue({ kind: 'value', value: 631 })).toBe(631);
  });
});

describe('toCount — the bridge into the published language', () => {
  it('maps a value to a known Count', () => {
    expect(toCount({ kind: 'value', value: 90 })).toEqual({ kind: 'known', unit: 'count', value: 90 });
  });

  it('maps Nil to a known Count of zero', () => {
    expect(toCount({ kind: 'zero' })).toEqual({ kind: 'known', unit: 'count', value: 0 });
  });

  it('maps unknown to an unknown Count, keeping the distinction alive downstream', () => {
    expect(toCount({ kind: 'unknown' })).toEqual({ kind: 'unknown', unit: 'count' });
  });

  it('cellToCount composes parse and bridge', () => {
    expect(cellToCount('SNR')).toEqual({ kind: 'unknown', unit: 'count' });
    expect(cellToCount('Nil')).toEqual({ kind: 'known', unit: 'count', value: 0 });
    expect(cellToCount('28,695')).toEqual({ kind: 'known', unit: 'count', value: 28695 });
  });
});
