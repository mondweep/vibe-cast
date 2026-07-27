/**
 * Load a newer bulletin, from wherever the old one is being complained about.
 *
 * The console now opens on a bundled bulletin, which means the large loader
 * panel — the obvious "drop a PDF here" target — never renders. All that was
 * left was the compact control in the header, and an officer using the console
 * asked, in as many words, where they were meant to upload a new bulletin from.
 *
 * The answer is not a second banner shouting alongside the staleness warning.
 * It is to put the fix next to the statement of the problem: the banner already
 * says "This bulletin is 34 days old", and the remedy for a 34-day-old bulletin
 * is to load today's. So this is a modest row inside that banner, shown only
 * when the banner is reporting something worth acting on.
 *
 * It is also the reason this control lives in the content well rather than the
 * rail: below the drawer breakpoint the rail is off-canvas behind a toggle, and
 * an upload path nobody can find is the mistake we are correcting, not
 * repeating.
 */

import { useRef } from 'react';

/**
 * Where the bulletin comes from.
 *
 * `https://sdrf.assam.gov.in/dfr/download?type=flood` downloads the Daily Flood
 * Report directly — a real download endpoint, not a landing page. Two things
 * about it shape what we can do with it:
 *
 * 1. **It is geo-restricted to India.** From outside India the connection is
 *    refused. That is why every rendering of this link says so: without it, a
 *    reader abroad clicks, gets a timeout, and concludes this console is
 *    broken rather than that the site is geofenced.
 * 2. **It has no date parameter**, so treat it as serving only the LATEST
 *    bulletin. Nothing here may assume an archive is reachable by URL.
 *
 * This is a link for a human to click and nothing more. **The app must never
 * fetch it.** NFR-5 forbids network egress outright, the CSP blocks it, CORS
 * would block it anyway, and the geo-restriction makes it impossible from most
 * hosting regardless. There is no fetch, no proxy and no retry here by design,
 * and `src/architecture.test.ts` keeps it that way.
 */
export const SDRF_DOWNLOAD_URL = 'https://sdrf.assam.gov.in/dfr/download?type=flood';

export type BulletinReloadProps = {
  /** Handed the chosen `File`. Parsing lives behind the `BulletinSource` port. */
  readonly onLoad: (file: File) => void;
};

export const BulletinReload = ({ onLoad }: BulletinReloadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bulletin-reload" data-testid="bulletin-reload">
      <button
        type="button"
        className="bulletin-reload__button"
        onClick={() => inputRef.current?.click()}
      >
        Load today’s Daily Flood Report
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        aria-label="Newer bulletin PDF"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onLoad(file);
        }}
      />

      <span className="bulletin-reload__source">
        <a
          className="loader__source-link"
          href={SDRF_DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
        >
          Get today’s bulletin from SDRF Assam
        </a>{' '}
        <span className="text-small text-muted">
          Direct download, reachable only from India — from elsewhere you will need an India
          VPN, or a colleague to send you the PDF. The file is read in this browser and never
          uploaded.
        </span>
      </span>
    </div>
  );
};
