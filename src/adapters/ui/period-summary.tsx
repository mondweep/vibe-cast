/**
 * Cumulative & Peak — what the loaded bulletins add up to (FR-5.1, PRD §5.6).
 *
 * A daily bulletin answers "how bad is it now?". This view answers the two
 * questions an officer asks next and no single bulletin can: *how many have
 * died in this flood*, and *how bad did it get, and when*.
 *
 * It is split into two tables, and the split is the whole design:
 *
 *  - **Cumulative** holds flows — flood deaths, houses damaged, animals washed
 *    away. Each bulletin counts new events, so the days are added.
 *  - **Peak and latest** holds stocks — Population Affected, Inmates, Relief
 *    Camps, Crop Area Submerged. These are levels at an instant. The same
 *    person affected on six days is one person, so there is no total, and the
 *    table says why in the row rather than leaving an empty cell that looks
 *    like a bug.
 *
 * Nothing on this screen is ASDMA's figure. Every number here is arithmetic
 * this console did across bulletins ASDMA published separately, so every one of
 * them is marked derived and carries the period it covers — how many bulletins,
 * which dates, and how many days are missing (PRD §4.5, ADR-0005). "41" alone
 * would be a claim the data does not support.
 */

import { DerivedBadge } from './derived-badge';
import { TableScroll } from './table-scroll';
import {
  NOT_REPORTED,
  PERIOD_COMPLETENESS_LABELS,
  formatNumber,
  formatReportDateLong,
  type BundledArchiveViewModel,
  type PeriodFigureViewModel,
  type PeriodSummaryViewModel,
} from './view-models';

export type PeriodSummaryProps = {
  readonly summary: PeriodSummaryViewModel;
  /**
   * The console's own bundled archive, while any of it is among the bulletins
   * counted — and while it is still arriving, which these figures must admit
   * to rather than quietly restating a moment later.
   */
  readonly archive?: BundledArchiveViewModel;
};

/**
 * Rupees, in Indian grouping, rounded to whole rupees.
 *
 * Never abbreviated to "1.8 L" or "63 Cr". A constructed figure is already
 * carrying enough imprecision from its assumptions; adding presentational
 * rounding on top would make two figures that differ materially look identical.
 */
const money = (value: number | undefined): string =>
  value === undefined ? '—' : `₹${Math.round(value).toLocaleString('en-IN')}`;

const figureOf = (value: number | undefined, precision: number): string =>
  value === undefined ? NOT_REPORTED : formatNumber(value, precision);

const onDate = (date: string | undefined): string =>
  date === undefined ? NOT_REPORTED : date;

/**
 * The period, in the words the figures must always be quoted with.
 *
 * Deliberately a full sentence rather than a chip: "cumulative over 6
 * bulletins, 20 July 2026 to 27 July 2026, 2 days missing" survives being read
 * aloud in a briefing, and a chip does not.
 */
const CoverageNote = ({ summary }: { readonly summary: PeriodSummaryViewModel }) => {
  const { coverage } = summary;
  const from = formatReportDateLong(coverage.fromDate);
  const to = formatReportDateLong(coverage.toDate);
  const bulletins = `${coverage.bulletinCount} bulletin${coverage.bulletinCount === 1 ? '' : 's'}`;

  return (
    <p className="period__coverage" data-testid="period-coverage">
      Computed across <strong className="figure">{bulletins}</strong>
      {from !== undefined && to !== undefined ? (
        <>
          , <span className="figure">{from === to ? from : `${from} to ${to}`}</span>
        </>
      ) : null}
      {coverage.missingDates.length > 0 ? (
        <>
          , with{' '}
          <strong className="figure">
            {coverage.missingDates.length} day
            {coverage.missingDates.length === 1 ? '' : 's'} missing
          </strong>{' '}
          ({coverage.missingDates.join(', ')}). Nothing that happened on those days is in
          these figures, and nothing is estimated for them.
        </>
      ) : (
        <>, with no days missing between the first and last bulletin.</>
      )}
    </p>
  );
};

/**
 * Which of these bulletins came with the console.
 *
 * A cumulative death toll drawn mostly from bundled history is a real figure —
 * every bulletin behind it is a real ASDMA bulletin — but it is not a figure
 * the officer assembled, and it must not read as one. While the archive is
 * still in flight the totals on screen are about to change, and saying so is
 * cheaper than letting an officer quote a number that moves.
 */
