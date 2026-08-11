/**
 * The rule that decides whether two pieces of text are one wrapped District
 * name, and the rule that decides they are not.
 *
 * The second is the one that matters. An earlier attempt at this used pure
 * geometry — "District cell filled, every other cell empty, therefore a name
 * tail" — and demonstrably corrupted 27 July, where `Dhemaji`, `Nagaon` and
 * `Kamrup (M)` legitimately have every other cell empty. Every "leaves it
 * alone" case below is a case that rule got wrong.
 *
 * The vocabulary is injected, so these tests state the rule rather than
 * restating the roster of Assam.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  joinWrappedDistrictName,
  repairWrappedDistrictNames,
  resolveWrappedNameList,
  type DistrictVocabulary,
} from './wrapped-district-name';

/** A vocabulary that knows exactly the names it is handed, by loose key. */
const knowing = (...names: readonly string[]): DistrictVocabulary => {
  const keys = new Set(names.map((n) => n.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()));
  return (candidate) =>
    keys.has(candidate.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
};

const row = (...cells: readonly string[]) => ({ cells, pages: [1] });

describe('joinWrappedDistrictName', () => {
  it('closes a mid-word break when the closed form is a District', () => {
    // DRIMS breaks inside the word when the word does not fit the column.
    expect(joinWrappedDistrictName('Charaid', 'eo', knowing('Charaideo'))).toBe('Charaideo');
    expect(joinWrappedDistrictName('Bongaigao', 'n', knowing('Bongaigaon'))).toBe('Bongaigaon');
    expect(joinWrappedDistrictName('Golagha', 't', knowing('Golaghat'))).toBe('Golaghat');
  });

  it('keeps the space when the break fell on one, and the spaced form is a District', () => {
    expect(joinWrappedDistrictName('Karbi', 'Anglong', knowing('Karbi Anglong'))).toBe(
      'Karbi Anglong',
    );
    expect(joinWrappedDistrictName('West Karbi', 'Anglong', knowing('West Karbi Anglong'))).toBe(
      'West Karbi Anglong',
    );
  });

  it('prefers the spaced form when the tail opens a bracket', () => {
    // `Kamrup(M)` and `Kamrup (M)` fold to the same vocabulary key, so the
    // vocabulary cannot choose between them. ASDMA prints the space; a
    // bracketed qualifier is always a separate token, so we print it too.
    expect(joinWrappedDistrictName('Kamrup', '(M)', knowing('Kamrup (M)'))).toBe('Kamrup (M)');
  });

  it('refuses a join no District supports, however plausible it looks', () => {
    // Two real Districts on adjacent lines. This is the 27 July shape.
    const vocabulary = knowing('Dhemaji', 'Nagaon', 'Kamrup', 'Kamrup (M)');
    expect(joinWrappedDistrictName('Dhemaji', 'Nagaon', vocabulary)).toBeUndefined();
    expect(joinWrappedDistrictName('Kamrup', 'Nagaon', vocabulary)).toBeUndefined();
  });

  it('never merges Kamrup into Kamrup (M)', () => {
    // The load-bearing refusal. `Kamrup` + `Kamrup (M)` would be one District
    // swallowing another, and `KamrupKamrup (M)` is not a name.
    const vocabulary = knowing('Kamrup', 'Kamrup (M)');
    expect(joinWrappedDistrictName('Kamrup', 'Kamrup (M)', vocabulary)).toBeUndefined();
  });

  it('refuses when either side is blank', () => {
    const vocabulary = knowing('Jorhat');
    expect(joinWrappedDistrictName('', 'Jorhat', vocabulary)).toBeUndefined();
    expect(joinWrappedDistrictName('Jorhat', '   ', vocabulary)).toBeUndefined();
  });

  it('asks the vocabulary rather than pattern-matching the text', () => {
    const vocabulary = vi.fn(() => false) as unknown as DistrictVocabulary;
    expect(joinWrappedDistrictName('Charaid', 'eo', vocabulary)).toBeUndefined();
    expect(vocabulary).toHaveBeenCalledWith('Charaideo');
    expect(vocabulary).toHaveBeenCalledWith('Charaid eo');
  });
});

describe('repairWrappedDistrictNames, within one cell', () => {
  // The assembler has already recognised these lines as one row — a tail that
  // begins with a bracket or a lower-case letter cannot start a row — so the
  // only question left is whether the printed break was inside a word.

  it('closes the break the assembler recorded as a newline', () => {
    const rows = [row('Charaid\neo', '13', '(Sonari | 1)')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Charaideo'),
    });
    expect(repaired.map((r) => r.cells[0])).toEqual(['Charaideo']);
  });

  it('leaves the printed shape alone when nothing supports closing it', () => {
    // Unrepaired, not invented. `Cachar Sonai` is a District glued to a Revenue
    // Circle by a column-band failure, and no join of it is a District.
    const rows = [row('Cachar\nSonai', '0')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Cachar'),
    });
    expect(repaired.map((r) => r.cells[0])).toEqual(['Cachar Sonai']);
  });

  it('folds a name across three printed lines one step at a time', () => {
    const rows = [row('Bongaig\nao\nn')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Bongaigao', 'Bongaigaon'),
    });
    expect(repaired.map((r) => r.cells[0])).toEqual(['Bongaigaon']);
  });

  it('leaves a name it has never heard of exactly as printed', () => {
    // A District created after the vocabulary was written must pass through
    // untouched — being unknown is not being wrong.
    const rows = [row('Tamulpur', '4')];
    const repaired = repairWrappedDistrictNames(rows, { itemised: false, knows: knowing() });
    expect(repaired).toEqual(rows);
  });
});

