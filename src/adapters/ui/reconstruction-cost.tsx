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
import type { PeriodReplacementViewModel, PeriodTierViewModel } from './view-models';

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

/**
 * One recovery tier.
 *
 * Rendered by a shared component so the household and public tiers are visibly
 * the same kind of table — which is what makes the fact that they are NEVER
 * added legible rather than merely true.
 */
const Tier = ({ tier, kind }: { tier: PeriodTierViewModel; kind: 'micro' | 'macro' }) => (
  <section className="panel" aria-labelledby={`tier-${kind}-heading`} data-tier={kind}>
    <div className="panel__head">
      <h2 className="panel__title" id={`tier-${kind}-heading`}>
        {tier.label} <span className="figure-tag figure-tag--constructed">constructed</span>
      </h2>
      <span className="panel__note">
        {kind === 'micro'
          ? 'What belongs to households — and must be cleared before rebuilding.'
          : 'Public works. No household receives this.'}
      </span>
    </div>

    {tier.rateScope === '' ? null : (
      <div className="callout callout--assumption" data-tier-scope={kind}>
        <p>{tier.rateScope}</p>
      </div>
    )}

    <TableScroll label={`${tier.label} recovery table`}>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col" className="numeric">
              Cost
            </th>
            <th scope="col">What is assumed</th>
          </tr>
        </thead>
        <tbody>
          {tier.lines.map((l) => (
            <tr key={l.label} data-tier-line={l.label}>
              <th scope="row">
                {l.label}
                <span className="text-small text-muted"> — {l.formula}</span>
              </th>
              <td className="numeric">
                {money(l.low)} – {money(l.high)}
                <span className="text-small text-muted"> (central {money(l.central)})</span>
              </td>
              <td className="text-small text-muted">
                {l.assumptions.map((a) => (
                  <p key={a.label}>
                    <strong>
                      {a.label}: {a.value} {a.unit} [{a.low}–{a.high}]
                    </strong>{' '}
                    — {a.reason}
                  </p>
                ))}
              </td>
            </tr>
          ))}
          <tr data-tier-subtotal={kind}>
            <th scope="row">Subtotal — {tier.label}</th>
            <td className="numeric">
              {money(tier.subtotalLow)} – {money(tier.subtotalHigh)}
              <span className="text-small text-muted">
                {' '}
                (central {money(tier.subtotalCentral)})
              </span>
            </td>
            <td className="text-small text-muted">
              Not added to the other tier — see below.
            </td>
          </tr>
        </tbody>
      </table>
    </TableScroll>

    {/*
      Counted and not costed, rendered where the cost would have been. A count
      with a blank beside it reads as "none damaged"; this says the opposite,
      which is the whole point of keeping the count.
    */}
    {tier.uncosted.map((u) => (
      <div className="callout callout--assumption" key={u.label} data-tier-uncosted={u.label}>
        <p>
          <strong>
            {u.label}: {u.count.toLocaleString('en-IN')} reported, no cost shown.
          </strong>{' '}
          {u.reason}
        </p>
      </div>
    ))}

    {tier.notCovered === '' ? null : (
      <p className="text-small text-muted" data-tier-not-covered={kind}>
        <strong>Not in this total:</strong> {tier.notCovered}
      </p>
    )}
  </section>
);

