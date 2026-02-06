import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import './Layout.css';

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/property', label: 'Property Registration', icon: '🏠' },
    { to: '/auditing', label: 'Cost Auditing', icon: '📋' },
  ];

  const currentTitle = navItems.find(
    (item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  )?.label ?? 'Assam AI Governance';

  return (
    <div className="layout">
      <header className="header" role="banner">
        <div className="header__inner">
          <div className="header__brand">
            <button
              className="header__menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              aria-label="Toggle navigation menu"
            >
              <span className="header__menu-icon" aria-hidden="true">
                {menuOpen ? '✕' : '☰'}
              </span>
            </button>
            <div className="header__title-group">
              <h1 className="header__title">Assam AI Governance</h1>
              <span className="header__subtitle">{currentTitle}</span>
            </div>
          </div>
          <div className="header__meta">
            <span className="header__status" aria-label="System status: Online">
              <span className="header__status-dot" aria-hidden="true" /> Online
            </span>
            <span className="header__lang">EN</span>
          </div>
        </div>
      </header>

      <nav
        id="main-nav"
        className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <ul className="sidebar__list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="sidebar__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar__footer">
          <p>Government of Assam</p>
          <p className="sidebar__version">PWA Demo v1.0</p>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main" role="main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
