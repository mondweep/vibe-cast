/**
 * Console shell: brand, report identity, left rail, content well.
 *
 * The rail is labelled with the decision question each view answers (PRD
 * §2.1), because an officer under time pressure navigates by question, not by
 * feature name. The report date and generation time stay pinned in the header
 * so no screenshot of this console is ever undated.
 */

import type { ReactNode } from 'react';
import { CONSOLE_VIEWS, type ConsoleView, type ConsoleViewKey } from './view-models';

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

  return (
    <div className="console">
      <div className="console__brand">
        <span className="console__brand-title">Flood Situation Console</span>
        <span className="console__brand-sub">ASDMA · DRIMS Assam</span>
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

      <nav className="console__rail" aria-label="Console views">
        <ul className="console__rail-list">
          {views.map((view) => (
            <li className="console__rail-item" key={view.key}>
              <button
                type="button"
                className="console__rail-link"
                aria-current={view.key === activeView ? 'page' : undefined}
                onClick={() => onSelectView(view.key)}
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
    </div>
  );
};
