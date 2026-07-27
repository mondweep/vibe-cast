/**
 * Severity weights (FR-3.2).
 *
 * A District Commissioner weighting crop loss differently from the State
 * Control Room is legitimate, not a bug — so the weights are editable, and the
 * copy says out loud that our defaults are a stated starting point rather than
 * an ASDMA figure or a claim of objectivity. The product's honesty about its
 * own arithmetic is a feature (PRD §9).
 */

import {
  DEFAULT_SEVERITY_WEIGHTS,
  SEVERITY_COMPONENT_LABELS,
  type SeverityComponentKey,
  type SeverityWeights,
} from './view-models';

export type SeverityWeightsProps = {
  readonly weights: SeverityWeights;
  readonly onChange: (weights: SeverityWeights) => void;
  readonly onReset: () => void;
};

const COMPONENT_ORDER: readonly SeverityComponentKey[] = [
  'affectedPopulation',
  'villagesAffected',
  'cropArea',
  'campLoad',
  'casualties',
];

export const SeverityWeightsPanel = ({
  weights,
  onChange,
  onReset,
}: SeverityWeightsProps) => {
  const total = COMPONENT_ORDER.reduce((sum, key) => sum + weights[key], 0);
  const isDefault = COMPONENT_ORDER.every(
    (key) => Math.abs(weights[key] - DEFAULT_SEVERITY_WEIGHTS[key]) < 1e-9,
  );

  return (
    <section className="panel" aria-labelledby="weights-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="weights-heading">
          Severity Index weights
        </h2>
        <button type="button" className="derivation__toggle" onClick={onReset}>
          Reset to starting weights
        </button>
      </div>

      <div className="callout callout--assumption" style={{ marginBottom: 'var(--s-3)' }}>
        <p className="callout__title">These weights are ours, not ASDMA's.</p>
        <p className="text-small">
          The Severity Index does not appear in the bulletin. The starting weights below —
          Affected Population 0.35, Villages Affected 0.15, Crop Area Submerged 0.15, Camp Load
          0.20, Casualties 0.15 — are a stated starting point, not an official ASDMA figure and
          not a claim of objectivity. Change them to match the decision you are making.
        </p>
      </div>

      {COMPONENT_ORDER.map((key) => (
        <div className="weights__row" key={key}>
          <label htmlFor={`weight-${key}`}>{SEVERITY_COMPONENT_LABELS[key]}</label>
          <input
            id={`weight-${key}`}
            className="weights__slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights[key]}
            onChange={(event) =>
              onChange({ ...weights, [key]: Number(event.target.value) })
            }
          />
          <output className="weights__value" htmlFor={`weight-${key}`}>
            {weights[key].toFixed(2)}
          </output>
        </div>
      ))}

      <div className="weights__total">
        <span>
          Weights sum to <strong className="figure">{total.toFixed(2)}</strong>
          {Math.abs(total - 1) > 0.001 ? ' — components are rescaled to sum to 1.' : '.'}
        </span>
        <span className="text-muted">
          {isDefault ? 'Starting weights' : 'Adjusted from the starting weights'}
        </span>
      </div>

      <p className="text-small text-muted" style={{ marginTop: 'var(--s-2)' }}>
        Each component is min–max normalised within this bulletin only, so the index ranks
        Districts against each other on this date. It is not an absolute score and cannot be
        compared across bulletins.
      </p>
    </section>
  );
};
