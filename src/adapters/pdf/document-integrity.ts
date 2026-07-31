/**
 * Document-level completeness — the safety net ADR-0002 promised and did not
 * deliver.
 *
 * ADR-0002 claims reconciliation "converts silent corruption into a visible
 * warning". It does not, and cannot, catch the worst failure mode this parser
 * has. Reconciliation validates *within* a section: it sums the district rows
 * of a table it found and compares them to the Total row of that same table.
 * It has no opinion about a table it never found. So when the 2026-07-25 and
 * 2026-07-26 bulletins were read with a mislocated Particulars gutter, 21 of
 * the 23 sections were never recognised at all, the two that were recognised
 * were assembled out of Remarks prose, and every check the parser owned passed:
 * zero reconciliation failures, every section `high`, a bulletin with no
 * statewide population total and 46 districts in a state that has 35,
 * presenting as a healthy report.
 *
 * That is a design gap, not a coding slip: a per-section check can only ever
 * see the sections that exist. The missing invariant is about the document.
 *
 * Five questions are asked here, each of which would independently have caught
 * that failure:
 *
 *  1. Was the geometry measured, or guessed? Every column band in the document
 *     is cut relative to the Particulars gutter. If the gutter could not be
 *     located and a constant was substituted for it, nothing below is evidence
 *     — and on 2026-07-25 the substituted constant happened to land right of
 *     the District column, which is precisely how the husk was made. This is
 *     the *cause* the other four questions detect the *symptoms* of, and it is
 *     asked first because it is the only one that can be answered before the
 *     document has been misread.
 *  2. Were the sections found? A DRIMS bulletin always contains the whole
 *     catalogue. Two of twenty-three is not a bulletin we read.
 *  3. Are the districts possible? Assam has 35 districts. A bulletin naming 46
 *     has not been read, it has been misread.
 *  4. Are the district *names* names? A district is a proper noun of a couple
 *     of words. `(Sonari - Additional reports are currently being prepared and
 *     will be submitted tomorrow upon completion.)` is a sentence that reached
 *     the District column because the column was in the wrong place.
 *  5. Is the headline figure there? Statewide population affected is the one
 *     number every DRIMS bulletin states. Its absence is not a quiet day.
 *
 * Nothing here drops, zeroes or repairs anything (ADR-0005). A breach does not
 * delete the 46 districts; it refuses to call them trustworthy.
 */

import type { ExtractionConfidence, SectionKind } from '../../domain/shared/flood-situation-report';
import { isKnown, type Count } from '../../domain/shared/quantity';

/**
 * Every section a DRIMS bulletin contains, in the order it prints them.
 *
 * This is the catalogue completeness is measured against, and it is the source
 * of the `SectionKind` ordering used when provenance is made exhaustive.
 */
export const DRIMS_SECTION_CATALOGUE: readonly SectionKind[] = [
  'rivers-above-danger-level',
  'districts-affected',
  'revenue-circles-affected',
  'villages-affected',
  'population-and-crop-area-submerged',
  'relief-camps-opened',
  'inmates-in-relief-camps',
  'non-camp-inmates',
  'lives-lost-confirmed',
  'lives-lost-missing',
  'animals-affected',
  'animals-washed-away',
  'houses-damaged',
  'houses-damaged-others',
  'rescue-operation',
  'relief-distributed',
  'relief-distributed-others',
  'infrastructure-road',
  'infrastructure-bridge',
  'infrastructure-embankment-breached',
  'infrastructure-embankment-affected',
  'infrastructure-others',
  'remarks',
];

/**
 * Assam has 35 districts (33 of the 2011 census, plus Bajali and Tamulpur).
 * ASDMA cannot report more, so a parse that produces more has not read the
 * District column — it has read something else and called it a district.
 */
export const ASSAM_DISTRICT_COUNT = 35;

/**
 * The longest district name Assam has is `South Salmara Mankachar` (23
 * characters); ASDMA's own longest spelling is `Kamrup (M)`. Forty is roughly
 * twice the real maximum — wide enough that no genuine name and no plausible
 * future district can trip it, narrow enough that the 453- and 863-character
 * strings the mislocated gutter produced cannot hide.
 */
export const MAX_DISTRICT_NAME_LENGTH = 40;

