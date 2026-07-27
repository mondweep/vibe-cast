/**
 * Console shell: brand, report identity, left rail, content well.
 *
 * The rail is labelled with the decision question each view answers (PRD
 * §2.1), because an officer under time pressure navigates by question, not by
 * feature name. The report date and generation time stay pinned in the header
 * so no screenshot of this console is ever undated.
 *
 * ---------------------------------------------------------------------------
 * The rail on a narrow viewport
 * ---------------------------------------------------------------------------
 *
 * Above 900px the rail is persistent and nothing below runs: the toggle and the
 * scrim are `display: none`, so they cannot be clicked, `railOpen` never leaves
 * `false`, and the projector (NFR-11) sees exactly the layout it always has.
 *
 * Below 900px — a breakpoint measured from the stylesheets rather than picked,
 * see the note at the top of `layout.test.ts` — the rail costs 184px that the
 * content well cannot spare, so it becomes an off-canvas drawer. The markup is
 * identical at both widths; only the stylesheet differs. That is deliberate:
 * one tree, one set of behaviours, nothing conditional on a viewport query that
 * jsdom cannot evaluate and a test cannot pin down.
 *
 * Focus is handled, not trapped. Opening moves focus to the first view so a
 * keyboard user lands where they asked to go; Escape and choosing a view both
 * hand it back to the toggle they came from. Tab is left alone — a drawer a
 * keyboard user cannot walk out of is worse than one that never opened.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CONSOLE_VIEWS, type ConsoleView, type ConsoleViewKey } from './view-models';

/** Referenced by the toggle's `aria-controls`, so the pair is a real pair. */
const RAIL_ID = 'console-rail';

export type AppShellProps = {
  readonly activeView: ConsoleViewKey;
  readonly onSelectView: (view: ConsoleViewKey) => void;
  readonly views?: readonly ConsoleView[];
  readonly reportDate?: string;
  readonly generatedAt?: string;
  readonly headerSlot?: ReactNode;
  /**
   * Rendered at the top of the content well, before everything it qualifies.
   * The bulletin-age banner lives here: a warning printed below the figures it
   * warns about is a footnote, and footnotes are not read under time pressure.
   */
  readonly bannerSlot?: ReactNode;
  readonly children: ReactNode;
};

export const AppShell = ({
  activeView,
  onSelectView,
  views = CONSOLE_VIEWS,
  reportDate,
  generatedAt,
  headerSlot,
  bannerSlot,
  children,
}: AppShellProps) => {
  const active = views.find((view) => view.key === activeView);

  const [railOpen, setRailOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement>(null);

  /** Close, and put focus back where the officer left it. */
  const closeRail = () => {
    if (!railOpen) return;
    setRailOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!railOpen) return;

    // Move focus into the drawer. Not a trap: nothing here stops Tab from
    // walking straight back out into the header and the content well.
    railRef.current?.querySelector<HTMLButtonElement>('.console__rail-link')?.focus();

    // On `document`, because the drawer may be dismissed while focus sits on
    // the scrim or the toggle rather than inside the rail.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setRailOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [railOpen]);

  const selectView = (view: ConsoleViewKey) => {
    onSelectView(view);
    // An officer who has just chosen a view wants to see it, not the drawer
    // that was covering it. No-op above the breakpoint, where it was never open.
    closeRail();
  };

  return (
    <div className="console" data-rail-open={railOpen ? 'true' : 'false'}>
      <div className="console__brand">
        <span className="console__brand-name">
          <span className="console__brand-title">Flood Situation Console</span>
          <span className="console__brand-sub">ASDMA · DRIMS Assam</span>
        </span>

        <button
          type="button"
          ref={toggleRef}
          className="console__rail-toggle"
          aria-expanded={railOpen}
          aria-controls={RAIL_ID}
          onClick={() => {
            if (railOpen) closeRail();
            else setRailOpen(true);
          }}
        >
          {/* The state is carried by aria-expanded and by the drawer itself;
              the mark is reinforcement, and the name never changes under the
              user's finger. */}
          <span className="console__rail-toggle-mark" aria-hidden="true">
            ☰
          </span>
          Console views
        </button>
      </div>

      <header className="console__header">
        <div className="console__header-identity">
          <h1>
            {reportDate ? (
              <>
                Assam Flood Report as on <span className="figure">{reportDate}</span>
              </>
            ) : (
              'No bulletin loaded'
            )}
          </h1>
          {generatedAt ? (
            <span className="text-small text-muted">Report Generated On: {generatedAt}</span>
          ) : null}
        </div>
        <div className="console__header-identity">
          {active ? <p className="console__header-question">{active.question}</p> : null}
          {headerSlot}
        </div>
      </header>

      <nav className="console__rail" id={RAIL_ID} ref={railRef} aria-label="Console views">
        <ul className="console__rail-list">
          {views.map((view) => (
            <li className="console__rail-item" key={view.key}>
              <button
                type="button"
                className="console__rail-link"
                aria-current={view.key === activeView ? 'page' : undefined}
                onClick={() => selectView(view.key)}
              >
                {view.label}
                <span className="console__rail-question">{view.question}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="console__rail-foot">
          ASDMA's bulletin remains the system of record. Figures marked{' '}
          <strong>Derived</strong> were computed here.
        </p>
        <p className="console__rail-foot">
          Questions or comments:{' '}
          <a
            className="console__rail-contact"
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noreferrer"
          >
            Mondweep Chakravorty
          </a>
        </p>
      </nav>

      <main className="console__main" id="console-main" tabIndex={-1}>
        {bannerSlot}
        {children}
      </main>

      {/* A real button rather than a div-with-onClick, so dismissing the drawer
          by tapping the page behind it is available to a keyboard user too.
          Last in the DOM: it must not sit between the toggle and the views. */}
      {railOpen ? (
        <button type="button" className="console__scrim" onClick={closeRail}>
          <span className="visually-hidden">Close console views</span>
        </button>
      ) : null}
    </div>
  );
};
