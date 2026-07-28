/**
 * The completeness invariant, tested as the pure judgement it is.
 *
 * Every case here is drawn from the two bulletins that broke the parser
 * silently — 2026-07-25 and 2026-07-26 — or from the four that did not, so
 * that "loud" and "quiet" are both pinned by real shapes rather than by
 * invented ones. The corresponding end-to-end proof, that a mislocated gutter
 * on the real PDFs is now refused, lives in `golden.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { count, unknownCount } from '../../domain/shared/quantity';
import type { SectionKind } from '../../domain/shared/flood-situation-report';
import {
  applyIntegrityToProvenance,
  ASSAM_DISTRICT_COUNT,
  checkDocumentIntegrity,
  describeIntegrity,
  DRIMS_SECTION_CATALOGUE,
  MAX_DISTRICT_NAME_LENGTH,
  minimumRecognisedSections,
  type DocumentIntegrity,
} from './document-integrity';

/** A document that breaks nothing: the 2026-07-27 shape. */
const healthy = {
  recognisedSections: DRIMS_SECTION_CATALOGUE,
  districtNames: ['Sivasagar', 'Golaghat', 'Charaideo', 'Jorhat', 'Nagaon', 'Kamrup (M)'],
  statewidePopulationAffected: count(445495),
};

/**
 * What the 2026-07-25 bulletin actually produced before the fix: only the
 * District Affected and Remarks labels were found, because the Particulars
 * gutter was located right of the District column and every district name was
 * read as a section label.
 */
const HUSK_SECTIONS: readonly SectionKind[] = ['districts-affected', 'remarks'];

/** Verbatim from the 2026-07-25 parse: a Remarks sentence read as a district. */
const REMARKS_PROSE =
  '(Sonari - Additional reports are currently being prepared and will be submitted ' +
  'tomorrow upon completion.)';

