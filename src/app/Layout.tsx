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
    </div>
  );
}
