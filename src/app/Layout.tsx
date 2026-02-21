import { NavLink, Outlet } from 'react-router-dom';
import { StreakBadge } from '../contexts/gamification/index.ts';
import { useGamification } from '../contexts/gamification/index.ts';

export function Layout() {
  const { streak } = useGamification();

  return (
    <div className="layout">
      <header className="header">
        <h1 className="header__title">RSD Guitar Internalizer</h1>
        <StreakBadge streak={streak} />
      </header>

      <nav className="nav" aria-label="Main navigation">
        <NavLink to="/" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} end>
          Practice
        </NavLink>
        <NavLink to="/fretboard" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
          Fretboard
        </NavLink>
        <NavLink to="/rhythm" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
          Rhythm
        </NavLink>
        <NavLink to="/flashcards" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
          Flashcards
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
          Stats
        </NavLink>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          Built by <strong>Mondweep Chakravorty</strong>
          {' · '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__link"
          >
            Questions? Connect on LinkedIn
          </a>
          {' · '}
          <a
            href="https://github.com/mondweep/vibe-cast"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__link"
          >
            GitHub ↗
          </a>
        </p>
      </footer>
    </div>
  );
}
