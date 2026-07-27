/**
 * Situation Summary (FR-2.1) — the screen the console exists for.
 *
 * The bulletin puts 445,495 affected on page 1 and 28,695 Inmates on page 2,
 * and never relates them. The relationship is the whole insight, so the
 * derived gap gets *the same tile, the same grid cell, the same font size* as
 * the reported total. Not a sub-figure, not a footnote, not a tooltip: a
 * District Commissioner glancing at this screen sees 445,495 and 365,023 at
 * once, and the second number is the one that tells them what to do.
 */

import { CasualtyPanel } from './casualty-panel';
import { DerivedBadge, DerivedBadgeFor } from './derived-badge';
import { Provenance } from './provenance';
import {
  formatDerived,
  formatNumber,
  formatPercent,
  formatReported,
  type DerivedFigure,
  type ProvenanceRef,
  type ReportedFigure,
  type SituationSummaryViewModel,
} from './view-models';

export type SituationSummaryProps = {
  readonly summary: SituationSummaryViewModel;
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
};

const ReportedCell = ({
  figure,
  onOpenPage,
}: {
  readonly figure: ReportedFigure;
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
}) => (
  <div className="figure-cell">
    <span className="figure-cell__label">{figure.label}</span>
    <span className="figure-cell__value">{formatReported(figure)}</span>
    <div className="figure-cell__meta">
      {figure.note ? <span className="text-micro text-muted">{figure.note}</span> : null}
      {figure.provenance ? (
        <Provenance source={figure.provenance} onOpenPage={onOpenPage} />
      ) : null}
    </div>
  </div>
);

const DerivedCell = ({ figure }: { readonly figure: DerivedFigure }) => (
  <div className="figure-cell figure-cell--derived">
    <span className="figure-cell__label">{figure.label}</span>
    <span className="figure-cell__value">{formatDerived(figure)}</span>
    <div className="figure-cell__meta">
      <DerivedBadgeFor figure={figure} />
    </div>
  </div>
);

