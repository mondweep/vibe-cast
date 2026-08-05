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
 * Rupees, in Indian grouping, rounded to whole rupees.
 *
 * Never abbreviated to "1.8 L" or "63 Cr". A constructed figure is already
 * carrying enough imprecision from its assumptions; presentational rounding on
 * top would make two materially different figures look identical.
 */
const money = (value: number | undefined): string =>
  value === undefined ? '\u2014' : `\u20b9${Math.round(value).toLocaleString('en-IN')}`;

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
    </div>
  );
};
