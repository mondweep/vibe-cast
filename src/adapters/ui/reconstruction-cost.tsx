/**
 * Reconstruction Cost — the money view.
 *
 * Split out of Cumulative & Peak deliberately, and the split is by *kind of
 * claim* rather than by screen length. Everything on that view is a quantity
 * ASDMA printed or an arithmetic consequence of one, and it is auditable back
 * to a Total row. Everything here is a quantity multiplied by a rate somebody
 * chose, and the choosing is ours.
 *
 * Those are different promises to a reader and they belong to different people:
 * Cumulative & Peak is read by an emergency operations officer during the
 * flood, this is read by finance, programme and donor staff for months
 * afterwards (PRD-REHABILITATION-ECONOMICS §3.1). Two audiences and two truth
 * standards on one screen is how a constructed figure ends up being quoted with
 * the authority of a printed one.
 *
 * It also gets its own URL, so the reconstruction argument can be sent to
 * somebody without sending them the situation report.
 */

import { TableScroll } from './table-scroll';
import type { PeriodReplacementViewModel } from './view-models';

/**
 * Rupees, scaled to the magnitude being shown.
 *
 * Below a crore, exact rupees in Indian grouping: a per-dwelling figure of
 * ₹1,80,638 is meaningful to the rupee and should read that way.
 *
 * At a crore and above, crore with one decimal. This was originally exact at
 * every scale, on the reasoning that presentational rounding could make two
 * materially different figures look identical. That reasoning is right for
 * per-unit figures and wrong for aggregates, because it produced
 * `₹1,33,52,29,62,963` — thirteen digits nobody can read, carrying implied
 * precision to the rupee on a number derived from an ASSUMED 4.9 people per
 * household. Stating it that way is less honest than "₹13,352 cr", not more:
 * a figure nobody can read is a figure nobody can check, and false precision
 * is its own kind of overclaim.
 *
 * One decimal is kept so ₹29.7 cr and ₹35.4 cr stay distinguishable.
 */
const money = (value: number | undefined): string => {
  if (value === undefined) return '\u2014';
  const rupees = Math.round(value);
  if (Math.abs(rupees) < 1_00_00_000) return `\u20b9${rupees.toLocaleString('en-IN')}`;
  const crore = rupees / 1_00_00_000;
  return `\u20b9${crore.toLocaleString('en-IN', {
    minimumFractionDigits: crore < 1000 ? 1 : 0,
    maximumFractionDigits: crore < 1000 ? 1 : 0,
  })} cr`;
};

export type ReconstructionCostProps = {
  readonly replacement: PeriodReplacementViewModel;
};

