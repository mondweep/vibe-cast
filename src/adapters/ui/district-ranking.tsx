/**
 * District ranking and drill-down (FR-2.2, FR-2.3, FR-3.3).
 *
 * The bulletin gives Sivasagar (144,461 affected) and Kamrup Metro (0) rows of
 * identical visual weight. This table ranks them, and shows *why* each ranks
 * where it does: the severity bar is segmented by contributing component, and
 * the contribution arithmetic is written out when a District is expanded.
 *
 * Drill-down keeps context: Revenue Circle rows are inserted beneath their
 * District in the same table, so the District's own figures stay on screen
 * while an officer reads the circles. The Revenue Circle is the real unit of
 * operational decision-making and is never flattened away (PRD §4.1).
 *
 * Sorting is controlled by the host. This component reports intent; it never
 * reorders data behind the caller's back.
 */

import { Fragment } from 'react';
import { DerivedBadge } from './derived-badge';
import { Provenance } from './provenance';
import {
  SEVERITY_COMPONENT_LABELS,
  formatNumber,
  formatQuantity,
  severityBand,
  type DistrictRowViewModel,
  type DistrictSortKey,
  type ProvenanceRef,
  type SeverityContribution,
  type SortDirection,
} from './view-models';

export type DistrictRankingProps = {
  readonly rows: readonly DistrictRowViewModel[];
  readonly sortKey: DistrictSortKey;
  readonly sortDirection: SortDirection;
  readonly onSort: (key: DistrictSortKey) => void;
  readonly expandedDistrict: string | null;
  readonly onToggleDistrict: (district: string) => void;
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
};

type Column = {
  readonly key: DistrictSortKey;
  readonly label: string;
  readonly numeric: boolean;
};

const COLUMNS: readonly Column[] = [
  { key: 'severityIndex', label: 'Severity Index', numeric: false },
  { key: 'populationAffected', label: 'Population Affected', numeric: true },
  { key: 'villagesAffected', label: 'Villages Affected', numeric: true },
  { key: 'cropAreaSubmerged', label: 'Crop Area Submerged', numeric: true },
  { key: 'campInmates', label: 'Inmates', numeric: true },
  { key: 'campLoad', label: 'Camp Load', numeric: true },
];

const SORT_ARROW: Record<SortDirection, string> = { asc: '▲', desc: '▼' };

const SeverityCell = ({ row }: { readonly row: DistrictRowViewModel }) => {
  const band = severityBand(row.severityIndex);
  const spoken = row.contributions
    .map(
      (contribution) =>
        `${SEVERITY_COMPONENT_LABELS[contribution.component]} contributes ${contribution.contribution.toFixed(3)}`,
    )
    .join(', ');

  return (
    <div className="severity">
      <span className="severity__score">{row.severityIndex.toFixed(2)}</span>
      <span className={`severity__band severity__band--${band.rank}`}>{band.label}</span>
      <span className="severity__bar" aria-hidden="true">
        {row.contributions.map((contribution) => (
          <span
            key={contribution.component}
            className={`severity__contribution severity__contribution--${contribution.component}`}
            style={{ width: `${contribution.contribution * 100}%` }}
            title={`${SEVERITY_COMPONENT_LABELS[contribution.component]}: ${contribution.contribution.toFixed(3)}`}
          />
        ))}
      </span>
      <span className="visually-hidden">
        Severity {row.severityIndex.toFixed(2)}, {band.label}. {spoken}.
      </span>
    </div>
  );
};