describe('repairWrappedDistrictNames, across two rows of a district table', () => {
  it('merges the tail row into the row it continues', () => {
    // 20 July: `Karbi` carries the figures, `Anglong` carries nothing, and
    // today they are published as two Districts.
    const rows = [row('Karbi', '11', '(Phuloni | 10)'), row('Anglong', '', '')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Karbi Anglong'),
    });
    expect(repaired).toEqual([{ cells: ['Karbi Anglong', '11', '(Phuloni | 10)'], pages: [1] }]);
  });

  it('carries the tail row’s own cells up with it, rather than dropping them', () => {
    // Rescue Operation on 20 July wraps the agency list across the same two
    // printed lines the name wraps across. Losing the second line would lose
    // four agencies (ADR-0005: nothing is dropped).
    const rows = [
      { cells: ['Karbi', 'Fire & Emergency Services (F&ES),'], pages: [7] },
      { cells: ['Anglong', 'SDRF, Local People, Police, DDRF'], pages: [8] },
    ];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Karbi Anglong'),
    });
    expect(repaired).toEqual([
      {
        cells: ['Karbi Anglong', 'Fire & Emergency Services (F&ES),\nSDRF, Local People, Police, DDRF'],
        pages: [7, 8],
      },
    ]);
  });

  it('leaves two real Districts on adjacent rows alone — the 27 July case', () => {
    // Every other cell is empty in both rows, which is precisely the shape the
    // abandoned geometric rule mistook for a wrapped name.
    const rows = [row('Dhemaji', '', ''), row('Nagaon', '', ''), row('Kamrup (M)', '', '')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Dhemaji', 'Nagaon', 'Kamrup (M)'),
    });
    expect(repaired).toEqual(rows);
  });

  it('never absorbs a District it has never heard of into the row above', () => {
    // The safety property that makes an incomplete vocabulary safe: an unknown
    // name is a row of its own, exactly as printed.
    const rows = [row('Kamrup', '3'), row('Tamulpur', '4')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Kamrup'),
    });
    expect(repaired).toEqual(rows);
  });

  it('leaves the Total row where it is', () => {
    const rows = [row('Karbi', '11'), row('Total', '794')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: false,
      knows: knowing('Karbi Anglong'),
    });
    expect(repaired).toEqual(rows);
  });
});

describe('repairWrappedDistrictNames, in an itemised infrastructure table', () => {
  // These tables are one row per damaged *item*, and a District contributes
  // several. The tail lands on a row that carries a real item, so the row must
  // survive — it is relabelled, never merged away.

  it('relabels both rows and keeps them distinct', () => {
    const rows = [
      row('Charaid', '0', '(Sonari | 0)', 'Nil'),
      row('eo', '', '(Mahmora | 0)', 'Culvert Approach Road'),
    ];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: true,
      knows: knowing('Charaideo'),
    });
    expect(repaired).toEqual([
      { cells: ['Charaideo', '0', '(Sonari | 0)', 'Nil'], pages: [1] },
      { cells: ['Charaideo', '', '(Mahmora | 0)', 'Culvert Approach Road'], pages: [1] },
    ]);
  });

  it('does not merge two Nil items into one item called “Nil Nil”', () => {
    // The reason relabelling and merging are different operations here. A
    // merged pair reads `Nil\nNil` in the item-name column, which is not `Nil`,
    // so the parser would publish a damaged asset that does not exist.
    const rows = [row('Karbi', '0', '(Phuloni | 0)', 'Nil'), row('Anglong', '', '(Silonijan | 0)', 'Nil')];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: true,
      knows: knowing('Karbi Anglong'),
    });
    expect(repaired).toHaveLength(2);
    expect(repaired.map((r) => r.cells[3])).toEqual(['Nil', 'Nil']);
    expect(repaired.map((r) => r.cells[0])).toEqual(['Karbi Anglong', 'Karbi Anglong']);
  });

  it('relabels a `(M)` row that a fresh Revenue Circle opened', () => {
    const rows = [
      row('Kamrup', '1', '(Dispur | 1)', 'Nil'),
      row('(M)', '', '(Sonapur | 1)', 'Road Affected'),
    ];
    const repaired = repairWrappedDistrictNames(rows, {
      itemised: true,
      knows: knowing('Kamrup', 'Kamrup (M)'),
    });
    expect(repaired.map((r) => r.cells[0])).toEqual(['Kamrup (M)', 'Kamrup (M)']);
  });

  it('leaves a row whose District column is empty exactly where it is', () => {
    // An item that continues the District above it says so by saying nothing.
    const rows = [row('Jorhat', '2', '(Teok | 2)', 'Bridge'), row('', '', '(Titabor | 0)', 'Nil')];
    const repaired = repairWrappedDistrictNames(rows, { itemised: true, knows: knowing('Jorhat') });
    expect(repaired).toEqual(rows);
  });
});