export const ReconstructionCost = ({ replacement }: ReconstructionCostProps) => {
  return (
    <div className="view-stack">
      <section className="panel" aria-labelledby="replacement-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="replacement-heading">
            Replacement cost <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">
            What rebuilding would cost — not what is payable.
          </span>
        </div>

        {/*
          The warning sits ABOVE the number, not below it. A reader who takes
          only the figure should have had to scroll past this to reach it.
        */}
        <div className="callout callout--assumption" data-constructed-warning>
          <p>
            <strong>These figures are constructed, not published.</strong> No schedule
            anywhere states a cost per house. The Assam PWD Schedule of Rates prices
            components — a cubic metre of brickwork, a square metre of roofing — so
            getting to a cost per dwelling meant deciding how big a house is and what
            it is made of. Those decisions are ours and every one of them is listed
            below, with a range and a reason.
          </p>
          <p>
            <strong>{replacement.judgementSharePercent}% of this answer is our judgement</strong>,
            measured as the width of the range over its centre. That is why a range is
            shown and a single number is not.
          </p>
        </div>

        <p className="figure-headline" data-replacement-total>
          {replacement.totalLow === undefined ? (
            '—'
          ) : (
            <>
              {money(replacement.totalLow)} – {money(replacement.totalHigh)}
              <span className="text-small text-muted">
                {' '}
                (central {money(replacement.totalCentral)})
              </span>
            </>
          )}
        </p>
        <p className="text-small text-muted">
          {replacement.quantity === undefined
            ? 'No figure: the quantity was not reported.'
            : `${replacement.quantity.toLocaleString('en-IN')} ${replacement.quantityLabel}, ` +
              `at ${money(replacement.unitLow)} – ${money(replacement.unitHigh)} each.`}
        </p>

        <h3 className="text-small">How it is built: {replacement.formula}</h3>
        <TableScroll label="Replacement cost derivation table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Input</th>
                <th scope="col">Where it comes from</th>
                <th scope="col" className="numeric">
                  Value
                </th>
                <th scope="col">Range, and why</th>
              </tr>
            </thead>
            <tbody>
              {replacement.inputs.map((input) => (
                <tr key={input.label} data-derivation-input={input.label}>
                  <th scope="row">{input.label}</th>
                  <td className="text-small">
                    {input.kind === 'published' ? (
                      <span data-input-kind="published">Published — {input.citation}</span>
                    ) : (
                      <span data-input-kind="assumed">
                        <strong>Assumed by this console</strong>
                      </span>
                    )}
                  </td>
                  <td className="numeric">
                    {input.value.toLocaleString('en-IN')} {input.unit}
                  </td>
                  <td className="text-small text-muted">
                    {input.kind === 'assumed' ? (
                      <>
                        <strong>
                          {input.low?.toLocaleString('en-IN')}–{input.high?.toLocaleString('en-IN')}{' '}
                          {input.unit}
                        </strong>{' '}
                        — {input.reason}
                      </>
                    ) : (
                      'Fixed — a published rate is not ours to vary.'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

        <p className="text-small text-muted" data-not-costed>
          <strong>A Kuccha superstructure cannot be priced from this schedule.</strong>{' '}
          {replacement.notCosted}
        </p>
        <p className="text-small text-muted">{replacement.caveat}</p>
      </section>

      <section className="panel" aria-labelledby="policy-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="policy-heading">
            What to rebuild{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">
            Reconstruction either removes the exposure or reproduces it.
          </span>
        </div>

        <p className="text-small text-muted">
          {replacement.kucchaSharePercent === undefined ? (
            'The Kuccha share of destroyed dwellings was not reported.'
          ) : (
            <>
              <strong>
                {replacement.kucchaSharePercent}% of the dwellings destroyed outright were
                Kuccha.
              </strong>{' '}
              So what a destroyed Kuccha house is rebuilt as moves this bill further than
              every other assumption in the model put together. That is a decision about
              future risk, not a modelling detail, which is why all three options are shown
              rather than one being chosen here. A raised plinth costs{' '}
              {money(replacement.plinthCentral)} per dwelling.
            </>
          )}
        </p>

        <TableScroll label="Reconstruction policy comparison table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Policy</th>
                <th scope="col" className="numeric">
                  Cost
                </th>
                <th scope="col">Effect on future risk</th>
              </tr>
            </thead>
            <tbody>
              {replacement.policies.map((policy) => (
                <tr key={policy.key} data-policy={policy.key}>
                  <th scope="row">
                    {policy.label}
                    <span className="text-small text-muted"> — {policy.summary}</span>
                  </th>
                  <td className="numeric" data-policy-total={policy.key}>
                    {policy.totalLow === undefined ? (
                      '—'
                    ) : (
                      <>
                        {policy.isFloor ? 'at least ' : ''}
                        {money(policy.totalLow)} – {money(policy.totalHigh)}
                        <span className="text-small text-muted">
                          {' '}
                          (central {money(policy.totalCentral)})
                        </span>
                      </>
                    )}
                  </td>
                  {/*
                    The risk effect shares a row with the cost and cannot be
                    read without it. Split across two tables, or hidden behind
                    a tooltip, the cheapest policy would read as the best.
                  */}
                  <td className="text-small" data-policy-risk={policy.key}>
                    {policy.riskEffect}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

        {replacement.policies.map((policy) =>
          policy.isFloor ? (
            <p className="text-small text-muted" key={policy.key} data-policy-caveat={policy.key}>
              <strong>{policy.label}:</strong> {policy.caveat}
            </p>
          ) : null,
        )}
        <p className="text-small text-muted">{replacement.caveat}</p>
      </section>
      <section className="panel" aria-labelledby="benchmark-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="benchmark-heading">
            Compared with the {replacement.benchmark.label} demand
          </h2>
          <span className="panel__note">Two different questions, set side by side.</span>
        </div>

        {/*
          The denominators come FIRST and are as prominent as the totals. A
          reader given two totals and no household counts concludes the demand
          is extravagant — when almost all of the difference is that it reaches
          far more households than lost a house.
        */}
        <div className="callout callout--assumption" data-benchmark-denominators>
          <p>
            <strong>The gap is the denominator, not the rate.</strong> The demand would reach
            every affected household. Reconstruction prices only the dwellings actually
            destroyed.
          </p>
          <p>
            {replacement.benchmark.householdsAffected === undefined ? (
              'The affected household count was not reported.'
            ) : (
              <>
                <strong>
                  {Math.round(replacement.benchmark.householdsAffected).toLocaleString('en-IN')}{' '}
                  households affected
                </strong>{' '}
                at peak (people affected ÷ {replacement.benchmark.householdSize} per household,
                an assumption — the bulletin counts people and never households), against{' '}
                <strong>
                  {replacement.benchmark.dwellingsDestroyed?.toLocaleString('en-IN')} dwellings
                  destroyed outright
                </strong>
                .{' '}
                {replacement.benchmark.notDestroyedSharePercent === undefined ? null : (
                  <>
                    So <strong>
                      {replacement.benchmark.notDestroyedSharePercent.toFixed(1)}% of the
                      households the demand would reach did not lose their dwelling
                    </strong>{' '}
                    — they were inundated, displaced, lost a standing crop, lost earnings and
                    possessions. A reconstruction cost values none of that, because it prices
                    bricks.
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <TableScroll label="Compensation demand comparison table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Basis</th>
                <th scope="col">Households</th>
                <th scope="col" className="numeric">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr data-benchmark-row="demand-affected">
                <th scope="row">The demand, to every affected household</th>
                <td>
                  {replacement.benchmark.householdsAffected === undefined
                    ? '—'
                    : Math.round(replacement.benchmark.householdsAffected).toLocaleString('en-IN')}
                </td>
                <td className="numeric">
                  {money(replacement.benchmark.demandAcrossAffectedLow)} –{' '}
                  {money(replacement.benchmark.demandAcrossAffectedHigh)}
                  <span className="text-small text-muted">
                    {' '}
                    (central {money(replacement.benchmark.demandAcrossAffectedCentral)})
                  </span>
                </td>
              </tr>
              <tr data-benchmark-row="demand-destroyed">
                <th scope="row">The demand, only to households that lost a dwelling</th>
                <td>{replacement.benchmark.dwellingsDestroyed?.toLocaleString('en-IN') ?? '—'}</td>
                <td className="numeric">{money(replacement.benchmark.demandAcrossDestroyed)}</td>
              </tr>
              <tr data-benchmark-row="reconstruction">
                <th scope="row">
                  Rebuilding those same dwellings, Pukka on a raised plinth{' '}
                  <span className="figure-tag figure-tag--constructed">constructed</span>
                </th>
                <td>{replacement.benchmark.dwellingsDestroyed?.toLocaleString('en-IN') ?? '—'}</td>
                <td className="numeric">
                  {money(replacement.benchmark.reconstructionLow)} –{' '}
                  {money(replacement.benchmark.reconstructionHigh)}
                  <span className="text-small text-muted">
                    {' '}
                    (central {money(replacement.benchmark.reconstructionCentral)})
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </TableScroll>

        <p className="figure-headline" data-benchmark-multiple>
          {replacement.benchmark.perHouseholdMultiple === undefined
            ? '—'
            : `For one household that lost its home, ${money(
                replacement.benchmark.amountPerHousehold,
              )} is about ${replacement.benchmark.perHouseholdMultiple.toFixed(
                1,
              )}× what rebuilding it costs.`}
        </p>
        <p className="text-small text-muted">
          That is not a finding that the demand is too high. It is a statement that it covers
          considerably more than a house — contents, land, livelihood, lost earnings and the
          months in between — which is what its proponents say it is for. This console prices
          bricks and cannot settle the rest.
        </p>
        <p className="text-small text-muted" data-benchmark-source>
          <strong>{replacement.benchmark.label}:</strong> {replacement.benchmark.source}
        </p>
        <p className="text-small text-muted">{replacement.benchmark.caveat}</p>
      </section>

    </div>
  );
};
