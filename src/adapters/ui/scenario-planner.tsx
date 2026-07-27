/**
 * Scenario Planner (FR-4.1, FR-4.3, FR-4.6, FR-4.7).
 *
 * The console's forward-looking half — and the place where it could most
 * easily mislead. Officers must never read a projection as a forecast, so:
 *
 *  - Baseline and projected sit side by side in the same row. There is no
 *    layout in which a projected figure appears on its own.
 *  - Projected figures are typographically distinct (italic, monospace, tinted
 *    cell) *and* carry a literal "projected" tag. Three channels, so the
 *    distinction survives greyscale and a bad projector.
 *  - Every projected figure carries a plain-language derivation, expandable in
 *    place. A projection a user cannot interrogate is one they should not
 *    trust.
 */

import { useState } from 'react';
import { TableScroll } from './table-scroll';
import {
  formatNumber,
  type FirstFailurePointViewModel,
  type ScenarioComparisonRow,
  type ScenarioLeversViewModel,
} from './view-models';

export type ScenarioPlannerProps = {
  readonly levers: ScenarioLeversViewModel;
  readonly onLeverChange: (patch: Partial<ScenarioLeversViewModel>) => void;
  readonly comparisons: readonly ScenarioComparisonRow[];
  /** e.g. "Assam Flood Report as on 2026-07-27" — always a real bulletin. */
  readonly baselineLabel: string;
  readonly firstFailure?: FirstFailurePointViewModel | null;
  readonly scenarioName?: string;
  readonly onScenarioNameChange?: (name: string) => void;
};

type Lever = {
  readonly key: keyof ScenarioLeversViewModel;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
};

const LEVERS: readonly Lever[] = [
  {
    key: 'populationGrowthPercent',
    label: 'Affected Population growth',
    min: 0,
    max: 200,
    step: 5,
    format: (value) => `+${formatNumber(value)}%`,
  },
  {
    key: 'campUptakePercent',
    label: 'Camp Uptake Rate',
    min: 0,
    max: 100,
    step: 1,
    format: (value) => `${formatNumber(value, 1)}%`,
  },
  {
    key: 'durationDays',
    label: 'Sustained for',
    min: 1,
    max: 30,
    step: 1,
    format: (value) => `${formatNumber(value)} days`,
  },
  {
    key: 'rationNormKgPerPersonPerDay',
    label: 'Ration norm (rice per person per day)',
    min: 0.1,
    max: 2,
    step: 0.05,
    format: (value) => `${value.toFixed(2)} kg`,
  },
  {
    key: 'additionalCampCapacity',
    label: 'Additional Relief Camps opened',
    min: 0,
    max: 500,
    step: 10,
    format: (value) => formatNumber(value),
  },
];

const DIRECTION_TAG: Record<ScenarioComparisonRow['direction'], string> = {
  worse: '▲ worse',
  better: '▼ better',
  unchanged: '– unchanged',
};

export const ScenarioPlanner = ({
  levers,
  onLeverChange,
  comparisons,
  baselineLabel,
  firstFailure,
  scenarioName,
  onScenarioNameChange,
}: ScenarioPlannerProps) => {
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  const toggle = (key: string) =>
    setExpanded((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  return (
    <div className="scenario">
      <section className="panel" aria-labelledby="levers-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="levers-heading">
            Scenario levers
          </h2>
        </div>

        {onScenarioNameChange ? (
          <div className="assumption" style={{ marginBottom: 'var(--s-2)' }}>
            <label htmlFor="scenario-name">Scenario name</label>
            <input
              id="scenario-name"
              type="text"
              value={scenarioName ?? ''}
              onChange={(event) => onScenarioNameChange(event.target.value)}
            />
          </div>
        ) : null}

        {LEVERS.map((lever) => (
          <div className="levers__row" key={lever.key}>
            <span className="levers__label">
              <label htmlFor={`lever-${lever.key}`}>{lever.label}</label>
              <output className="levers__readout" htmlFor={`lever-${lever.key}`}>
                {lever.format(levers[lever.key])}
              </output>
            </span>
            <input
              id={`lever-${lever.key}`}
              type="range"
              min={lever.min}
              max={lever.max}
              step={lever.step}
              value={levers[lever.key]}
              onChange={(event) =>
                onLeverChange({ [lever.key]: Number(event.target.value) })
              }
            />
          </div>
        ))}

        <p className="text-small text-muted" style={{ marginTop: 'var(--s-2)' }}>
          This is not a forecast. It projects the consequences of the assumptions above,
          anchored to {baselineLabel}. Nothing here predicts rainfall or river levels.
        </p>
      </section>

      <div className="panel-stack">
        {firstFailure ? (
          <section className="callout callout--danger" aria-labelledby="first-failure-heading">
            <p className="callout__title" id="first-failure-heading">
              First failure point: {firstFailure.district}
            </p>
            <p className="text-small">
              {firstFailure.description}
              {firstFailure.dayIndex === undefined
                ? ''
                : ` Reached on day ${formatNumber(firstFailure.dayIndex)} of the scenario.`}
            </p>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="comparison-heading">
          <div className="panel__head">
            <h2 className="panel__title" id="comparison-heading">
              Baseline vs projected
            </h2>
            <span className="panel__note">
              Projected figures are shown only alongside their baseline, never on their own.
            </span>
          </div>

          <TableScroll label="Baseline vs projected table">
            <table className="data-table comparison">
              <caption>
                Baseline is {baselineLabel}, as reported by ASDMA. Projected figures are computed
                by this console from the levers on the left.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col" className="numeric comparison__baseline-head">
                    Baseline (reported)
                  </th>
                  <th scope="col" className="numeric comparison__projected-head">
                    Projected
                  </th>
                  <th scope="col">Direction</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => {
                  const open = expanded.includes(row.key);
                  const derivationId = `derivation-${row.key}`;
                  return (
                    <tr key={row.key} data-metric={row.key}>
                      <th scope="row">{row.metric}</th>
                      <td className="numeric" data-cell="baseline">
                        <span className="figure">{row.baseline}</span>
                      </td>
                      <td className="numeric comparison__projected" data-cell="projected">
                        <span className="projected-figure">
                          {row.projected}
                          <span className="figure-tag">projected</span>
                        </span>
                        <div>
                          <button
                            type="button"
                            className="derivation__toggle"
                            aria-expanded={open}
                            aria-controls={derivationId}
                            title={row.derivation}
                            onClick={() => toggle(row.key)}
                          >
                            {open ? 'Hide derivation' : 'Show derivation'}
                          </button>
                        </div>
                        {open ? (
                          <p className="derivation" id={derivationId}>
                            {row.derivation}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <span className="text-small">{DIRECTION_TAG[row.direction]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </section>
      </div>
    </div>
  );
};
