/**
 * Bulletin loader (FR-1.1, FR-1.8).
 *
 * Drag-and-drop or file picker. This component knows nothing about PDFs: it
 * hands the `File` to an injected `onLoad` and renders whatever state the host
 * gives back. Parsing lives behind the `BulletinSource` port.
 *
 * Extraction confidence and reconciliation warnings are rendered *before* the
 * data, not tucked into a settings pane. A degraded section that an officer
 * does not notice is worse than no data at all (PRD §5.1, invariant 3).
 */

/**
 * Where the bulletin comes from. The URL, and the reasons it is a link for a
 * human to click and never something this app fetches, are documented at the
 * single point of definition in `bulletin-reload.tsx`.
 */
import { SDRF_DOWNLOAD_URL } from './bulletin-reload';

/**
 * The geo-restriction is stated in both variants, at different lengths. The
 * header has 2.75rem to work in (NFR-11 budgets the console for a 1366x768
 * projector), so the compact note is trimmed to the part a user cannot afford
 * to miss: clicking this from outside India fails, and that is the site, not
 * this console.
 */
const SourceLink = ({ compact }: { readonly compact: boolean }) => (
  <p className="loader__source" data-compact={compact ? 'true' : 'false'}>
    <a
      className="loader__source-link"
      href={SDRF_DOWNLOAD_URL}
      target="_blank"
      rel="noreferrer"
    >
      Download the latest bulletin from SDRF Assam
    </a>{' '}
    {compact ? (
      <span className="text-micro text-muted">Reachable only from India.</span>
    ) : (
      <span className="text-small text-muted">
        Downloads the newest Daily Flood Report straight from SDRF Assam. The site is reachable
        only from India — from elsewhere you will need an India VPN, or a colleague to send you
        the PDF.
      </span>
    )}
  </p>
);

import { useRef, useState, type DragEvent } from 'react';
import { Provenance } from './provenance';
import {
  CONFIDENCE_LABELS,
  formatNumber,
  type BulletinLoaderState,
  type ReconciliationWarningViewModel,
  type SectionConfidenceViewModel,
} from './view-models';

export type BulletinLoaderProps = {
  readonly state: BulletinLoaderState;
  readonly onLoad: (file: File) => void;
  /** Compact rendering for the header once a bulletin is already loaded. */
  readonly compact?: boolean;
};

const ReconciliationWarnings = ({
  warnings,
}: {
  readonly warnings: readonly ReconciliationWarningViewModel[];
}) => {
  if (warnings.length === 0) return null;
  return (
    <section className="callout callout--warning" aria-labelledby="reconciliation-heading">
      <p className="callout__title" id="reconciliation-heading">
        {warnings.length} reconciliation warning{warnings.length === 1 ? '' : 's'} — ASDMA's
        printed Total does not match our sum of the District rows
      </p>
      <ul className="callout__list">
        {warnings.map((warning) => (
          <li key={`${warning.sectionLabel}-${warning.column}`}>
            <strong>{warning.sectionLabel}</strong> — {warning.column}: stated{' '}
            <span className="figure">{formatNumber(warning.statedTotal)}</span>, we summed{' '}
            <span className="figure">{formatNumber(warning.computedTotal)}</span> (difference{' '}
            <span className="figure">
              {formatNumber(Math.abs(warning.statedTotal - warning.computedTotal))}
            </span>
            ). The section is marked Degraded; the data is kept, not discarded.
          </li>
        ))}
      </ul>
    </section>
  );
};

const SectionConfidence = ({
  sections,
}: {
  readonly sections: readonly SectionConfidenceViewModel[];
}) => {
  const failed = sections.filter((section) => section.confidence === 'failed');
  const degraded = sections.filter((section) => section.confidence === 'degraded');

  return (
    <section className="panel" aria-labelledby="confidence-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="confidence-heading">
          Extraction confidence by section
        </h2>
        <span className="panel__note">
          {sections.length} sections · {degraded.length} degraded · {failed.length} could not
          be read
        </span>
      </div>
      <ul className="section-confidence">
        {sections.map((section) => (
          <li className="section-confidence__row" key={section.section}>
            <span>{section.sectionLabel}</span>
            <span className="text-micro text-muted">{CONFIDENCE_LABELS[section.confidence]}</span>
            <Provenance source={section} />
          </li>
        ))}
      </ul>
      {failed.length > 0 ? (
        <p className="text-small" style={{ marginTop: 'var(--s-2)' }}>
          Sections that could not be read are shown throughout the console as “not reported”.
          They are never rendered as zero.
        </p>
      ) : null}
    </section>
  );
};

export const BulletinLoader = ({ state, onLoad, compact = false }: BulletinLoaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  /** `FileList` from the picker, a plain array-like from a drop. Both index. */
  const takeFirstFile = (files: ArrayLike<File> | null | undefined) => {
    const file = files && files.length > 0 ? files[0] : undefined;
    if (file) onLoad(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    takeFirstFile(event.dataTransfer?.files ?? null);
  };

  return (
    <div className="panel-stack">
      <div
        className="loader__dropzone"
        data-testid="bulletin-dropzone"
        data-status={state.status}
        data-dragging={dragging ? 'true' : 'false'}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {!compact ? (
          <>
            <p className="loader__headline">Load an ASDMA Daily Flood Report</p>
            <p className="text-small text-muted">
              Drag the DRIMS PDF here, or choose it below. The file is read in this browser
              and never uploaded.
            </p>
          </>
        ) : null}

        <button
          type="button"
          className="loader__button"
          onClick={() => inputRef.current?.click()}
        >
          Choose bulletin PDF
        </button>

        {/* Full mode only. The header is 2.75rem under NFR-11 and the source
            link plus its geo-restriction note cannot fit; the compact loader
            rendered 156px tall inside a 44px header, clipping its own button
            off the top of the viewport and spilling its status line over the
            content beneath. The staleness banner already carries the link and
            the reload button in full, directly beside the sentence saying the
            bulletin is old — which is the better place for it anyway. */}
        {!compact ? <SourceLink compact={compact} /> : null}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="visually-hidden"
          aria-label="Bulletin PDF"
          onChange={(event) => takeFirstFile(event.target.files)}
        />

        <div role="status" aria-live="polite" className="loader__status">
          {/* Only in full mode. In the header this sat beside a title reading
              "Assam Flood Report as on 2026-07-27" and flatly contradicted it:
              a bulletin *is* on screen, the officer simply has not loaded one
              of their own. The staleness banner names the bundled example
              explicitly, so nothing is lost by staying quiet here. */}
          {state.status === 'idle' && !compact ? (
            <span className="text-muted">No bulletin loaded</span>
          ) : null}
          {state.status === 'parsing' ? <span>Reading {state.fileName}…</span> : null}
          {state.status === 'loaded' ? (
            <span>
              Loaded {state.fileName} — Assam Flood Report as on{' '}
              <span className="figure">{state.reportDate}</span>
            </span>
          ) : null}
        </div>
      </div>

      {state.status === 'error' ? (
        <section className="callout callout--danger" role="alert">
          <p className="callout__title">Could not read this bulletin</p>
          <p>{state.message}</p>
          {state.fileName ? (
            <p className="text-small text-muted">File: {state.fileName}</p>
          ) : null}
        </section>
      ) : null}

      {state.status === 'loaded' ? (
        <>
          <ReconciliationWarnings warnings={state.reconciliationWarnings} />
          <SectionConfidence sections={state.sections} />
        </>
      ) : null}
    </div>
  );
};