describe('checkDocumentIntegrity', () => {
  it('passes a complete, plausible document without comment', () => {
    const integrity = checkDocumentIntegrity(healthy);
    expect(integrity.confidence).toBe('high');
    expect(integrity.breaches).toEqual([]);
    expect(integrity.missingSections).toEqual([]);
  });

  describe('were the sections found?', () => {
    it('fails a document that yielded 2 of 23 sections — the 25 and 26 July husk', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        recognisedSections: HUSK_SECTIONS,
      });
      expect(integrity.confidence).toBe('failed');
      expect(integrity.breaches.map((b) => b.check)).toContain('sections-recognised');
    });

    it('names every section it could not find, so the diagnosis is not a guess', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        recognisedSections: HUSK_SECTIONS,
      });
      expect(integrity.missingSections).toHaveLength(DRIMS_SECTION_CATALOGUE.length - 2);
      expect(integrity.missingSections).toContain('population-and-crop-area-submerged');
      expect(integrity.missingSections).not.toContain('remarks');
      const breach = integrity.breaches.find((b) => b.check === 'sections-recognised')!;
      expect(breach.detail).toContain('recognised 2 of 23');
      expect(breach.detail).toContain('population-and-crop-area-submerged');
    });

    it('degrades rather than fails a document short by one section', () => {
      // A single unrecognised label is a catalogue gap, not a lost document:
      // the twenty-two sections we did read may be perfectly sound. It is still
      // reported, because a section we did not find is one we could not read.
      const integrity = checkDocumentIntegrity({
        ...healthy,
        recognisedSections: DRIMS_SECTION_CATALOGUE.slice(0, -1),
      });
      expect(integrity.confidence).toBe('degraded');
      expect(integrity.missingSections).toEqual(['remarks']);
    });

    it('fails at the two-thirds floor and degrades just above it', () => {
      const floor = minimumRecognisedSections();
      expect(floor).toBe(16);
      expect(
        checkDocumentIntegrity({
          ...healthy,
          recognisedSections: DRIMS_SECTION_CATALOGUE.slice(0, floor - 1),
        }).confidence,
      ).toBe('failed');
      expect(
        checkDocumentIntegrity({
          ...healthy,
          recognisedSections: DRIMS_SECTION_CATALOGUE.slice(0, floor),
        }).confidence,
      ).toBe('degraded');
    });
  });

  describe('are the districts possible?', () => {
    it('fails a bulletin reporting more districts than Assam has', () => {
      // 2026-07-26 reported 46. Assam has 35.
      const integrity = checkDocumentIntegrity({
        ...healthy,
        districtNames: Array.from({ length: 46 }, (_, i) => `District ${i}`),
      });
      expect(integrity.confidence).toBe('failed');
      const breach = integrity.breaches.find((b) => b.check === 'district-count-within-assam')!;
      expect(breach.detail).toContain('46 districts');
      expect(breach.detail).toContain('35');
    });

    it('accepts a bulletin that names every district in the state', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        districtNames: Array.from({ length: ASSAM_DISTRICT_COUNT }, (_, i) => `District ${i}`),
      });
      expect(integrity.breaches.map((b) => b.check)).not.toContain('district-count-within-assam');
    });

    it('catches the misread independently of the section count', () => {
      // The point of having four checks: each one alone would have caught the
      // 26 July failure. A future misread that keeps the section count intact
      // is still caught here.
      const integrity = checkDocumentIntegrity({
        ...healthy,
        recognisedSections: DRIMS_SECTION_CATALOGUE,
        districtNames: Array.from({ length: 46 }, (_, i) => `District ${i}`),
      });
      expect(integrity.confidence).toBe('failed');
    });
  });

  describe('are the district names names?', () => {
    it('fails on a Remarks sentence that reached the District column', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        districtNames: ['Sivasagar', REMARKS_PROSE],
      });
      expect(integrity.confidence).toBe('failed');
      const breach = integrity.breaches.find((b) => b.check === 'district-names-are-names')!;
      expect(breach.detail).toContain(String(REMARKS_PROSE.length));
    });

    it('abbreviates the offending string so a diagnostic stays readable', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        districtNames: ['x'.repeat(863)],
      });
      const breach = integrity.breaches.find((b) => b.check === 'district-names-are-names')!;
      expect(breach.detail).toContain('...');
      expect(breach.detail.length).toBeLessThan(200);
      // The true length is still stated: abbreviating the sample must not hide
      // how far from a district name the string was.
      expect(breach.detail).toContain('863');
    });

    it('catches sentence punctuation well before the length limit', () => {
      const integrity = checkDocumentIntegrity({ ...healthy, districtNames: ['Nagaon. Kampur'] });
      expect(integrity.confidence).toBe('failed');
    });

    it('accepts every real Assam district spelling ASDMA uses', () => {
      const real = [
        'Kamrup (M)',
        'Kamrup',
        'Karbi Anglong',
        'West Karbi Anglong',
        'South Salmara Mankachar',
        'Sivasagar',
        'Sribhumi',
        'Dima Hasao',
      ];
      for (const name of real) expect(name.length).toBeLessThanOrEqual(MAX_DISTRICT_NAME_LENGTH);
      expect(checkDocumentIntegrity({ ...healthy, districtNames: real }).confidence).toBe('high');
    });
  });

  describe('is the headline figure there?', () => {
    it('degrades a bulletin with no statewide population total', () => {
      const integrity = checkDocumentIntegrity({
        ...healthy,
        statewidePopulationAffected: unknownCount(),
      });
      expect(integrity.confidence).toBe('degraded');
      expect(integrity.breaches.map((b) => b.check)).toContain('statewide-population-present');
    });

    it('treats a reported zero as present — unknown is not zero, and zero is not unknown', () => {
      const integrity = checkDocumentIntegrity({ ...healthy, statewidePopulationAffected: count(0) });
      expect(integrity.confidence).toBe('high');
    });
  });

  it('reports every broken invariant, not merely the first', () => {
    // 26 July broke three at once. Fixing one of them must not silence the rest.
    const integrity = checkDocumentIntegrity({
      recognisedSections: HUSK_SECTIONS,
      districtNames: [...Array.from({ length: 45 }, (_, i) => `D${i}`), REMARKS_PROSE],
      statewidePopulationAffected: unknownCount(),
    });
    expect(integrity.breaches.map((b) => b.check).sort()).toEqual([
      'district-count-within-assam',
      'district-names-are-names',
      'sections-recognised',
      'statewide-population-present',
    ]);
    expect(integrity.confidence).toBe('failed');
  });
});

