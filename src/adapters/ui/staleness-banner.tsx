/**
 * How old is what you are looking at?
 *
 * The console opens on a bundled 27 July 2026 bulletin so an officer can see it
 * working before they have loaded anything. That convenience carries a real
 * hazard: months later the same screen appears, with the same layout and the
 * same confident figures, and nothing about it looks any less authoritative
 * than it did on the day. This banner is what makes the difference visible.
 *
 * Three rules govern it:
 *
 * 1. **Plain words, above the fold.** The age is a sentence — "This bulletin is
 *    34 days old" — at the top of the content well, not a date in a header that
 *    a reader under time pressure is trusted to check and subtract.
 * 2. **Never colour alone (NFR-8).** Every level carries its name in words and
 *    a distinct shape. Read it in greyscale on a washed-out projector and the
 *    level is still unambiguous; the colour only reinforces what the text says.
 * 3. **The sample is not a bulletin the officer loaded.** A stale bulletin they
 *    chose means their source is out of date. The bundled sample means they are
 *    looking at a demonstration. Those call for different actions, so they get
 *    different copy.
 *
 * Nothing here computes an age. The assessment arrives as a view model from
 * `domain/timeline/staleness`, which is pure and takes its clock from the
 * `Clock` port (ADR-0001).
 */

import { BulletinReload } from './bulletin-reload';
import {
  BULLETIN_AGE_LABELS,
  BULLETIN_AGE_MARKS,
  formatReportDateLong,
  type BulletinAgeViewModel,
} from './view-models';

export type StalenessBannerProps = {
  readonly age: BulletinAgeViewModel;
  /**
   * When supplied, the banner offers a way to load a newer bulletin — but only
   * when it is reporting a problem that loading one would fix. See
   * `needsNewerBulletin` below.
   */
  readonly onLoadBulletin?: (file: File) => void;
};

/**
 * "is today’s bulletin" / "is 1 day old" / "is 34 days old".
 *
 * `undefined` when the age is not knowable — the caller must then say that in
 * words rather than print a zero, because "0 days old" reads as reassurance and
 * not knowing is not reassuring (ADR-0005).
 */
const describeAge = (ageDays: number | undefined): string | undefined => {
  if (ageDays === undefined) return undefined;
  if (ageDays === 0) return 'is today’s bulletin';
  if (ageDays === 1) return 'is 1 day old';
  return `is ${String(ageDays)} days old`;
};

const RELOAD_PROMPT = 'Load the latest Daily Flood Report for current figures.';

export const StalenessBanner = ({ age, onLoadBulletin }: StalenessBannerProps) => {
  const { level, ageDays, origin, safeForCurrentDecisions } = age;
  const dateInWords = formatReportDateLong(age.reportDate);
  const ageWords = describeAge(ageDays);
  const isSample = origin === 'bundled-sample';

  /**
   * Every line of copy below already tells the officer to load a newer
   * bulletin in these four cases. Offering the control anywhere else would be
   * a console nagging about a problem it has not got — and a second insistent
   * element next to the staleness warning is precisely what this design is
   * trying to avoid.
   */
  const needsNewerBulletin =
    isSample || level === 'stale' || level === 'obsolete' || level === 'unknown';

  return (
    <section
      className={`staleness staleness--${level}`}
      data-testid="staleness-banner"
      data-level={level}
      data-origin={origin}
      // An alert interrupts; a status does not. The line between them is the
      // same line the domain draws at `isTooOldForDecisions`, so a screen
      // reader is told to stop at exactly the point the text says to stop.
      role={safeForCurrentDecisions ? 'status' : 'alert'}
      aria-label="Bulletin age"
    >
      <p className="staleness__level" data-testid="staleness-level">
        <span className="staleness__mark" data-testid="staleness-mark" aria-hidden="true">
          {BULLETIN_AGE_MARKS[level]}
        </span>
        {BULLETIN_AGE_LABELS[level]}
        {isSample ? ' · Bundled example' : null}
      </p>

      <div className="staleness__body">
        {isSample ? (
          <p className="staleness__headline">
            {dateInWords === undefined ? (
              <>Showing a bundled ASDMA bulletin so you can see the console working.</>
            ) : (
              <>
                Showing the Assam Flood Report as on{' '}
                <span className="figure">{dateInWords}</span> so you can see the console
                working.
              </>
            )}{' '}
            Load today’s bulletin for live figures.
          </p>
        ) : (
          <p className="staleness__headline">
            You loaded this bulletin
            {dateInWords === undefined ? null : (
              <>
                {' '}
                — Assam Flood Report as on <span className="figure">{dateInWords}</span>
              </>
            )}
            .
          </p>
        )}

        {ageWords === undefined ? (
          <p className="staleness__age">
            The age of this bulletin could not be established
            {age.reportDate === undefined ? ', because it carries no readable date' : null}.
          </p>
        ) : (
          <p className="staleness__age">This bulletin {ageWords}.</p>
        )}

        {age.datedInFuture ? (
          <p className="staleness__note">
            It is dated ahead of this computer’s clock. Check the date on this machine before
            relying on any comparison with an earlier bulletin.
          </p>
        ) : null}

        {safeForCurrentDecisions ? (
          level === 'current' ? null : (
            <p className="staleness__note">
              Camp Inmate counts, Rice Distributed and river levels will have moved since it was
              issued. {RELOAD_PROMPT}
            </p>
          )
        ) : (
          <p className="staleness__warning">
            <strong>Do not use these figures for current decisions.</strong> They describe a
            situation that has since been superseded. {RELOAD_PROMPT}
          </p>
        )}

        {/* The remedy, beside the statement of the problem. */}
        {onLoadBulletin && needsNewerBulletin ? (
          <BulletinReload onLoad={onLoadBulletin} />
        ) : null}
      </div>
    </section>
  );
};
