/**
 * Provenance affordance (FR-2.8).
 *
 * ASDMA's bulletin stays authoritative, so every figure must be walkable back
 * to the page it came from. This renders the page reference and the section's
 * extraction confidence — the confidence is spelled out in words as well as
 * colour, because a degraded section on a washed-out projector must still read
 * as degraded (NFR-8).
 */

import { CONFIDENCE_LABELS, type ProvenanceRef } from './view-models';

const CONFIDENCE_TAG: Record<ProvenanceRef['confidence'], string> = {
  high: '',
  degraded: 'Degraded',
  failed: 'Unread',
};

export const formatPages = (pages: readonly number[]): string => {
  if (pages.length === 0) return 'page not recorded';
  if (pages.length === 1) return `p. ${pages[0]}`;
  const sorted = [...pages].sort((a, b) => a - b);
  const contiguous = sorted.every((page, i) => i === 0 || page === sorted[i - 1] + 1);
  return contiguous
    ? `pp. ${sorted[0]}–${sorted[sorted.length - 1]}`
    : `pp. ${sorted.join(', ')}`;
};

export type ProvenanceProps = {
  readonly source: ProvenanceRef;
  /** Supplied when the host can actually open the PDF at that page. */
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
};

export const Provenance = ({ source, onOpenPage }: ProvenanceProps) => {
  const pages = formatPages(source.sourcePages);
  const tag = CONFIDENCE_TAG[source.confidence];
  const description = `${source.sectionLabel}, ${pages} of the bulletin. ${
    CONFIDENCE_LABELS[source.confidence]
  }.`;
  const className = `provenance provenance--${source.confidence}`;

  const body = (
    <>
      <span aria-hidden="true">▤</span>
      <span aria-hidden="true">{pages}</span>
      {tag ? <span aria-hidden="true">· {tag}</span> : null}
      <span className="visually-hidden">{description}</span>
    </>
  );

  if (!onOpenPage) {
    return (
      <span className={className} data-confidence={source.confidence}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-confidence={source.confidence}
      title={`${description} Open this page.`}
      onClick={() => onOpenPage(source.sourcePages[0], source)}
    >
      {body}
    </button>
  );
};