const ArchiveNote = ({
  archive,
  bulletinCount,
}: {
  readonly archive?: BundledArchiveViewModel;
  readonly bulletinCount: number;
}) => {
  if (archive === undefined || archive.status === 'cleared') return null;

  const from = formatReportDateLong(archive.fromDate) ?? archive.fromDate;
  const to = formatReportDateLong(archive.toDate) ?? archive.toDate;

  if (archive.status === 'loading') {
    return (
      <p className="text-small text-muted" data-testid="period-archive-loading">
        <strong>Loading the bundled history…</strong> {archive.pendingCount} more real ASDMA
        bulletins are on their way, taking this period to{' '}
        <span className="figure">
          {from} to {to}
        </span>
        . Every figure below will be recomputed over the full period when they arrive — do
        not quote these totals until it says otherwise.
      </p>
    );
  }

  if (archive.status === 'unavailable') {
    return (
      <p className="text-small text-muted" data-testid="period-archive-unavailable">
        <strong>The bundled history could not be loaded.</strong> These figures cover only
        what is listed above, not the{' '}
        <span className="figure">
          {from} to {to}
        </span>{' '}
        archive this console ships with. Reload the page to try again.
      </p>
    );
  }

  if (archive.contributingCount === 0) return null;

  return (
    <p className="text-small text-muted" data-testid="period-archive-note">
      <strong className="figure">
        {archive.contributingCount} of these {bulletinCount}
      </strong>{' '}
      bulletins came with the console: real ASDMA Daily Flood Reports for{' '}
      <span className="figure">
        {from} to {to}
      </span>
      , bundled rather than loaded by you. Clear the bundled history from the Trend view if
      you want your own bulletins only.
    </p>
  );
};

const CompletenessMark = ({ figure }: { readonly figure: PeriodFigureViewModel }) => (
  <span
    className={`period__completeness period__completeness--${figure.completeness}`}
    data-completeness={figure.completeness}
    title={figure.caveat}
  >
    {PERIOD_COMPLETENESS_LABELS[figure.completeness]}
  </span>
);