export const SituationSummary = ({ summary, onOpenPage }: SituationSummaryProps) => {
  const gap = summary.unshelteredAffected;
  const gapShare = formatPercent(summary.unshelteredShare);
  const affected = formatReported(summary.affectedPopulation);

  return (
    <div className="panel-stack">
      {/* --- The two headline figures, at equal weight ------------------ */}
      <section className="headline" aria-label="Headline figures">
        <article className="headline__tile headline__tile--reported">
          <h2 className="headline__label">Population Affected</h2>
          <p className="headline__value" data-headline="reported">
            {affected}
          </p>
          <p className="headline__caption">
            Reported by ASDMA{summary.affectedPopulation.note ? ` · ${summary.affectedPopulation.note}` : ''}
          </p>
          <div className="headline__meta">
            {summary.affectedPopulation.provenance ? (
              <Provenance
                source={summary.affectedPopulation.provenance}
                onOpenPage={onOpenPage}
              />
            ) : null}
          </div>
        </article>

        <article className="headline__tile headline__tile--gap">
          <h2 className="headline__label">
            Not in any Relief Camp or Relief Distribution Centre
          </h2>
          <p className="headline__value" data-headline="derived-gap">
            {gap.value === undefined ? '—' : formatNumber(gap.value)}
          </p>
          <p className="headline__caption">
            <strong className="headline__share">{gapShare}</strong> of the affected
            population. {gap.value === undefined ? '' : `${formatNumber(gap.value)} people `}
            affected but not in any Relief Camp or Relief Distribution Centre.
          </p>
          <div className="headline__meta">
            <DerivedBadge
              formula={gap.formula}
              workings={gap.workings}
              context={gap.context}
              label="Derived — not an ASDMA figure"
            />
          </div>
        </article>
      </section>

      {/* --- Where the affected population actually is ------------------ */}
      <section className="panel" aria-labelledby="shelter-split-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="shelter-split-heading">
            Where the affected population is recorded
          </h2>
          <span className="panel__note">
            Widths are proportions of {affected} affected
          </span>
        </div>
        <div className="split-bar" role="img" aria-label={summary.shelterSplit
          .map((segment) => `${segment.label}: ${segment.value === undefined ? 'not reported' : formatNumber(segment.value)}, ${formatPercent(segment.share)}`)
          .join('; ')}
        >
          {summary.shelterSplit.map((segment) => (
            <div
              key={segment.key}
              className={`split-bar__segment split-bar__segment--${segment.key}`}
              data-segment={segment.key}
              style={{ width: `${(segment.share * 100).toFixed(2)}%` }}
            />
          ))}
        </div>
        <ul className="split-legend">
          {summary.shelterSplit.map((segment) => (
            <li className="split-legend__item" key={segment.key}>
              <span
                className={`split-legend__swatch split-bar__segment--${segment.key}`}
                aria-hidden="true"
              />
              <span>
                {segment.label}{' '}
                <strong className="figure">
                  {segment.value === undefined ? '—' : formatNumber(segment.value)}
                </strong>{' '}
                <span className="text-muted">({formatPercent(segment.share)})</span>
              </span>
              {segment.derived ? (
                <DerivedBadge
                  formula={gap.formula}
                  workings={gap.workings}
                  label="Derived"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* --- Reported figures ------------------------------------------- */}
      <section className="panel" aria-labelledby="reported-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="reported-heading">
            Reported by ASDMA
          </h2>
          <span className="panel__note">Report Generated On: {summary.generatedAt}</span>
        </div>
        <div className="figure-grid">
          {summary.reportedFigures.map((figure) => (
            <ReportedCell key={figure.key} figure={figure} onOpenPage={onOpenPage} />
          ))}
        </div>
      </section>

      {/* --- Derived decision metrics ------------------------------------ */}
      <section className="panel" aria-labelledby="derived-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="derived-heading">
            Derived decision metrics
          </h2>
          <span className="panel__note">
            Computed by this console from the figures above. Not ASDMA figures.
          </span>
        </div>
        <div className="figure-grid">
          {summary.derivedMetrics.map((figure) => (
            <DerivedCell key={figure.key} figure={figure} />
          ))}
        </div>
      </section>

      <div className="headline">
        {/* --- Rivers (leading indicator) -------------------------------- */}
        <section className="panel" aria-labelledby="rivers-heading">
          <div className="panel__head">
            <h2 className="panel__title" id="rivers-heading">
              Rivers above Danger Level / HFL
            </h2>
            <span className="panel__note">{summary.rivers.attribution}</span>
          </div>
          <h3>Above Danger Level</h3>
          <ul className="text-small">
            {summary.rivers.aboveDangerLevel.length === 0 ? (
              <li className="text-muted">Nil</li>
            ) : (
              summary.rivers.aboveDangerLevel.map((river) => <li key={river}>{river}</li>)
            )}
          </ul>
          <h3 style={{ marginTop: 'var(--s-2)' }}>Above Highest Flood Level</h3>
          <ul className="text-small">
            {summary.rivers.aboveHighestFloodLevel.length === 0 ? (
              <li className="text-muted">Nil</li>
            ) : (
              summary.rivers.aboveHighestFloodLevel.map((river) => (
                <li key={river}>{river}</li>
              ))
            )}
          </ul>
        </section>

        <CasualtyPanel
          casualties={summary.casualties}
          scope="Statewide"
          onOpenPage={onOpenPage}
        />
      </div>

      {/* --- Data quality ------------------------------------------------ */}
      {summary.reconciliationWarnings.length > 0 || summary.unreadableSections.length > 0 ? (
        <section className="callout callout--warning" aria-labelledby="quality-heading">
          <p className="callout__title" id="quality-heading">
            Data quality — {summary.reconciliationWarnings.length} reconciliation warning
            {summary.reconciliationWarnings.length === 1 ? '' : 's'},{' '}
            {summary.unreadableSections.length} section
            {summary.unreadableSections.length === 1 ? '' : 's'} could not be read
          </p>
          <ul className="callout__list">
            {summary.reconciliationWarnings.map((warning) => (
              <li key={`${warning.sectionLabel}-${warning.column}`}>
                <strong>{warning.sectionLabel}</strong> — {warning.column}: ASDMA's printed
                total <span className="figure">{formatNumber(warning.statedTotal)}</span> vs our
                sum of the District rows{' '}
                <span className="figure">{formatNumber(warning.computedTotal)}</span>{' '}
                (difference{' '}
                <span className="figure">
                  {formatNumber(Math.abs(warning.statedTotal - warning.computedTotal))}
                </span>
                ). ASDMA's figure is shown unchanged.
              </li>
            ))}
            {summary.unreadableSections.map((section) => (
              <li key={section.section}>
                <strong>{section.sectionLabel}</strong> could not be read — shown as not
                reported, never as zero. <Provenance source={section} onOpenPage={onOpenPage} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