/**
 * Punctuation that ends a clause. No Assam district name contains any of it;
 * prose that has leaked into the District column almost always does, and does
 * so long before it reaches the length limit.
 */
const SENTENCE_PUNCTUATION = /[.;:!?]/;

/**
 * A document that recognises less than two thirds of the catalogue has not
 * been read. Above that floor a shortfall is still reported — a section we did
 * not find is a section we could not read — but the document is `degraded`
 * rather than `failed`, because the sections we did find may still be sound.
 */
export const MINIMUM_RECOGNISED_SECTION_RATIO = 2 / 3;

export const minimumRecognisedSections = (): number =>
  Math.ceil(DRIMS_SECTION_CATALOGUE.length * MINIMUM_RECOGNISED_SECTION_RATIO);

/** Which invariant a document broke. */
export type IntegrityCheck =
  | 'table-geometry-measured'
  | 'sections-recognised'
  | 'district-count-within-assam'
  | 'district-names-are-names'
  | 'statewide-population-present';

/**
 * Where the geometry the document was cut with came from.
 *
 * Deliberately two states and not a number: this module judges the parse, and
 * what it needs to know about the Particulars gutter is not *where* the parser
 * put it but *whether the parser found it or invented it*. A guess may happen
 * to be right; it is never evidence, because nothing distinguishes the run
 * where it landed inside the channel from the run where it landed right of the
 * District column. `detail` carries the measurement's own account of why it
 * failed, so the breach names a cause rather than an alarm.
 */
export type TableGeometry =
  | { readonly kind: 'measured' }
  | { readonly kind: 'guessed'; readonly detail: string };

/**
 * One broken invariant, with enough detail to be interrogable rather than
 * merely alarming — the same standard `ReconciliationFailure` is held to.
 */
export type IntegrityBreach = {
  readonly check: IntegrityCheck;
  /** How bad: `failed` means nothing in the document can be trusted. */
  readonly severity: Extract<ExtractionConfidence, 'degraded' | 'failed'>;
  /** Human-readable, and always names the observed value. */
  readonly detail: string;
};

export type DocumentIntegrity = {
  readonly confidence: ExtractionConfidence;
  readonly breaches: readonly IntegrityBreach[];
  /** Catalogue sections the recogniser never found. Possibly empty. */
  readonly missingSections: readonly SectionKind[];
};

export type DocumentIntegrityInput = {
  /**
   * Whether the Particulars gutter was measured from the document or guessed.
   *
   * Not optional, and deliberately so: a caller that forgets to state it will
   * not compile, which is the only way a "we guessed" can never again reach
   * this function as silence.
   */
  readonly tableGeometry: TableGeometry;
  /** The section kinds the recogniser actually found, in any order. */
  readonly recognisedSections: readonly SectionKind[];
  /** The district names the parse produced, exactly as they will be published. */
  readonly districtNames: readonly string[];
  readonly statewidePopulationAffected: Count;
};

const implausibleName = (name: string): boolean =>
  name.length > MAX_DISTRICT_NAME_LENGTH || SENTENCE_PUNCTUATION.test(name);

const worst = (breaches: readonly IntegrityBreach[]): ExtractionConfidence => {
  if (breaches.some((b) => b.severity === 'failed')) return 'failed';
  if (breaches.length > 0) return 'degraded';
  return 'high';
};

/** Truncate a garbage "district name" so a diagnostic stays readable. */
const abbreviate = (name: string): string =>
  name.length <= 60 ? name : `${name.slice(0, 57)}...`;

/**
 * Judge a parsed document as a whole.
 *
 * Deliberately a pure function over what the parse produced, not over the PDF:
 * it is the *output* that has to be plausible, and every one of these questions
 * can be asked — and tested — without a single glyph coordinate.
 */