export const PeriodSummary = ({ summary, archive }: PeriodSummaryProps) => {
  const { coverage, cumulative, peaks, exposure, backTest, replacement } = summary;
  // While the bundled archive is in flight the console is about to hold eleven
  // bulletins, so telling the officer to go and find earlier PDFs would be
  // advice it retracts on its own a moment later.
  const loading = archive?.status === 'loading';
  const single = coverage.bulletinCount < 2 && !loading;

  return (
    <div className="panel-stack">
      <section className="panel" aria-labelledby="period-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="period-heading">
            Cumulative &amp; peak across every bulletin held
          </h2>
          <DerivedBadge
            formula="Totals of per-bulletin events; highest and latest of point-in-time levels"
            workings={
              'Every figure on this screen was computed here from bulletins ASDMA ' +
              'published separately. ASDMA publishes no cumulative figures.'
            }
          />
        </div>
        <CoverageNote summary={summary} />
        {single ? (
          <p className="text-small text-muted">
            {coverage.bulletinCount === 0
              ? 'No bulletin is held, so there is nothing to accumulate.'
              : 'One bulletin is held. Its own figures are the total and the peak — ' +
                'load earlier DRIMS PDFs to accumulate across days.'}
          </p>
        ) : null}
        <ArchiveNote archive={archive} bulletinCount={coverage.bulletinCount} />
      </section>

      <section className="callout callout--assumption" aria-labelledby="period-rule-heading">
        <p className="callout__title" id="period-rule-heading">
          Why some figures have a total and others do not
        </p>
        <ul className="callout__list">
          <li>
            <strong>Events are added.</strong> Flood deaths, houses damaged and animals
            washed away are counted for the period each bulletin covers, so the bulletins
            are summed.
          </li>
          <li>
            <strong>Levels are never added.</strong> Population Affected, Inmates in Relief
            Camps, Relief Camps and Crop Area Submerged describe the situation at one
            moment. The same person affected on six days is one person, not six — so these
            are shown as a peak and a latest value, and no total for them exists anywhere
            in this console.
          </li>
          <li>
            <strong>Flood deaths are never added to other drownings.</strong> ASDMA reports
            them separately because they are different events, and combining them would
            overstate flood mortality.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="cumulative-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="cumulative-heading">
            Cumulative over the period
          </h2>
          <span className="panel__note">Events counted per bulletin, so the days are added.</span>
        </div>
        <TableScroll label="Cumulative figures table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" className="numeric">
                  Cumulative
                </th>
                <th scope="col" className="numeric">
                  Worst bulletin
                </th>
                <th scope="col">Workings</th>
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {cumulative.map((figure) => (
                <tr key={figure.key} data-cumulative={figure.key}>
                  <th scope="row">
                    {figure.label} <span className="figure-tag">derived</span>
                  </th>
                  <td className="numeric" data-total={figure.key}>
                    {figureOf(figure.cumulative, figure.precision)}
                  </td>
                  <td className="numeric">
                    {figureOf(figure.peak, figure.precision)}
                    <span className="text-small text-muted"> on {onDate(figure.peakDate)}</span>
                  </td>
                  <td className="text-small figure">{figure.cumulativeWorkings}</td>
                  <td className="text-small">
                    <CompletenessMark figure={figure} />
                    <span className="visually-hidden">{figure.caveat}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="text-small text-muted">
          {cumulative[0]?.caveat}
        </p>
      </section>

      <section className="panel" aria-labelledby="peaks-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="peaks-heading">
            Peak and latest
          </h2>
          <span className="panel__note">
            Point-in-time levels. These are never totalled across bulletins.
          </span>
        </div>
        <TableScroll label="Peak and latest figures table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" className="numeric">
                  Peak
                </th>
                <th scope="col">Peaked on</th>
                <th scope="col" className="numeric">
                  Latest
                </th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {peaks.map((figure) => (
                <tr key={figure.key} data-peak={figure.key}>
                  <th scope="row">
                    {figure.label} <span className="figure-tag">derived</span>
                  </th>
                  <td className="numeric" data-peak-value={figure.key}>
                    {figureOf(figure.peak, figure.precision)}
                  </td>
                  <td className="figure" data-peak-date={figure.key}>
                    {onDate(figure.peakDate)}
                  </td>
                  <td className="numeric">
                    {figureOf(figure.latest, figure.precision)}
                    <span className="text-small text-muted"> on {onDate(figure.latestDate)}</span>
                  </td>
                  <td className="text-small text-muted" title={figure.rationale}>
                    Not applicable — point-in-time figure
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="text-small text-muted">{peaks[0]?.caveat}</p>
      </section>

      <section className="panel" aria-labelledby="exposure-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="exposure-heading">
            Exposure in person-days
          </h2>
          <span className="panel__note">
            Point-in-time levels added up across the days — one person for one day.
          </span>
        </div>
        <p className="text-small text-muted">
          These are the only figures here that <em>are</em> a running total of a
          point-in-time level, and they are legitimate because the unit changes:
          adding daily camp occupancy does not give people, it gives person-days.
          Relief is costed per person per day, so this is the shape a budget is
          built from — and it is the one thing a single bulletin cannot produce
          at all.
        </p>
        <TableScroll label="Exposure in person-days table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" className="numeric">
                  Person-days
                </th>
                <th scope="col" className="numeric">
                  Days counted
                </th>
                <th scope="col">Working</th>
              </tr>
            </thead>
            <tbody>
              {exposure.map((figure) => (
                <tr key={figure.key} data-exposure={figure.key}>
                  <th scope="row">
                    {figure.label} <span className="figure-tag">derived</span>
                  </th>
                  {/*
                    The unit is printed next to every value, never in the column
                    heading alone. A figure copied out of this table has to carry
                    it, because "302,253" read as people is the exact mistake the
                    person-day type exists to prevent.
                  */}
                  <td className="numeric" data-person-days={figure.key}>
                    {figureOf(figure.personDays, 0)}
                    <span className="text-small text-muted"> {figure.unit}</span>
                  </td>
                  <td className="numeric">{figure.daysCounted}</td>
                  <td className="text-small figure">{figure.workings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="text-small text-muted">{exposure[0]?.caveat}</p>
      </section>

      <section className="panel" aria-labelledby="back-test-heading">
        <div className="panel__head">
          <h2 className="panel__title" id="back-test-heading">
            Does this check out?
          </h2>
          <span className="panel__note">
            Rice actually distributed, divided by the exposure above.
          </span>
        </div>
        <p className="text-small text-muted">
          Person-days are derived, so nothing in the bulletin contradicts them —
          which is a reason to be sceptical of them. This is the one check
          available: ASDMA reports relief <em>actually handed out</em>, in
          quintals, so dividing it by the exposure gives the ration rate really
          delivered. If a rate here is implausible, the exposure it was divided
          by is the thing to doubt.
        </p>
        <TableScroll label="Implied ration rate table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">If the relief reached…</th>
                <th scope="col" className="numeric">
                  Implied ration
                </th>
                <th scope="col">Working</th>
              </tr>
            </thead>
            <tbody>
              {backTest.map((row) => (
                <tr key={row.basis} data-back-test={row.basis}>
                  <th scope="row">{row.basis}</th>
                  <td className="numeric" data-implied-ration={row.basis}>
                    {row.kgPerPersonPerDay === undefined
                      ? '—'
                      : `${row.kgPerPersonPerDay.toFixed(3)} kg`}
                    <span className="text-small text-muted"> per person per day</span>
                  </td>
                  <td className="text-small figure">{row.workings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        {/*
          No "expected" column, and no shortfall. What was handed out and what
          people were owed are different facts; putting them side by side would
          turn a sanity check into a compliance finding it has no standing to
          make.
        */}
        <p className="text-small text-muted">{backTest[0]?.caveat}</p>
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
          <strong>Kuccha dwellings are not costed here.</strong> {replacement.notCosted}
        </p>
        <p className="text-small text-muted">{replacement.caveat}</p>
      </section>
    </div>
  );
};
