/**
 * Cost Explorer — the same argument as Reconstruction Cost, shown rather than
 * stated.
 *
 * ---------------------------------------------------------------------------
 * Why a second view and not a chart bolted onto the first
 * ---------------------------------------------------------------------------
 *
 * Reconstruction Cost is a document. It is read top to bottom by someone who
 * has to defend a figure, and its ordering is an argument: the warning precedes
 * the number, the derivation precedes the total, the risk effect shares a row
 * with the cost. Dropping charts into it would break that ordering, because a
 * chart is read before the paragraph above it whatever the DOM says.
 *
 * This view is the other reading posture — someone orienting, deciding what to
 * ask about, or presenting to a room. It answers the same questions with the
 * same numbers from the same view model, and every figure here appears on the
 * document view with its derivation attached. Neither is a summary of the
 * other; they are two renderings of one model.
 *
 * ---------------------------------------------------------------------------
 * What the controls may and may not do
 * ---------------------------------------------------------------------------
 *
 * The controls change **how the existing numbers are expressed** — the
 * denominator, the ranking, the filter. None of them changes an assumption, and
 * that is a deliberate line rather than an oversight. ADR-0014 §6 commits to
 * adjustable assumptions, and doing it properly means re-evaluating derivations
 * in the domain and carrying the result back through the view model. Faking it
 * in the view — scaling a total by a ratio — would produce numbers that no
 * derivation supports, on the one screen whose entire purpose is that every
 * number has one. The control is missing rather than dishonest.
 */

import { useState } from 'react';
import { BandChart, BenchmarkChart, TornadoChart, rupees } from './cost-explorer-charts';
import {
  affectedFigures,
  askSeries,
  benchmarkSeries,
  NORMALISERS,
  normaliserNote,
  policySeries,
  RANK_MODES,
  swingConcentration,
  tierSeries,
  tornadoSeries,
  type NormaliserKey,
  type RankKey,
} from './cost-explorer-data';
import type { PeriodReplacementViewModel } from './view-models';

/** The palettes. Always paired with words — see the tables under each chart. */
const ASK_FILLS = ['var(--c-derived)', 'var(--c-projected)', 'var(--c-damage-road)'];
const MICRO_FILLS = ['var(--c-projected)'];
const MACRO_FILLS = ['var(--c-damage-road)'];
const POLICY_FILLS = ['var(--c-gap)', 'var(--c-warning)', 'var(--c-ok)'];

const ALL_FIGURES = 'all';

/** How many bars the sensitivity chart shows before the reader asks for more. */
const TOP_N = 8;

export type CostExplorerProps = {
  readonly replacement: PeriodReplacementViewModel;
  /** Explicit dimensions bypass the default width (used by tests). */
  readonly chartWidth?: number;
};

/** One number in the scorecard, with what it is underneath it. */
const Stat = ({
  label,
  value,
  detail,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly testId: string;
}) => (
  <div className="stat" data-stat={testId}>
    <span className="stat__label">{label}</span>
    <span className="stat__value figure">{value}</span>
    <span className="stat__detail text-small text-muted">{detail}</span>
  </div>
);