export const checkDocumentIntegrity = (input: DocumentIntegrityInput): DocumentIntegrity => {
  const breaches: IntegrityBreach[] = [];

  if (input.tableGeometry.kind === 'guessed') {
    breaches.push({
      check: 'table-geometry-measured',
      // Every band in every section was cut relative to a number we invented.
      // A parse whose geometry was guessed is not a degraded parse, it is an
      // unattributable one: the sections it found may be sound or may be prose,
      // and nothing in the output tells the two apart.
      severity: 'failed',
      detail:
        'the Particulars gutter was guessed, not measured, so every column band ' +
        `in the document is unattributable — ${input.tableGeometry.detail}`,
    });
  }

  const recognised = new Set(input.recognisedSections);
  const missingSections = DRIMS_SECTION_CATALOGUE.filter((kind) => !recognised.has(kind));
  const found = DRIMS_SECTION_CATALOGUE.length - missingSections.length;
  const floor = minimumRecognisedSections();

  if (missingSections.length > 0) {
    breaches.push({
      check: 'sections-recognised',
      // Below the floor the document is not a bulletin we read at all; the
      // sections we think we found were assembled from whatever the misplaced
      // gutter happened to contain.
      severity: found < floor ? 'failed' : 'degraded',
      detail:
        `recognised ${found} of ${DRIMS_SECTION_CATALOGUE.length} DRIMS sections` +
        `${found < floor ? ` (fewer than the ${floor} a readable bulletin must yield)` : ''}` +
        `; missing: ${missingSections.join(', ')}`,
    });
  }

  if (input.districtNames.length > ASSAM_DISTRICT_COUNT) {
    breaches.push({
      check: 'district-count-within-assam',
      severity: 'failed',
      detail:
        `${input.districtNames.length} districts, but Assam has ${ASSAM_DISTRICT_COUNT}` +
        ` — the District column was not read`,
    });
  }

  const nonsense = input.districtNames.filter(implausibleName);
  if (nonsense.length > 0) {
    breaches.push({
      check: 'district-names-are-names',
      severity: 'failed',
      detail:
        `${nonsense.length} district name(s) are not names, e.g. ` +
        `"${abbreviate(nonsense[0]!)}" (${nonsense[0]!.length} characters)`,
    });
  }

  if (!isKnown(input.statewidePopulationAffected)) {
    breaches.push({
      check: 'statewide-population-present',
      // Readable but not healthy: every DRIMS bulletin states this figure, so
      // its absence means we failed to read the section that carries it.
      severity: 'degraded',
      detail: 'no statewide population affected — every DRIMS bulletin states one',
    });
  }

  return { confidence: worst(breaches), breaches, missingSections };
};

/**
 * Publish the document-level verdict through the only channel the published
 * language has for it: `ExtractionConfidence`, per section.
 *
 * Two things happen, and both are the point.
 *
 * *Provenance becomes exhaustive.* Today a section the recogniser never found
 * simply does not appear, so "we found two sections" and "there were only two
 * sections" are indistinguishable to everything downstream — precisely the
 * blindness that let a husk render as a report. A catalogue section with no
 * entry is a section we could not read, so it gets one: `failed`, with no
 * source pages. Twenty-one such entries are hard to mistake for a good day.
 *
 * *A document-level breach demotes every section, including the ones that were
 * read cleanly.* That is not collateral damage, it is the finding: when 21 of
 * 23 sections were never found, the 2 that were are the two the parser
 * hallucinated out of a mislocated gutter, and they are the least trustworthy
 * things in the file. Confidence is per-section in the published language, so
 * the only honest way to write a verdict about the whole document is to write
 * it on all of it.
 *
 * A UI therefore needs no new vocabulary to refuse a husk: the check it
 * already makes — every section `high` — is now a true document-level one.
 */
export const applyIntegrityToProvenance = <
  P extends { readonly kind: SectionKind; readonly confidence: ExtractionConfidence },
>(
  sections: readonly P[],
  integrity: DocumentIntegrity,
  missingEntry: (kind: SectionKind) => P,
): readonly P[] => {
  const exhaustive = [...sections, ...integrity.missingSections.map(missingEntry)];
  if (integrity.confidence === 'high') return exhaustive;
  return exhaustive.map((section) =>
    section.confidence === 'failed' || integrity.confidence === 'failed'
      ? { ...section, confidence: 'failed' as const }
      : { ...section, confidence: 'degraded' as const },
  );
};

/** A one-line summary for a log or an error message. */
export const describeIntegrity = (integrity: DocumentIntegrity): string =>
  integrity.breaches.length === 0
    ? 'document integrity: high'
    : `document integrity: ${integrity.confidence} — ` +
      integrity.breaches.map((b) => `[${b.check}] ${b.detail}`).join('; ');