const ContributionBreakdown = ({
  contributions,
}: {
  readonly contributions: readonly SeverityContribution[];
}) => (
  <div>
    <h3>
      Severity contribution breakdown{' '}
      <DerivedBadge
        formula="Σ (weight × min–max normalised component)"
        workings={contributions
          .map(
            (contribution) =>
              `${SEVERITY_COMPONENT_LABELS[contribution.component]}: ${contribution.weight.toFixed(2)} × ${contribution.normalised.toFixed(2)} = ${contribution.contribution.toFixed(3)}`,
          )
          .join('; ')}
        context="Normalised within this bulletin only, so the index is relative — never an absolute score."
      />
    </h3>
    <div className="contribution-list">
      {contributions.map((contribution) => (
        <div className="contribution-list__row" key={contribution.component}>
          <span>{SEVERITY_COMPONENT_LABELS[contribution.component]}</span>
          <span className="figure">
            {contribution.weight.toFixed(2)} × {contribution.normalised.toFixed(2)} ={' '}
            <strong>{contribution.contribution.toFixed(3)}</strong>
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const DistrictRanking = ({
  rows,
  sortKey,
  sortDirection,
  onSort,
  expandedDistrict,
  onToggleDistrict,
  onOpenPage,
}: DistrictRankingProps) => (
  <section className="panel" aria-labelledby="ranking-heading">
    <div className="panel__head">
      <h2 className="panel__title" id="ranking-heading">
        District ranking
      </h2>
      <span className="panel__note">
        Expand a District to see its Revenue Circles and the severity arithmetic.
      </span>
    </div>

    <table className="data-table">
      <caption>
        Districts ranked by Severity Index. Districts reporting all-zero rows are shown as
        “Reported, no impact” — reported and quiet, not absent.
      </caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">District</th>
          {COLUMNS.map((column) => (
            <th
              scope="col"
              key={column.key}
              className={column.numeric ? 'numeric' : undefined}
              aria-sort={
                sortKey === column.key
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className="data-table__sort"
                onClick={() => onSort(column.key)}
              >
                {column.label}
                <span className="data-table__sort-arrow" aria-hidden="true">
                  {sortKey === column.key ? SORT_ARROW[sortDirection] : '↕'}
                </span>
              </button>
            </th>
          ))}
          <th scope="col" className="numeric">
            Flood Death
          </th>
          <th scope="col" className="numeric">
            General Drowning (Non Flood)
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const expanded = expandedDistrict === row.district;
          const detailId = `district-detail-${row.district.replace(/\s+/g, '-')}`;
          return (
            <Fragment key={row.district}>
              <tr
                className={`${expanded ? 'row--expanded' : ''} ${
                  row.status === 'reported-quiet' ? 'row--quiet' : ''
                }`.trim()}
                data-district={row.district}
              >
                <td className="numeric">{row.rank}</td>
                <th scope="row">
                  <button
                    type="button"
                    className="data-table__sort"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => onToggleDistrict(row.district)}
                  >
                    <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
                    {row.district}
                  </button>
                  {row.status === 'reported-quiet' ? (
                    <span className="text-micro text-muted"> Reported, no impact</span>
                  ) : null}
                  {row.provenance ? (
                    <>
                      {' '}
                      <Provenance source={row.provenance} onOpenPage={onOpenPage} />
                    </>
                  ) : null}
                </th>
                <td>
                  <SeverityCell row={row} />
                </td>
                <td className="numeric">{formatQuantity(row.populationAffected)}</td>
                <td className="numeric">{formatQuantity(row.villagesAffected)}</td>
                <td className="numeric">{formatQuantity(row.cropAreaSubmerged, 2)}</td>
                <td className="numeric">{formatQuantity(row.campInmates)}</td>
                <td className="numeric">
                  {row.campLoad === undefined ? '—' : formatNumber(row.campLoad)}
                </td>
                <td className="numeric">{formatQuantity(row.casualties.floodDeaths)}</td>
                <td className="numeric">{formatQuantity(row.casualties.generalDrownings)}</td>
              </tr>

              {expanded ? (
                <tr className="row--expanded" id={detailId}>
                  <td colSpan={10}>
                    <ContributionBreakdown contributions={row.contributions} />
                    <h3 style={{ marginTop: 'var(--s-3)' }}>
                      Revenue Circles in {row.district}
                    </h3>
                    {row.revenueCircles.length === 0 ? (
                      <p className="text-small text-muted">
                        No Revenue Circle breakdown reported for {row.district}.
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th scope="col">Revenue Circle</th>
                            <th scope="col" className="numeric">
                              Villages Affected
                            </th>
                            <th scope="col" className="numeric">
                              Population Affected
                            </th>
                            <th scope="col" className="numeric">
                              Crop Area Submerged
                            </th>
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
                              Camp Load
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.revenueCircles.map((circle) => (
                            <tr className="row--circle" key={circle.circle}>
                              <th scope="row">{circle.circle}</th>
                              <td className="numeric">
                                {formatQuantity(circle.villagesAffected)}
                              </td>
                              <td className="numeric">
                                {formatQuantity(circle.populationAffected)}
                              </td>
                              <td className="numeric">
                                {formatQuantity(circle.cropAreaSubmerged, 2)}
                              </td>
                              <td className="numeric">{formatQuantity(circle.reliefCamps)}</td>
                              <td className="numeric">
                                {formatQuantity(circle.reliefDistributionCentres)}
                              </td>
                              <td className="numeric">{formatQuantity(circle.campInmates)}</td>
                              <td className="numeric">
                                {formatQuantity(circle.nonCampInmates)}
                              </td>
                              <td className="numeric">
                                {circle.campLoad === undefined
                                  ? '—'
                                  : formatNumber(circle.campLoad)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  </section>
);
