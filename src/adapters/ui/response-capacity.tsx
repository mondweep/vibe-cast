/**
 * Response Capacity — camp load, ration coverage, vulnerable load.
 *
 * The ration norm is an editable input, not a constant buried in code
 * (PRD §5.3, §4.5). 0.6 kg of rice per person per day follows SDRF relief-norm
 * convention, but a Relief & Logistics lead who disagrees must be able to
 * change it and watch coverage days move. An assumption you cannot argue with
 * is an assumption you cannot trust.
 */

import { DerivedBadgeFor } from './derived-badge';
import { TableScroll } from './table-scroll';
import {
  formatDerived,
  formatNumber,
  formatQuantity,
  type DerivedFigure,
  type ResponseCapacityViewModel,
} from './view-models';

export type ResponseCapacityProps = {
  readonly capacity: ResponseCapacityViewModel;
  /** Kilograms of rice per person per day. */
  readonly rationNorm: number;
  readonly onRationNormChange: (norm: number) => void;
};

const DerivedTile = ({
  figure,
  emphasis = false,
}: {
  readonly figure: DerivedFigure;
  readonly emphasis?: boolean;
}) => (
  <div className="figure-cell figure-cell--derived" data-figure={figure.key}>
    <span className="figure-cell__label">{figure.label}</span>
    <span
      className="figure-cell__value"
      style={emphasis ? { fontSize: 'var(--fs-hero)' } : undefined}
    >
      {formatDerived(figure)}
    </span>
    <div className="figure-cell__meta">
      <DerivedBadgeFor figure={figure} />
    </div>
  </div>
);

export const ResponseCapacity = ({
  capacity,
  rationNorm,
  onRationNormChange,
}: ResponseCapacityProps) => (
  <div className="panel-stack">
    <section className="panel" aria-labelledby="capacity-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="capacity-heading">
          Statewide response capacity
        </h2>
        <span className="panel__note">
          Relief Camps <strong className="figure">{formatQuantity(capacity.reliefCamps)}</strong>{' '}
          · Relief Distribution Centres{' '}
          <strong className="figure">
            {formatQuantity(capacity.reliefDistributionCentres)}
          </strong>{' '}
          · Inmates <strong className="figure">{formatQuantity(capacity.campInmates)}</strong> ·
          Non-Camp Inmates{' '}
          <strong className="figure">{formatQuantity(capacity.nonCampInmates)}</strong>
        </span>
      </div>

      <div className="figure-grid">
        <DerivedTile figure={capacity.rationCoverageDays} emphasis />
        <DerivedTile figure={capacity.campLoad} />
        <DerivedTile figure={capacity.vulnerableLoad} />
        <DerivedTile figure={capacity.rescueAssetRatio} />
      </div>
    </section>

    <section className="callout callout--assumption" aria-labelledby="ration-norm-heading">
      <p className="callout__title" id="ration-norm-heading">
        Ration norm — a visible, arguable assumption
      </p>
      <div className="assumption" style={{ marginTop: 'var(--s-2)' }}>
        <label htmlFor="ration-norm">Rice per person per day</label>
        <input
          id="ration-norm"
          className="assumption__input"
          type="number"
          min={0.1}
          max={3}
          step={0.05}
          value={rationNorm}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next > 0) onRationNormChange(next);
          }}
        />
        <span>kg</span>
        <span className="text-small text-muted">
          0.6 kg follows SDRF relief-norm convention. It is an assumption of this console, not
          an ASDMA figure. Change it and Ration Coverage Days moves with it.
        </span>
      </div>
      <p className="text-small" style={{ marginTop: 'var(--s-2)' }}>
        Rice in stock{' '}
        <strong className="figure">{formatQuantity(capacity.riceStock, 2)}</strong> (1 Q = 100
        kg) against <strong className="figure">{formatQuantity(capacity.campInmates)}</strong>{' '}
        Inmates.
      </p>
    </section>

    <section className="panel" aria-labelledby="capacity-districts-heading">
      <div className="panel__head">
        <h2 className="panel__title" id="capacity-districts-heading">
          Capacity by District
        </h2>
        <span className="panel__note">
          Camp Load, Ration Coverage Days and Vulnerable Load are derived figures.
        </span>
      </div>
      <TableScroll label="Capacity by District table">
        <table className="data-table">
          <caption>
            Ration Coverage Days computed at {rationNorm} kg of rice per person per day.
          </caption>
          <thead>
            <tr>
              <th scope="col">District</th>
              <th scope="col" className="numeric">
                Relief Camps
              </th>
              <th scope="col" className="numeric">
                Relief Distribution Centres
              </th>
              <th scope="col" className="numeric">
                Inmates
              </th>
              <th scope="col" className="numeric">
                Non-Camp Inmates
              </th>
              <th scope="col" className="numeric">
                Camp Load (derived)
              </th>
              <th scope="col" className="numeric">
                Ration Coverage Days (derived)
              </th>
              <th scope="col" className="numeric">
                Vulnerable Load (derived)
              </th>
            </tr>
          </thead>
          <tbody>
            {capacity.districts.map((row) => (
              <tr key={row.district} data-district={row.district}>
                <th scope="row">{row.district}</th>
                <td className="numeric">{formatQuantity(row.reliefCamps)}</td>
                <td className="numeric">{formatQuantity(row.reliefDistributionCentres)}</td>
                <td className="numeric">{formatQuantity(row.campInmates)}</td>
                <td className="numeric">{formatQuantity(row.nonCampInmates)}</td>
                <td className="numeric">
                  {row.campLoad === undefined ? '—' : formatNumber(row.campLoad)}
                </td>
                <td className="numeric" data-cell="ration-coverage-days">
                  {row.rationCoverageDays === undefined
                    ? '—'
                    : `${formatNumber(row.rationCoverageDays, 1)} days`}
                </td>
                <td className="numeric">
                  {row.vulnerableLoad === undefined
                    ? '—'
                    : `${formatNumber(row.vulnerableLoad, 1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </section>
  </div>
);
