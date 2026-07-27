/**
 * ASDMA's own section headings, and the provenance lookup built on them.
 *
 * The console shows the heading the officer will find in the PDF, not our
 * internal `SectionKind`. Nothing is invented here: the strings are the
 * bulletin's, taken from PRD Appendix A.
 */

import type {
  FloodSituationReport,
  SectionKind,
} from '../domain/shared/flood-situation-report';
import type { ProvenanceRef, SectionConfidenceViewModel } from '../adapters/ui/view-models';

export const SECTION_LABELS: Record<SectionKind, string> = {
  'rivers-above-danger-level': 'Rivers Flowing Above Danger Level',
  'districts-affected': 'Districts Affected',
  'revenue-circles-affected': 'Revenue Circles Affected',
  'villages-affected': 'Villages Affected',
  'population-and-crop-area-submerged': 'Population and Crop Area Submerged',
  'relief-camps-opened': 'Relief Camps / Centres Opened',
  'inmates-in-relief-camps': 'Inmates in Relief Camps',
  'non-camp-inmates': 'Non-Camp Inmates',
  'lives-lost-confirmed': 'Human Lives Lost — Confirmed',
  'lives-lost-missing': 'Human Lives Lost — Missing',
  'animals-affected': 'Animals Affected',
  'animals-washed-away': 'Animals Washed Away',
  'houses-damaged': 'Houses Damaged',
  'houses-damaged-others': 'Houses Damaged — Others',
  'rescue-operation': 'Rescue Operation',
  'relief-distributed': 'Relief Distributed',
  'relief-distributed-others': 'Relief Distributed — Others',
  'infrastructure-road': 'Infrastructure Damaged — Road',
  'infrastructure-bridge': 'Infrastructure Damaged — Bridge',
  'infrastructure-embankment-breached': 'Infrastructure Damaged — Embankment Breached',
  'infrastructure-embankment-affected': 'Infrastructure Damaged — Embankment Affected',
  'infrastructure-others': 'Infrastructure Damaged — Others',
  remarks: 'Remarks',
};

/**
 * The provenance of one section, or `undefined` when the parse never located it.
 *
 * Deliberately `undefined` rather than a fabricated "page 1": a citation to a
 * page we did not read from would be worse than no citation at all.
 */
export const provenanceOf = (
  report: FloodSituationReport,
  section: SectionKind,
): ProvenanceRef | undefined => {
  const found = report.provenance.find((entry) => entry.kind === section);
  if (found === undefined) return undefined;
  return {
    section: found.kind,
    sectionLabel: SECTION_LABELS[found.kind],
    sourcePages: found.sourcePages,
    confidence: found.confidence,
  };
};

export const sectionConfidences = (
  report: FloodSituationReport,
): readonly SectionConfidenceViewModel[] =>
  report.provenance.map((entry) => ({
    section: entry.kind,
    sectionLabel: SECTION_LABELS[entry.kind],
    sourcePages: entry.sourcePages,
    confidence: entry.confidence,
  }));

/** Only the sections that could not be read at all (PRD §5.1 invariant 4). */
export const unreadableSections = (
  report: FloodSituationReport,
): readonly SectionConfidenceViewModel[] =>
  sectionConfidences(report).filter((section) => section.confidence === 'failed');