describe('describeIntegrity', () => {
  it('says nothing alarming about a healthy document', () => {
    expect(describeIntegrity(checkDocumentIntegrity(healthy))).toBe('document integrity: high');
  });

  it('names the verdict, the check and the observed value', () => {
    const text = describeIntegrity(
      checkDocumentIntegrity({ ...healthy, recognisedSections: HUSK_SECTIONS }),
    );
    expect(text).toContain('failed');
    expect(text).toContain('[sections-recognised]');
    expect(text).toContain('recognised 2 of 23');
  });
});

describe('applyIntegrityToProvenance', () => {
  const entry = (kind: SectionKind, confidence: 'high' | 'degraded' | 'failed') => ({
    kind,
    sourcePages: [1],
    confidence,
  });
  const missing = (kind: SectionKind) => ({ kind, sourcePages: [], confidence: 'failed' as const });

  it('leaves a healthy document exactly as the sections reported themselves', () => {
    const sections = DRIMS_SECTION_CATALOGUE.map((k) => entry(k, 'high'));
    const integrity = checkDocumentIntegrity(healthy);
    expect(applyIntegrityToProvenance(sections, integrity, missing)).toEqual(sections);
  });

  it('gives every unfound section an entry, so absence cannot pass for absence of harm', () => {
    const integrity = checkDocumentIntegrity({ ...healthy, recognisedSections: HUSK_SECTIONS });
    const published = applyIntegrityToProvenance(
      HUSK_SECTIONS.map((k) => entry(k, 'high')),
      integrity,
      missing,
    );
    expect(published).toHaveLength(DRIMS_SECTION_CATALOGUE.length);
    const villages = published.find((p) => p.kind === 'villages-affected')!;
    expect(villages.confidence).toBe('failed');
    expect(villages.sourcePages).toEqual([]);
  });

  it('demotes the sections that WERE found — they are the husk, not the survivors', () => {
    const integrity = checkDocumentIntegrity({ ...healthy, recognisedSections: HUSK_SECTIONS });
    const published = applyIntegrityToProvenance(
      HUSK_SECTIONS.map((k) => entry(k, 'high')),
      integrity,
      missing,
    );
    // The check a UI already makes is now a document-level one.
    expect(published.every((p) => p.confidence === 'high')).toBe(false);
    expect(published.some((p) => p.confidence === 'high')).toBe(false);
  });

  it('degrades rather than fails when the document is merely not healthy', () => {
    const integrity = checkDocumentIntegrity({
      ...healthy,
      statewidePopulationAffected: unknownCount(),
    });
    const published = applyIntegrityToProvenance(
      DRIMS_SECTION_CATALOGUE.map((k) => entry(k, 'high')),
      integrity,
      missing,
    );
    expect(published.every((p) => p.confidence === 'degraded')).toBe(true);
  });

  it('never promotes a section that failed on its own account', () => {
    const integrity: DocumentIntegrity = {
      confidence: 'degraded',
      breaches: [{ check: 'statewide-population-present', severity: 'degraded', detail: 'x' }],
      missingSections: [],
    };
    const published = applyIntegrityToProvenance([entry('remarks', 'failed')], integrity, missing);
    expect(published[0]!.confidence).toBe('failed');
  });
});