export const CostExplorer = ({ replacement, chartWidth }: CostExplorerProps) => {
  const [normaliser, setNormaliser] = useState<NormaliserKey>('total');
  const [rankBy, setRankBy] = useState<RankKey>('swing');
  const [affects, setAffects] = useState<string>(ALL_FIGURES);
  /**
   * How many assumptions the sensitivity chart draws.
   *
   * Defaults to the top eight rather than all twenty, because twenty bars is a
   * three-thousand-pixel panel that nobody reads to the bottom of. The count of
   * what is hidden is rendered beside the control — a truncated chart that does
   * not say it is truncated reads as a complete one.
   */
  const [topOnly, setTopOnly] = useState(true);

  const x = replacement.executive;
  const b = replacement.benchmark;
  const register = replacement.assumptionRegister;
  const figures = affectedFigures(register);
  const concentration = swingConcentration(register, 5);
  const rankMode = RANK_MODES.find((m) => m.key === rankBy) ?? RANK_MODES[0];
  const normNote = normaliserNote(normaliser);

  const asks = askSeries(replacement, normaliser);
  const policies = policySeries(replacement, normaliser);
  const micro = tierSeries(replacement.micro, replacement, normaliser);
  const macro = tierSeries(replacement.macro, replacement, normaliser);
  // `limit` is passed in rather than applied afterwards, so the chart-label
  // disambiguation is computed over the rows actually drawn.
  const tornadoOptions = { rankBy, affects: affects === ALL_FIGURES ? undefined : affects };
  const matchingCount = tornadoSeries(register, tornadoOptions).length;
  const tornado = tornadoSeries(register, {
    ...tornadoOptions,
    limit: topOnly ? TOP_N : undefined,
  });
  const hidden = matchingCount - tornado.length;
  const drawnSwing = tornado.reduce((sum, bar) => sum + bar.swing, 0);
  const hiddenSwing =
    tornadoSeries(register, tornadoOptions).reduce((sum, bar) => sum + bar.swing, 0) - drawnSwing;

  const suffix = NORMALISERS.find((n) => n.key === normaliser)?.axisSuffix ?? '';
  const valueHeading = suffix === '' ? 'Cost range (central)' : `Cost ${suffix} (central)`;

  return (
    <div className="view-stack">
      {/* ------------------------------------------------------------------ */}
      {/* Executive summary — every heading and figure from the detail view. */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-exec-heading" data-explorer-exec>
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-exec-heading">
            The whole picture{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">Every number here is charted below and derived on the Reconstruction Cost view.</span>
        </div>

        <p>
          <strong>The bulletins contain no money.</strong> Every figure is people, houses,
          hectares or animals — so every rupee on this page is{' '}
          <em>a quantity ASDMA reported × a rate we applied</em>:{' '}
          <strong>{x.publishedRateCount} published rates</strong> (SDRF norms and the Assam PWD
          Schedule of Rates, each cited to its clause) combined under{' '}
          <strong>{x.assumptionCount} assumptions of ours</strong>, each with a range and a
          reason. <strong>{replacement.judgementSharePercent}% of the dwelling answer is
          judgement</strong>, measured as the width of its range over its centre — which is why
          you will not find a single number anywhere on this page.
        </p>

        <div className="stat-grid" data-explorer-stats>
          <Stat
            testId="dwellings"
            label="Dwellings destroyed"
            value={x.dwellingsDestroyed?.toLocaleString('en-IN') ?? '—'}
            detail={`${replacement.kucchaSharePercent ?? '—'}% of them Kuccha`}
          />
          <Stat
            testId="households"
            label="Households affected"
            value={
              x.householdsAffected === undefined
                ? '—'
                : Math.round(x.householdsAffected).toLocaleString('en-IN')
            }
            detail={`derived at ${b.householdSize} people per household — assumed`}
          />
          <Stat
            testId="per-dwelling"
            label="To rebuild one dwelling"
            value={`${rupees(replacement.unitLow)} – ${rupees(replacement.unitHigh)}`}
            detail={`central ${rupees(replacement.unitCentral)}, Pukka`}
          />
          <Stat
            testId="plinth"
            label="Raised plinth, per dwelling"
            value={rupees(replacement.plinthCentral)}
            detail="the defence on its own, central"
          />
          <Stat
            testId="ask-dwellings"
            label="Rebuilding all destroyed dwellings"
            value={`${rupees(x.dwellingsLow ?? 0)} – ${rupees(x.dwellingsHigh ?? 0)}`}
            detail={`central ${rupees(x.dwellingsCentral ?? 0)} — build back better`}
          />
          <Stat
            testId="ask-micro"
            label="Household assets: silt and land"
            value={`${rupees(x.microLow)} – ${rupees(x.microHigh)}`}
            detail={`central ${rupees(x.microCentral)} — precedes rebuilding`}
          />
          <Stat
            testId="ask-macro"
            label="Public infrastructure"
            value={`${rupees(x.macroLow)} – ${rupees(x.macroHigh)}`}
            detail={`central ${rupees(x.macroCentral)} — restoration only`}
          />
          <Stat
            testId="benchmark"
            label="₹10 lakh demand ÷ rebuilding one dwelling"
            value={
              b.perHouseholdMultiple === undefined
                ? '—'
                : `${b.perHouseholdMultiple.toFixed(1)}×`
            }
            detail={`${b.notDestroyedSharePercent?.toFixed(0) ?? '—'}% of affected households kept their home`}
          />
          <Stat
            testId="concentration"
            label="Uncertainty in the top 5 assumptions"
            value={`${concentration.topShare.toFixed(0)}%`}
            detail={`of ${rupees(concentration.total)} total movement across ${register.length} assumptions`}
          />
        </div>

        <p className="text-small text-muted" data-explorer-no-total>
          <strong>There is no total anywhere on this page, and that is not an omission.</strong>{' '}
          Household assets and public infrastructure are different claims on different payers,
          and dwellings sit <em>inside</em> the household tier rather than beside it — so adding
          the three would double-count and would produce a figure in which a road and a
          family&rsquo;s home are interchangeable. Read them as three separate asks.
        </p>

        <p className="text-small text-muted" data-explorer-caveats>
          <strong>Three things to know before quoting anything here.</strong> The Assam PWD rate
          schedule states no year anywhere in its text, so the underlying prices are of unknown
          vintage. The SDRF norms expired on 31 March 2026 and these bulletins are from August
          2026, so they indicate scale rather than entitlement. Railways and National Highways
          are absent from the public tier because they are absent from the source — ASDMA
          reports what State departments report to it.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Controls.                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-controls-heading" data-explorer-controls>
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-controls-heading">
            Configure
          </h2>
          <span className="panel__note">
            These change how the figures are expressed, never what they are.
          </span>
        </div>

        <div className="control-row">
          <fieldset className="control">
            <legend>Express costs as</legend>
            {NORMALISERS.map((n) => (
              <label key={n.key} className="control__option">
                <input
                  type="radio"
                  name="explorer-normaliser"
                  value={n.key}
                  checked={normaliser === n.key}
                  onChange={() => setNormaliser(n.key)}
                />
                {n.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="control">
            <legend>Rank assumptions by</legend>
            {RANK_MODES.map((m) => (
              <label key={m.key} className="control__option">
                <input
                  type="radio"
                  name="explorer-rank"
                  value={m.key}
                  checked={rankBy === m.key}
                  onChange={() => setRankBy(m.key)}
                />
                {m.label}
              </label>
            ))}
          </fieldset>

          <div className="control">
            <label htmlFor="explorer-affects">Assumptions feeding</label>
            <select
              id="explorer-affects"
              value={affects}
              onChange={(event) => setAffects(event.target.value)}
            >
              <option value={ALL_FIGURES}>Every figure</option>
              {figures.map((figure) => (
                <option key={figure} value={figure}>
                  {figure}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="control">
            <legend>Assumptions to chart</legend>
            <label className="control__option">
              <input
                type="radio"
                name="explorer-depth"
                checked={topOnly}
                onChange={() => setTopOnly(true)}
              />
              Top {TOP_N}
            </label>
            <label className="control__option">
              <input
                type="radio"
                name="explorer-depth"
                checked={!topOnly}
                onChange={() => setTopOnly(false)}
              />
              All {register.length}
            </label>
          </fieldset>
        </div>

        {normNote === '' ? null : (
          <div className="callout callout--assumption" data-explorer-normaliser-note>
            <p>{normNote}</p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* The three asks.                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-asks-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-asks-heading">
            The three asks{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">Never stacked, never summed.</span>
        </div>
        <p className="text-small text-muted">
          Each bar runs from the low bound to the high; the vertical tick inside it is the
          central value. There is no bar rising from zero, because there is no single number to
          read off — the band <em>is</em> the answer.
        </p>
        <BandChart
          bands={asks}
          fills={ASK_FILLS}
          tableLabel="The three asks"
          valueHeading={valueHeading}
          noteHeading="What it covers"
          width={chartWidth}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Policies.                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-policy-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-policy-heading">
            What we rebuild them as{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">The dominant question, because 91% were Kuccha.</span>
        </div>
        <div className="callout callout--assumption" data-explorer-policy-warning>
          <p>
            <strong>The cheapest policy is the one that rebuilds the vulnerability.</strong> Read
            no bar here without the risk effect beside it — that is why the effect is a column
            in the table and not a colour in a legend. The cheapest option also leaves the most
            dwellings uncosted, because a Kuccha superstructure cannot be priced from a
            civil-works schedule at all.
          </p>
        </div>
        <BandChart
          bands={policies}
          fills={POLICY_FILLS}
          tableLabel="Reconstruction policies"
          valueHeading={valueHeading}
          noteHeading="Effect on future risk"
          width={chartWidth}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Tiers, charted separately so they cannot be read as one.           */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-micro-heading" data-explorer-tier="micro">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-micro-heading">
            {replacement.micro.label}{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">
            What belongs to households — and must be cleared before rebuilding.
          </span>
        </div>
        <BandChart
          bands={micro}
          fills={MICRO_FILLS}
          tableLabel="Household assets breakdown"
          valueHeading={valueHeading}
          noteHeading="How it is built"
          width={chartWidth}
        />
        <p className="text-small text-muted">
          <strong>Subtotal:</strong> {rupees(replacement.micro.subtotalLow)} –{' '}
          {rupees(replacement.micro.subtotalHigh)} (central{' '}
          {rupees(replacement.micro.subtotalCentral)}). Never added to the public tier.
        </p>
      </section>

      <section className="panel" aria-labelledby="explorer-macro-heading" data-explorer-tier="macro">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-macro-heading">
            {replacement.macro.label}{' '}
            <span className="figure-tag figure-tag--constructed">constructed</span>
          </h2>
          <span className="panel__note">Public works. No household receives this.</span>
        </div>
        {replacement.macro.rateScope === '' ? null : (
          <div className="callout callout--assumption" data-explorer-macro-scope>
            <p>{replacement.macro.rateScope}</p>
          </div>
        )}
        <BandChart
          bands={macro}
          fills={MACRO_FILLS}
          tableLabel="Public infrastructure breakdown"
          valueHeading={valueHeading}
          noteHeading="How it is built"
          width={chartWidth}
        />
        <p className="text-small text-muted">
          <strong>Subtotal:</strong> {rupees(replacement.macro.subtotalLow)} –{' '}
          {rupees(replacement.macro.subtotalHigh)} (central{' '}
          {rupees(replacement.macro.subtotalCentral)}). Never added to the household tier.
        </p>
        {/*
          A bar that is absent from a chart is invisible in a way a blank table
          cell is not, so what was counted and not costed is stated in words
          directly beneath the chart rather than left to the reader to notice.
        */}
        {replacement.macro.uncosted.map((u) => (
          <div
            className="callout callout--assumption"
            key={u.label}
            data-explorer-uncosted={u.label}
          >
            <p>
              <strong>
                Not on this chart — {u.label}: {u.count.toLocaleString('en-IN')} reported, no
                cost shown.
              </strong>{' '}
              {u.reason}
            </p>
          </div>
        ))}
        {replacement.macro.notCovered === '' ? null : (
          <p className="text-small text-muted" data-explorer-macro-gap>
            <strong>Not in this total:</strong> {replacement.macro.notCovered}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Sensitivity.                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-sensitivity-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-sensitivity-heading">
            What actually moves the answer
          </h2>
          <span className="panel__note">
            {concentration.topShare.toFixed(0)}% of the movement sits in five assumptions.
          </span>
        </div>
        <p className="text-small text-muted" data-explorer-rank-note>
          <strong>Ranked by: {rankMode.label}.</strong> {rankMode.explanation} Bar length is the
          rupee swing in both modes — only the <em>order</em> changes — so switching between
          them rearranges the same bars and shows you where the two measures disagree.
        </p>
        {hidden > 0 ? (
          <p className="text-small text-muted" data-explorer-truncation>
            <strong>
              Showing the {tornado.length} largest of {matchingCount}.
            </strong>{' '}
            {hidden} smaller {hidden === 1 ? 'assumption is' : 'assumptions are'} not drawn,
            worth {rupees(hiddenSwing)} between them. A chart that truncates without saying so
            reads as a complete one — switch to <em>All {register.length}</em> above to see them.
          </p>
        ) : null}
        <TornadoChart bars={tornado} width={chartWidth} />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* The ₹10 lakh demand.                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel" aria-labelledby="explorer-benchmark-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="explorer-benchmark-heading">
            Against the ₹10 lakh demand
          </h2>
          <span className="panel__note">Two different questions, set side by side.</span>
        </div>
        <div className="callout callout--assumption" data-explorer-benchmark-caveat>
          <p>{b.caveat}</p>
        </div>
        <BenchmarkChart bars={benchmarkSeries(b)} width={chartWidth} />
        <p className="text-small text-muted" data-explorer-benchmark-source>
          <strong>{b.label}</strong> — {b.source}
        </p>
      </section>
    </div>
  );
};