export const ReconstructionCost = ({ replacement }: ReconstructionCostProps) => {
  const x = replacement.executive;
  return (
    <div className="view-stack">
      {/*
        The executive summary is FIRST and is built from the same view model as
        the panels below, not written as copy — so it cannot drift from the
        figures it summarises. Every number here reappears lower down with its
        derivation attached.
      */}
      <section className="panel" aria-labelledby="exec-heading" data-executive>
        <div className="panel__head">
          <h2 className="panel__title" id="exec-heading">
            In summary{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">Read this before the detail below.</span>
        </div>

        <p>
          <strong>What this page is.</strong> The bulletins contain no money at all — every
          figure is people, houses, hectares or animals. So every rupee here is{' '}
          <em>a quantity ASDMA reported × a rate we applied</em>. The quantities are auditable
          back to a printed Total row. The rates are{' '}
          <strong>{x.publishedRateCount} published rates</strong> (the SDRF norms and the Assam
          PWD Schedule of Rates, each cited to its clause) combined under{' '}
          <strong>{x.assumptionCount} assumptions of ours</strong>, every one listed with a
          range and a reason.
        </p>

        <TableScroll label="Executive summary table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col" className="numeric">
                  Scale
                </th>
                <th scope="col" className="numeric">
                  Cost range (central)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr data-exec-row="dwellings">
                <th scope="row">
                  Rebuilding destroyed dwellings — Pukka, on a raised plinth
                  <span className="text-small text-muted">
                    {' '}
                    (build back better; 91% of those destroyed were Kuccha)
                  </span>
                </th>
                <td className="numeric">
                  {x.dwellingsDestroyed?.toLocaleString('en-IN') ?? '—'} dwellings
                </td>
                <td className="numeric">
                  {money(x.dwellingsLow)} – {money(x.dwellingsHigh)}
                  <span className="text-small text-muted">
                    {' '}
                    ({money(x.dwellingsCentral)})
                  </span>
                </td>
              </tr>
              <tr data-exec-row="micro">
                <th scope="row">
                  Clearing silt and restoring land — household assets
                  <span className="text-small text-muted">
                    {' '}
                    (must happen before rebuilding can start)
                  </span>
                </th>
                <td className="numeric">
                  {x.householdsAffected === undefined
                    ? '—'
                    : `${Math.round(x.householdsAffected).toLocaleString('en-IN')} households`}
                </td>
                <td className="numeric">
                  {money(x.microLow)} – {money(x.microHigh)}
                  <span className="text-small text-muted"> ({money(x.microCentral)})</span>
                </td>
              </tr>
              <tr data-exec-row="macro">
                <th scope="row">
                  Restoring public infrastructure
                  <span className="text-small text-muted">
                    {' '}
                    (roads, embankments, schools — restoration, not reconstruction)
                  </span>
                </th>
                <td className="numeric">State-reported assets</td>
                <td className="numeric">
                  {money(x.macroLow)} – {money(x.macroHigh)}
                  <span className="text-small text-muted"> ({money(x.macroCentral)})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </TableScroll>

        <p className="text-small text-muted" data-exec-no-total>
          <strong>There is deliberately no total row.</strong> Household assets and public
          infrastructure are different claims on different payers, and dwellings sit inside the
          household tier rather than beside it — so adding these three lines would double-count
          and would produce a figure in which a road and a family&rsquo;s home are
          interchangeable. Read them as three separate asks.
        </p>

        <p className="text-small text-muted" data-exec-caveats>
          <strong>Three things to know before quoting anything here.</strong> The Assam PWD
          rate schedule states no year anywhere in its text, so the underlying prices are of
          unknown vintage. The SDRF norms expired on 31 March 2026 and these bulletins are from
          August 2026, so they are indicative of scale rather than an entitlement. And railways
          and National Highways are absent from the public tier because they are absent from
          the source — ASDMA reports what State departments report to it.
        </p>
      </section>
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

      <Tier tier={replacement.micro} kind="micro" />
      <Tier tier={replacement.macro} kind="macro" />

      <section className="panel" aria-labelledby="tiers-note-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="tiers-note-heading">
            Why these two are never one number
          </h2>
        </div>
        <p className="text-small text-muted" data-tiers-never-summed>
          A household's losses and a state's losses are both real and they are not the same
          claim. Household assets are a transfer to identifiable families, counted in
          households; public infrastructure is public works, counted in assets, and no
          household receives it. <strong>There is no combined total anywhere in this
          console</strong> — an appeal that adds a road to a family's home produces a figure in
          which the two are interchangeable, and any per-household comparison built on it is
          nonsense.
        </p>
        <p className="text-small text-muted">
          <strong>Silt clearance comes first in sequence, not just in the table.</strong> Sand
          has to come off a field before it can be sown and out of a house before it can be
          rebuilt, so a plan that funds rebuilding without funding clearance has funded work
          that cannot start.
        </p>
      </section>

      <section className="panel" aria-labelledby="register-heading" data-assumption-register>
        <div className="panel__head">
          <h2 className="panel__title" id="register-heading">
            Every assumption in one place
          </h2>
          <span className="panel__note">
            {replacement.assumptionRegister.length} judgements, biggest effect first.
          </span>
        </div>
        <p className="text-small text-muted">
          Collected by walking the derivations rather than kept as a list, so an assumption
          added anywhere appears here automatically — an incomplete register is worse than none,
          because it implies the ones it omits do not exist.
        </p>
        <p className="text-small text-muted" data-register-metrics>
          Two columns say different things and they often disagree.{' '}
          <strong>Range</strong> is how unsure we are — the top of the plausible range divided
          by the bottom. <strong>Moves the answer by</strong> is what that uncertainty is
          actually worth: take one assumption to each end of its range, hold every other at its
          middle value, and see how many rupees the total shifts.
        </p>
        <p className="text-small text-muted">
          A wide range on a small line matters less than a narrow range on a large one. Average
          damaged road length has the second-widest range here and moves the answer by about a
          twelfth of what the SDRF ceiling share moves it, whose range is less than half as
          wide. <strong>So this table is sorted by the second column, and it is the second
          column that tells you what to argue about.</strong>
        </p>
        <TableScroll label="Assumptions register">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Assumption</th>
                <th scope="col">Feeds</th>
                <th scope="col" className="numeric">
                  Used
                </th>
                <th scope="col" className="numeric">
                  Range <span className="text-small text-muted">(how unsure)</span>
                </th>
                <th scope="col" className="numeric">
                  Moves the answer by
                </th>
                <th scope="col">Why this value</th>
              </tr>
            </thead>
            <tbody>
              {replacement.assumptionRegister.map((a) => (
                <tr key={`${a.affects}:${a.label}`} data-assumption={a.label}>
                  <th scope="row">{a.label}</th>
                  <td className="text-small text-muted">{a.affects}</td>
                  <td className="numeric">
                    {a.value} {a.unit}
                  </td>
                  <td className="numeric">
                    {a.low}–{a.high}
                    <span className="text-small text-muted"> ({a.spread.toFixed(1)}×)</span>
                  </td>
                  <td className="numeric" data-assumption-swing={a.label}>
                    {money(a.swing)}
                  </td>
                  <td className="text-small text-muted">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </section>

    </div>
  );
};