describe('resolveWrappedNameList — the Districts Affected header', () => {
  const assam = knowing('Karbi Anglong', 'Udalguri', 'Darrang', 'Golaghat', 'Kamrup (M)');

  it('never manufactures a District from an unevidenced wrap', () => {
    // The 5 August defect, exactly as it arrived: the printed `Anglong,` was
    // lost between the two lines, leaving `Karbi` and `Udalguri` in one
    // comma-separated element. Joining them produced `Karbi Udalguri` — a
    // District that has never existed, carrying no data, which then showed as
    // an unplaceable name on the choropleth and made every cumulative figure
    // claim "the true figure is higher" because one row reported nothing.
    const names = resolveWrappedNameList('Golaghat, Darrang, Karbi\nUdalguri', assam);

    expect(names).not.toContain('Karbi Udalguri');
    expect(names).not.toContain('Karbi');
    expect(names).toEqual(['Golaghat', 'Darrang', 'Udalguri']);
  });

  it('closes a wrap the vocabulary vouches for', () => {
    // The ordinary case, and the reason the rule is not simply "split and drop":
    // a genuine wrap inside one name must still be put back together.
    expect(resolveWrappedNameList('Golaghat, Karbi\nAnglong', assam)).toEqual([
      'Golaghat',
      'Karbi Anglong',
    ]);
  });

  it('closes a wrap that broke inside a word, not only on a space', () => {
    expect(resolveWrappedNameList('Udalg\nuri', knowing('Udalguri'))).toEqual(['Udalguri']);
  });

  it('leaves an unwrapped list exactly as printed', () => {
    expect(resolveWrappedNameList('Golaghat, Darrang, Udalguri', assam)).toEqual([
      'Golaghat',
      'Darrang',
      'Udalguri',
    ]);
  });

  it('drops ASDMA’s Nil rather than publishing a District called Nil', () => {
    expect(resolveWrappedNameList('Nil', assam)).toEqual([]);
  });

  it('drops a TRUNCATED tail, which carries no newline at all', () => {
    // The 7 August shape: the cell simply stopped mid-name, leaving `Ch` as a
    // complete comma-separated element. Gating the repair on the presence of a
    // newline — as the assembler first did — skips exactly this case.
    const names = resolveWrappedNameList('Golaghat, Darrang, Udalguri, Ch', assam);

    expect(names).not.toContain('Ch');
    expect(names).toEqual(['Golaghat', 'Darrang', 'Udalguri']);
  });

  it('keeps a District the boundary set predates, so the gate is not the map', () => {
    // The gate is the NAME vocabulary, which is deliberately wider than the
    // Census-2011 polygons: Sribhumi was renamed from Karimganj in 2024 and
    // Bajali created in 2020. Filtering on the boundary set instead would have
    // deleted two real Districts to remove one fragment.
    const wide = knowing('Sivasagar', 'Sribhumi', 'Bajali');
    expect(resolveWrappedNameList('Sivasagar, Sribhumi, Bajali, Ch', wide)).toEqual([
      'Sivasagar',
      'Sribhumi',
      'Bajali',
    ]);
  });

  it('refuses a three-line wrap it cannot close all the way', () => {
    // A `reduce` restarting from the surviving segment is how half a name gets
    // published; nothing here is evidenced, so nothing is emitted.
    expect(resolveWrappedNameList('Kar\nbi\nUdalguri', knowing('Udalguri'))).toEqual([
      'Udalguri',
    ]);
  });
});
